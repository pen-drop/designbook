import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { dump as dumpYaml } from 'js-yaml';
import { buildRenderContext } from '../resolve.js';

interface Sandbox {
  root: string;
  agentsDir: string;
  workflowFile: string;
  cleanup: () => void;
}

function setupSandbox(): Sandbox {
  const root = mkdtempSync(join(tmpdir(), 'plan-resolve-'));
  const dataDir = join(root, 'designbook');
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(root, 'designbook.config.yml'), dumpYaml({ designbook: { data: 'designbook' } }));
  const agentsDir = join(root, '.agents');
  mkdirSync(agentsDir, { recursive: true });
  cpSync(resolve(__dirname, 'fixtures/skills'), join(agentsDir, 'skills'), { recursive: true });
  const workflowFile = join(agentsDir, 'skills/example/workflows/example.md');
  return { root, agentsDir, workflowFile, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

describe('buildRenderContext', () => {
  let sandbox: Sandbox;
  let previousCwd: string;

  beforeEach(() => {
    sandbox = setupSandbox();
    previousCwd = process.cwd();
    process.chdir(sandbox.root);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    sandbox.cleanup();
  });

  it('returns workflow id, title and description from frontmatter', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.workflowId).toBe('example');
    expect(ctx.workflowFrontmatter.title).toBe('Example');
    expect(ctx.workflowFrontmatter.description).toMatch(/Three-stage example/);
  });

  it('preserves workflow params with defaults', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.workflowFrontmatter.params).toEqual({
      scene_id: { type: 'string', default: 'example:scene' },
      reference_url: { type: 'string', default: '' },
    });
  });

  it('classifies vision (path:) as file source', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    const intakeInputs = ctx.inputs.get('intake')!;
    expect(intakeInputs.find((i) => i.name === 'vision')).toEqual({
      kind: 'file',
      name: 'vision',
      path: '$DESIGNBOOK_DATA/vision.yml',
    });
  });

  it('classifies extract as produced by stage 1 task `extract`', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    const intakeInputs = ctx.inputs.get('intake')!;
    expect(intakeInputs.find((i) => i.name === 'extract')).toEqual({
      kind: 'produced',
      name: 'extract',
      stage: 'reference',
      task: 'extract',
    });
  });

  it('classifies scene_id as workflow params', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    const intakeInputs = ctx.inputs.get('intake')!;
    expect(intakeInputs.find((i) => i.name === 'scene_id')).toEqual({ kind: 'workflow', name: 'scene_id' });
  });

  it('classifies polish.issue as iteration with expr from each:', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    const polishInputs = ctx.inputs.get('polish')!;
    expect(polishInputs.find((i) => i.name === 'issue')).toEqual({
      kind: 'iteration',
      name: 'issue',
      expr: 'issues',
    });
  });

  it('uses author-written `## Example output` when present', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.outputExamples.get('extract')).toContain('extract:\n  title: Sample Site');
  });

  it('falls back to schema-derived placeholder when no author example exists', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    const intakeExample = ctx.outputExamples.get('intake')!;
    expect(intakeExample).toContain('components:');
    expect(intakeExample).toContain('- name: <string>');
  });

  it('omits output schema and example for tasks without `result:`', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.outputSchemas.has('polish')).toBe(false);
    expect(ctx.outputExamples.has('polish')).toBe(false);
  });

  it('does not add a result-less task to priorOutputs (no name collision propagation)', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect([...ctx.outputSchemas.keys()].sort()).toEqual(['extract', 'intake']);
  });

  it('builds rule reverse-index keyed by slug with stage/task references', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.ruleIndex.format).toEqual([
      { stage: 'reference', task: 'extract' },
      { stage: 'intake', task: 'intake' },
    ]);
  });

  it('builds blueprint reverse-index', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.blueprintIndex.style).toEqual([{ stage: 'intake', task: 'intake' }]);
  });

  it('aggregates schema definitions from $refs across all tasks', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.schemaDefinitions.Component).toMatchObject({
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' }, slots: { type: 'array' } },
    });
  });

  it('builds schema reverse-index from $refs in result schemas', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.schemaIndex.Component).toEqual([{ stage: 'intake', task: 'intake' }]);
  });

  it('inlines task/rule/blueprint markdown bodies (frontmatter stripped)', async () => {
    const ctx = await buildRenderContext(sandbox.workflowFile, sandbox.agentsDir);
    expect(ctx.taskBodies.get([...ctx.taskBodies.keys()].find((p) => p.endsWith('extract.md'))!)).toContain(
      '# Extract',
    );
    expect([...ctx.taskBodies.values()][0]!).not.toContain('---\ntrigger:');
    const formatRulePath = [...ctx.ruleBodies.keys()].find((p) => p.endsWith('format.md'))!;
    expect(ctx.ruleBodies.get(formatRulePath)).toContain('Output must be deterministic.');
  });

  it('throws on a workflow file pointing at a non-existent step', async () => {
    writeFileSync(
      sandbox.workflowFile,
      `---
title: Broken
description: ""
stages:
  reference:
    steps: [does-not-exist]
engine: direct
---
`,
    );
    await expect(buildRenderContext(sandbox.workflowFile, sandbox.agentsDir)).rejects.toThrow(
      /no matching task file|step.*does-not-exist/i,
    );
  });
});
