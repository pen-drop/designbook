import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildRenderContext } from '../resolve.js';
import { renderPlan } from '../render.js';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..', '..');
const AGENTS_DIR = resolve(REPO_ROOT, '.agents');
const WORKFLOW = resolve(AGENTS_DIR, 'skills/designbook/design/workflows/design-shell.md');

describe('smoke: design-shell plan', () => {
  let previousCwd: string;
  let cwdTmp: string;

  beforeEach(() => {
    previousCwd = process.cwd();
    // Run from a tmpdir so `loadConfig()` does not resolve `DESIGNBOOK_DATA`
    // to the repo root (which trips `assertNotRepoRoot`). `agentsDir` is
    // passed explicitly to `buildRenderContext`, so cwd only affects config.
    cwdTmp = mkdtempSync(join(tmpdir(), 'smoke-plan-'));
    process.chdir(cwdTmp);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(cwdTmp, { recursive: true, force: true });
  });

  it('produces a plan whose every `**References**:` slug exists in the appendix', async () => {
    const ctx = await buildRenderContext(WORKFLOW, AGENTS_DIR);
    const md = renderPlan(ctx);

    const refSlugs = [...md.matchAll(/\(#(rule|blueprint)-([a-z0-9-]+)\)/g)].map((m) => `${m[1]}:${m[2]}`);
    for (const slug of refSlugs) {
      const [kind, name] = slug.split(':');
      const heading = kind === 'rule' ? `## Rule: ${name}` : `## Blueprint: ${name}`;
      expect(md, `missing appendix entry for ${slug}`).toContain(heading);
    }
  });

  it('classifies every task input into one of file / iteration / produced / workflow', async () => {
    const ctx = await buildRenderContext(WORKFLOW, AGENTS_DIR);
    for (const sources of ctx.inputs.values()) {
      for (const input of sources) {
        expect(['file', 'iteration', 'produced', 'workflow']).toContain(input.kind);
      }
    }
  });

  it('tasks with result: have both schema and example; tasks without have neither', async () => {
    const ctx = await buildRenderContext(WORKFLOW, AGENTS_DIR);
    for (const step of ctx.inputs.keys()) {
      const hasSchema = ctx.outputSchemas.has(step);
      const hasExample = ctx.outputExamples.has(step);
      expect(hasSchema).toBe(hasExample);
    }
  });

  it('every `$ref: #/definitions/Foo` in the rendered markdown has a matching `## Schema: Foo` heading', async () => {
    const ctx = await buildRenderContext(WORKFLOW, AGENTS_DIR);
    const md = renderPlan(ctx);
    const refNames = new Set(
      [...md.matchAll(/\$ref:\s*['"]?#\/definitions\/([A-Z][A-Za-z0-9]*)['"]?/g)].map((m) => m[1]!),
    );
    for (const name of refNames) {
      expect(md, `missing schema appendix entry for ${name}`).toContain(`## Schema: ${name}`);
    }
  });

  it('renders to a single string starting with `# Runbook: Design Shell`', async () => {
    const ctx = await buildRenderContext(WORKFLOW, AGENTS_DIR);
    const md = renderPlan(ctx);
    expect(md.split('\n')[0]).toBe('# Runbook: Design Shell');
  });
});
