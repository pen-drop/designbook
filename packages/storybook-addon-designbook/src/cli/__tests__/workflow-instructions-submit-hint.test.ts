/**
 * Integration test: workflow create -> buildInstructions returns a submit_results
 * hint that was produced against the real SchemaBlock shape emitted by
 * buildSchemaBlock (flat result map, with resolved #/definitions/<TypeName> refs).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { dump as stringifyYaml } from 'js-yaml';
import { resolveAllStages, buildEnvMap, expandResultDeclarations, parseFrontmatter } from '../../workflow-resolve.js';
import type { ResolvedStep } from '../../workflow-resolve.js';
import { workflowCreate } from '../../workflow.js';
import type { DesignbookConfig } from '../../config.js';
import { buildInstructions } from '../workflow.js';

function makeTmpDir(): string {
  const dir = resolve(tmpdir(), `wf-instr-hint-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeMd(filePath: string, fm: Record<string, unknown>, body = ''): void {
  mkdirSync(resolve(filePath, '..'), { recursive: true });
  const content = `---\n${stringifyYaml(fm).trim()}\n---\n${body}`;
  writeFileSync(filePath, content);
}

let tmpDir: string;
let agentsDir: string;

const baseConfig: DesignbookConfig = {
  data: '',
  technology: 'html',
  workspace: '',
  'designbook.home': '',
  'designbook.data': '',
};

beforeEach(() => {
  tmpDir = makeTmpDir();
  agentsDir = resolve(tmpDir, '.agents');
  const dist = resolve(tmpDir, 'dist');
  mkdirSync(dist, { recursive: true });

  baseConfig.data = dist;
  baseConfig.workspace = tmpDir;
  baseConfig['designbook.home'] = tmpDir;
  baseConfig['designbook.data'] = dist;
});

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
});

describe('workflow instructions: submit_results hint', () => {
  it('emits a submit_results markdown block referencing the local-ref type name', async () => {
    // ── Fixture: skill with a schemas.yml + a single-step workflow + task
    // declaring a data-submission result with an external $ref.
    const skill = 'test-hint';

    // Shared schemas file (referenced via `../schemas.yml#/WidgetYaml`)
    mkdirSync(resolve(agentsDir, 'skills', skill), { recursive: true });
    writeFileSync(
      resolve(agentsDir, 'skills', skill, 'schemas.yml'),
      stringifyYaml({
        WidgetYaml: {
          type: 'object',
          required: ['name'],
          properties: { name: { type: 'string' } },
        },
      }),
      { flag: 'w' },
    );

    // Workflow file: one stage, one step
    writeMd(
      resolve(agentsDir, 'skills', skill, 'workflows', 'test-hint.md'),
      {
        title: 'Test Hint',
        stages: {
          execute: { steps: ['create-widget'] },
        },
        engine: 'direct',
      },
      '# test-hint',
    );

    // Task file: one data-submission result with a $ref
    writeMd(
      resolve(agentsDir, 'skills', skill, 'tasks', 'create-widget.md'),
      {
        trigger: { steps: ['create-widget'] },
        result: {
          type: 'object',
          properties: {
            widget: {
              path: 'widgets/gizmo.widget.yml',
              $ref: '../schemas.yml#/WidgetYaml',
              submission: 'data',
            },
          },
        },
      },
      '# create-widget',
    );

    // ── Act: resolve stages and create the workflow so stage_loaded is populated
    const workflowPath = resolve(agentsDir, 'skills', skill, 'workflows', 'test-hint.md');
    const resolved = await resolveAllStages(workflowPath, baseConfig, {}, agentsDir);

    // Assemble the first task (mirrors CLI create path)
    const firstStepName = 'create-widget';
    const firstResolved = resolved.step_resolved[firstStepName] as ResolvedStep;
    expect(firstResolved).toBeDefined();

    const envMap = buildEnvMap(baseConfig);
    const firstFm = parseFrontmatter(firstResolved.task_file);
    const firstResult = await expandResultDeclarations(
      firstFm?.result as Record<string, unknown> | undefined,
      undefined,
      {},
      envMap,
      undefined,
      true,
    );

    const name = workflowCreate(
      baseConfig.data,
      'test-hint',
      resolved.title,
      [
        {
          id: firstStepName,
          title: `${resolved.title}: ${firstStepName}`,
          type: 'data',
          step: firstStepName,
          stage: 'execute',
          files: [],
          result: firstResult,
          task_file: firstResolved.task_file,
          rules: firstResolved.rules,
          blueprints: firstResolved.blueprints,
          config_rules: firstResolved.config_rules,
          config_instructions: firstResolved.config_instructions,
        },
      ],
      resolved.stages,
      undefined,
      resolved.step_resolved,
      resolved.engine,
      undefined,
      tmpDir,
      {},
      envMap,
    );

    // ── Assert: buildInstructions returns a submit_results markdown block built
    // against the flat SchemaBlock.result map (the bug was reading
    // schema.result.properties, which doesn't exist).
    const out = buildInstructions(baseConfig.data, name, firstStepName);
    expect('error' in out).toBe(false);
    if ('error' in out) throw new Error('unexpected error');

    expect(out.submit_results).toBeDefined();
    const hint = out.submit_results!;
    expect(hint).toContain('## Submit results');
    expect(hint).toContain(`workflow done --task ${firstStepName} --data`);
    // Result key appears in the shape body
    expect(hint).toContain('"widget":');
    // Type label is the resolved local-ref type name (not a raw external ref)
    expect(hint).toContain('<WidgetYaml>');
    // Path annotation with interpolated filename
    expect(hint).toContain('widgets/gizmo.widget.yml');

    // Schema is also included and has the real flat shape
    expect(out.schema).toBeDefined();
    const widgetEntry = out.schema!.result.widget;
    expect(widgetEntry).toBeDefined();
    expect(widgetEntry!.path).toBe('widgets/gizmo.widget.yml');
    expect(widgetEntry!.$ref).toBe('#/definitions/WidgetYaml');
    expect(out.schema!.definitions.WidgetYaml).toBeDefined();
  });

  it('omits submit_results when no data-submission results exist', async () => {
    const skill = 'test-hint-empty';

    writeMd(
      resolve(agentsDir, 'skills', skill, 'workflows', 'test-hint-empty.md'),
      {
        title: 'Test Hint Empty',
        stages: { execute: { steps: ['do-thing'] } },
        engine: 'direct',
      },
      '# test-hint-empty',
    );

    // Task with no `result` frontmatter at all
    writeMd(
      resolve(agentsDir, 'skills', skill, 'tasks', 'do-thing.md'),
      { trigger: { steps: ['do-thing'] } },
      '# do-thing',
    );

    const workflowPath = resolve(agentsDir, 'skills', skill, 'workflows', 'test-hint-empty.md');
    const resolved = await resolveAllStages(workflowPath, baseConfig, {}, agentsDir);

    const firstStepName = 'do-thing';
    const firstResolved = resolved.step_resolved[firstStepName] as ResolvedStep;
    expect(firstResolved).toBeDefined();

    const envMap = buildEnvMap(baseConfig);

    const name = workflowCreate(
      baseConfig.data,
      'test-hint-empty',
      resolved.title,
      [
        {
          id: firstStepName,
          title: `${resolved.title}: ${firstStepName}`,
          type: 'data',
          step: firstStepName,
          stage: 'execute',
          files: [],
          task_file: firstResolved.task_file,
          rules: firstResolved.rules,
          blueprints: firstResolved.blueprints,
          config_rules: firstResolved.config_rules,
          config_instructions: firstResolved.config_instructions,
        },
      ],
      resolved.stages,
      undefined,
      resolved.step_resolved,
      resolved.engine,
      undefined,
      tmpDir,
      {},
      envMap,
    );

    const out = buildInstructions(baseConfig.data, name, firstStepName);
    expect('error' in out).toBe(false);
    if ('error' in out) throw new Error('unexpected error');

    expect(out.submit_results).toBeUndefined();
  });
});
