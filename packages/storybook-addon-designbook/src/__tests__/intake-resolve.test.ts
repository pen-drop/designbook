/**
 * Intake context resolution.
 *
 * The engine must resolve the existing `<wf>:intake` / `design.intake` metadata —
 * ignored by the old catalogue path — into a shared, deduplicated context registry
 * whose entries are referenced per step, plus a frozen task-palette contract.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dirname, join, resolve } from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolveIntakeContext, templateGlob } from '../workflow/intake-resolve.js';
import type { DesignbookConfig } from '../shared/config.js';

const agents = resolve(process.cwd(), '../../.agents');

/** A project that turns on every integration, so no step is filtered out unseen. */
const config = {
  data: '/tmp/intake-resolve',
  technology: 'html',
  backend: 'drupal',
  'frameworks.component': 'sdc',
  'frameworks.css': 'tailwind',
  extensions: [],
} as unknown as DesignbookConfig;

describe('resolveIntakeContext', () => {
  it('resolves rules tagged <wf>:intake into the shared registry, referenced per step', async () => {
    const ctx = await resolveIntakeContext('design-shell', { agentsDir: agents, config });
    const entry = Object.values(ctx.context).find((c) => c.source.endsWith('rules/entity-reference-rendering.md'));
    expect(entry).toBeDefined();
    expect(entry!.content.length).toBeGreaterThan(0); // canonical content embedded
    // at least one step references the entry by key (not by copy)
    expect(ctx.steps.some((s) => s.context.includes(entry!.key))).toBe(true);
    // a rule that applies to multiple steps has exactly ONE registry entry
    const dupes = Object.values(ctx.context).filter((c) => c.source === entry!.source);
    expect(dupes.length).toBe(1);
  });

  it('does NOT resolve a rule whose intake token names a different workflow', async () => {
    const ctx = await resolveIntakeContext('tokens', { agentsDir: agents, config });
    // entity-reference-rendering only names design-*:intake, not tokens:intake
    const sources = Object.values(ctx.context).map((c) => c.source);
    expect(sources.some((s) => s.endsWith('entity-reference-rendering.md'))).toBe(false);
  });

  it('emits the plans_dir under DESIGNBOOK_DATA/plans', async () => {
    const ctx = await resolveIntakeContext('design-shell', { agentsDir: agents, config });
    expect(ctx.plans_dir).toBe(`${config.data}/plans`);
  });

  it('marks source open and gates source-specific rules for extract-reference', async () => {
    const ctx = await resolveIntakeContext('extract-reference', { agentsDir: agents, config });
    expect(ctx.open_selectors.map((s) => s.name)).toContain('source');
    // website-capture-observations is NOT in the flat shared registry...
    const flatSources = Object.values(ctx.context).map((c) => c.source);
    expect(flatSources.some((s) => s.endsWith('website-capture-observations.md'))).toBe(false);
    // ...it is gated under source=website
    const website = ctx.gated.find((g) => g.selector === 'source' && g.variant === 'website')!;
    expect(website).toBeDefined();
    expect(website.context.some((c) => c.source.endsWith('website-capture-observations.md'))).toBe(true);
    const storybook = ctx.gated.find((g) => g.selector === 'source' && g.variant === 'storybook')!;
    expect(storybook).toBeDefined();
    expect(storybook.context.some((c) => c.source.endsWith('storybook-capture-observations.md'))).toBe(true);
    // the gated steps must not leak into the flat step set as a misleadingly complete rule set
    expect(ctx.steps.some((s) => s.name === 'observe-website')).toBe(false);
  });

  it('freezes the task-palette output contracts with their definitions', async () => {
    const ctx = await resolveIntakeContext('design-shell', { agentsDir: agents, config });
    const validate = ctx.steps.find((s) => s.name === 'validate');
    expect(validate).toBeDefined();
    const task = validate!.tasks[0];
    expect(task).toBeDefined();
    expect(Object.keys(task!.outputs).length).toBeGreaterThan(0); // frozen output contract
    expect(Object.keys(ctx.definitions).length).toBeGreaterThan(0); // definitions pulled from schemas.yml
  });

  it('exposes required Component props and object-keyed slots on Vue and SDC palettes', async () => {
    const sdc = await resolveIntakeContext('design-component', { agentsDir: agents, config });
    const vue = await resolveIntakeContext('design-component', {
      agentsDir: agents,
      config: { ...config, 'frameworks.component': 'vue', backend: 'none' } as unknown as DesignbookConfig,
    });
    for (const ctx of [sdc, vue]) {
      const component = ctx.definitions.Component as {
        required?: string[];
        properties?: { slots?: { type?: string }; props?: unknown };
      };
      expect(component.required).toEqual(expect.arrayContaining(['component', 'group', 'props', 'slots']));
      expect(component.properties?.slots?.type).toBe('object');
      expect(component.properties?.props).toBeDefined();

      const write = ctx.steps.flatMap((s) => s.tasks).find((t) => t.name === 'write-component');
      expect(write).toBeDefined();
      const map = ctx.steps.flatMap((s) => s.tasks).find((t) => t.name === 'map-entity--design-screen');
      expect(map?.params_schema.required).toEqual(expect.arrayContaining(['mapping', 'data_model']));
      expect(map?.params_schema.properties).toEqual(
        expect.objectContaining({ component: expect.anything(), bindings: expect.anything() }),
      );
      const scene = ctx.steps.flatMap((s) => s.tasks).find((t) => t.name === 'write-scene');
      expect(scene?.params_schema.required).toEqual(expect.arrayContaining(['items']));
      const sample = ctx.steps.flatMap((s) => s.tasks).find((t) => t.name === 'create-sample-data');
      expect(sample?.params_schema.required).toEqual(expect.arrayContaining(['records']));
    }
  });

  it('freezes CompositionInputs for writing-design workflows', async () => {
    const ctx = await resolveIntakeContext('design-entity', { agentsDir: agents, config });
    const composition = ctx.definitions.CompositionInputs as { required?: string[] };
    expect(composition.required).toEqual(
      expect.arrayContaining(['components', 'mappings', 'samples', 'scenes', 'data_model']),
    );
    const vision = await resolveIntakeContext('vision', { agentsDir: agents, config });
    expect(vision.definitions.CompositionInputs).toBeUndefined();
  });
});

