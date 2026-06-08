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
import { workflowCreate, workflowDone } from '../../workflow.js';
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

  it('returns isolate: true when the stage_loaded entry is isolated', async () => {
    // This test drives the flag through the real workflowDone path so that a
    // regression in the dedup-write `...(loaded.isolate ? { isolate: true } : {})`
    // (workflow.ts ~line 1363) would be caught.  The previous version bypassed
    // that path by pre-seeding stage_loaded via workflowCreate's stageLoaded arg.
    //
    // A second task ('do-after') is added so that completing 'do-isolated' does
    // NOT archive the workflow — the tasks.yml must remain in workflows/changes/
    // for buildInstructions to read it.
    const skill = 'test-hint-isolate';

    writeMd(
      resolve(agentsDir, 'skills', skill, 'workflows', 'test-hint-isolate.md'),
      {
        title: 'Test Hint Isolate',
        stages: {
          execute: { steps: ['do-isolated'], isolate: true },
          finish: { steps: ['do-after'] },
        },
        engine: 'direct',
      },
      '# test-hint-isolate',
    );

    writeMd(
      resolve(agentsDir, 'skills', skill, 'tasks', 'do-isolated.md'),
      { trigger: { steps: ['do-isolated'] } },
      '# do-isolated',
    );

    writeMd(
      resolve(agentsDir, 'skills', skill, 'tasks', 'do-after.md'),
      { trigger: { steps: ['do-after'] } },
      '# do-after',
    );

    const workflowPath = resolve(agentsDir, 'skills', skill, 'workflows', 'test-hint-isolate.md');
    const resolved = await resolveAllStages(workflowPath, baseConfig, {}, agentsDir);

    const firstStepName = 'do-isolated';
    const firstResolved = resolved.step_resolved[firstStepName] as ResolvedStep;
    expect(firstResolved).toBeDefined();
    expect(firstResolved.isolate).toBe(true);

    const envMap = buildEnvMap(baseConfig);

    // Create the workflow WITHOUT pre-seeding stage_loaded (pass undefined for
    // the stageLoaded arg so the isolate flag can only come from workflowDone).
    const name = workflowCreate(
      baseConfig.data,
      'test-hint-isolate',
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
        {
          id: 'do-after',
          title: `${resolved.title}: do-after`,
          type: 'data',
          step: 'do-after',
          stage: 'finish',
          files: [],
        },
      ],
      resolved.stages,
      undefined, // parent
      undefined, // stageLoaded — intentionally omitted; flag must come from workflowDone
      resolved.engine,
      undefined,
      tmpDir,
      {},
      envMap,
    );

    // Confirm stage_loaded is NOT yet set (before workflowDone is called).
    const beforeOut = buildInstructions(baseConfig.data, name, firstStepName);
    expect('error' in beforeOut).toBe(true);

    // Drive the flag through the real workflowDone dedup-write path.
    const doneResult = await workflowDone(baseConfig.data, name, firstStepName, {
      task_file: firstResolved.task_file,
      rules: [],
      blueprints: [],
      config_rules: [],
      config_instructions: [],
      isolate: true,
    });

    // The workflow must NOT have been archived (second task still pending).
    expect(doneResult.archived).toBe(false);

    // Verify the dedup-write landed in the persisted data returned by workflowDone.
    const persistedEntry = doneResult.data.stage_loaded?.['do-isolated'];
    expect(persistedEntry).toBeDefined();
    expect((persistedEntry as { isolate?: boolean } | undefined)?.isolate).toBe(true);

    // Now buildInstructions must surface isolate: true from stage_loaded.
    const out = buildInstructions(baseConfig.data, name, firstStepName);
    expect('error' in out).toBe(false);
    if ('error' in out) throw new Error('unexpected error');

    expect((out as import('../workflow.js').InstructionsResult).isolate).toBe(true);

    // Negative assertion: the non-isolated step 'do-after' is not yet in
    // stage_loaded, so buildInstructions for it returns an error (no entry).
    const outAfter = buildInstructions(baseConfig.data, name, 'do-after');
    expect('error' in outAfter).toBe(true);
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
