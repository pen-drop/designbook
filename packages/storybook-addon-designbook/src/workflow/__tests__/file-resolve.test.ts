/**
 * File lookup: a file path resolves to the task output that declares it and to the
 * exact context the plan freezes for that step — no plan, no second matcher.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { copyFileSync, mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from '../../shared/config.js';
import { listWorkflowDefinitions } from '../../cli/workflow-discovery.js';
import { resolveIntakeContext, type IntakeContext } from '../intake-resolve.js';
import { FileResolveError, matchFileContext, resolveFileContext, stepContextSources } from '../file-resolve.js';

const agentsDir = resolve(process.cwd(), '../../.agents');
const fixture = resolve(process.cwd(), '../../fixtures/drupal-petshop/designbook.config.yml');
let workspace: string;

beforeAll(() => {
  workspace = realpathSync(mkdtempSync(join(tmpdir(), 'file-resolve-')));
  copyFileSync(fixture, join(workspace, 'designbook.config.yml'));
});
afterAll(() => rmSync(workspace, { recursive: true, force: true }));

const opts = () => ({ configDir: workspace, agentsDir, sources: [] });

describe('resolveFileContext', () => {
  it('resolves a component.yml to write-component', async () => {
    const file = join(workspace, 'components/card/card.component.yml');
    const ctx = await resolveFileContext(file, opts());
    expect(ctx.task).toBe('write-component');
    expect(ctx.output).toBe('component-yml');
    expect(ctx.contract.schema).toHaveProperty('$ref');
    const ref = String((ctx.contract.schema as { $ref: string }).$ref).replace('#/definitions/', '');
    expect(ctx.definitions[ref]).toBeDefined();
  });

  it('accepts a path relative to the working directory', async () => {
    const file = relative(process.cwd(), join(workspace, 'components/card/card.component.yml'));
    const ctx = await resolveFileContext(file, opts());
    expect(ctx.file).toBe(join(workspace, 'components/card/card.component.yml'));
  });

  it('tells a default story from a variant story', async () => {
    const wf = { ...opts(), workflow: 'design-component' };
    const def = await resolveFileContext(join(workspace, 'components/card/card.default.story.yml'), wf);
    expect(`${def.task}:${def.output}`).toBe('write-component:component-story');
    const variant = await resolveFileContext(join(workspace, 'components/card/card.dark.story.yml'), wf);
    expect(`${variant.task}:${variant.output}`).toBe('create-variant-story:variant-story');
  });

  it('fails when no task output declares the file', async () => {
    await expect(resolveFileContext(join(workspace, 'README.md'), opts())).rejects.toThrow(/no task output declares/);
    await expect(resolveFileContext('/elsewhere/components/a/a.component.yml', opts())).rejects.toThrow(
      /no task output declares/,
    );
  });
});

describe('matchFileContext', () => {
  const home = '/work/theme';
  let dir: string;
  let ctx: IntakeContext;

  beforeAll(async () => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'file-resolve-amb-')));
    const write = (rel: string, body: string) => {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), body);
    };
    const task = (name: string) =>
      `---\ntrigger:\n  steps: [${name}]\nresult:\n  type: object\n  properties:\n    out:\n      path: \${DESIGNBOOK_HOME}/x/{{ n }}.yml\n      type: object\n---\n`;
    write('skills/w/workflows/demo.md', '---\nstages:\n  s:\n    steps: [one, two]\n---\n');
    write('skills/w/tasks/one.md', task('one'));
    write('skills/w/tasks/two.md', task('two'));
    const config = { data: `${home}/designbook`, 'designbook.home': home, extensions: [] };
    ctx = await resolveIntakeContext('demo', { agentsDir: dir, config: config as never, sources: [] });
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('fails on an ambiguous match and lists the candidates', () => {
    let error: unknown;
    try {
      matchFileContext(`${home}/x/a.yml`, [ctx]);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(FileResolveError);
    expect((error as FileResolveError).candidates).toEqual(['demo/one/one:out', 'demo/two/two:out']);
    expect((error as Error).message).toContain('demo/one/one:out');
  });
});

describe('file lookup equals plan step context (AC-6)', () => {
  /** A concrete path a glob matches: `**` → two segments, `*` → one. */
  const sample = (glob: string) => glob.replace(/\*\*/g, 'x/y').replace(/\*/g, 'x');

  it('returns, for every task output, the context the plan resolves for its step', async () => {
    const config = loadConfig(workspace);
    let checked = 0;
    for (const workflow of listWorkflowDefinitions(agentsDir)) {
      const intake = await resolveIntakeContext(workflow, { ...opts(), config });
      const tasks = [...intake.steps.flatMap((s) => s.tasks), ...intake.gated.flatMap((g) => g.tasks)];
      for (const task of tasks) {
        for (const [key, contract] of Object.entries(task.outputs)) {
          if (!contract.glob) continue;
          const file = sample(contract.glob);
          const id = `${workflow}/${task.step}/${task.name}:${key}`;
          try {
            const found = matchFileContext(file, [intake]);
            expect(found.context.map((c) => c.source).sort(), id).toEqual(stepContextSources(intake, task.step));
            expect(`${found.task}:${found.output}`, id).toBe(`${task.name}:${key}`);
          } catch (e) {
            if (!(e instanceof FileResolveError)) throw e;
            // Ambiguous samples must name this output among the candidates, never vanish.
            expect(e.candidates, file).toContain(id);
          }
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(10);
  }, 120_000);
});