describe('output path globs (trigger.paths in the plan)', () => {
  const home = '/work/theme';
  const pathConfig = {
    data: `${home}/designbook`,
    'designbook.home': home,
    'designbook.data': `${home}/designbook`,
    extensions: [],
  } as unknown as DesignbookConfig;
  let dir: string;

  beforeAll(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'intake-paths-')));
    const write = (rel: string, body: string) => {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), body);
    };
    write('skills/w/workflows/demo.md', '---\nstages:\n  s:\n    steps: [write-a, write-b]\n---\n');
    write(
      'skills/w/tasks/write-a.md',
      '---\ntrigger:\n  steps: [write-a]\nresult:\n  type: object\n  properties:\n    a:\n      path: ${DESIGNBOOK_HOME}/components/{{ c }}/{{ c }}.vue\n      type: string\n---\n',
    );
    write(
      'skills/w/tasks/write-b.md',
      '---\ntrigger:\n  steps: [write-b]\nresult:\n  type: object\n  properties:\n    b:\n      path: $DESIGNBOOK_DATA/{{ p }}\n      glob: $DESIGNBOOK_DATA/**/*.scenes.yml\n      type: string\n---\n',
    );
    write('skills/w/rules/vue.md', "---\ntrigger:\n  paths: ['$DESIGNBOOK_HOME/components/**/*.vue']\n---\n# vue\n");
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('templateGlob turns placeholders into one segment', () => {
    expect(templateGlob(`${home}/components/{{ c }}/{{ c }}.vue`)).toBe(`${home}/components/*/*.vue`);
    expect(
      templateGlob(
        `${home}/designbook/{{ m.k = 'form' ? 'form-mapping' : 'entity-mapping' }}/{{\nm.t }}.{{ m.b }}.{{ m.v }}.jsonata`,
      ),
    ).toBe(`${home}/designbook/*/*.*.*.jsonata`);
  });

  it('templateGlob leaves a path that is not rooted plan-only', () => {
    expect(templateGlob('{{ file_path }}')).toBeUndefined();
    expect(templateGlob('$DESIGNBOOK_DIRS_X/a.yml')).toBeUndefined();
    // A bare placeholder file name would claim every file in the directory.
    expect(templateGlob(`${home}/designbook/{{ scene_path }}`)).toBeUndefined();
  });

  it('an output glob replaces the derived pattern and stays out of the schema', async () => {
    const ctx = await resolveIntakeContext('demo', { agentsDir: dir, config: pathConfig, sources: [] });
    const b = ctx.steps.find((s) => s.name === 'write-b')!.tasks[0]!.outputs['b']!;
    expect(b.glob).toBe(`${home}/designbook/**/*.scenes.yml`);
    expect(b.schema).not.toHaveProperty('glob');
  });

  it('a paths rule joins the step whose output matches', async () => {
    const ctx = await resolveIntakeContext('demo', { agentsDir: dir, config: pathConfig, sources: [] });
    const sources = (step: string) =>
      ctx.steps.find((s) => s.name === step)!.context.map((k) => ctx.context[k]!.source.split('/').pop());
    expect(sources('write-a')).toContain('vue.md');
    expect(sources('write-b')).not.toContain('vue.md');
  });
});
