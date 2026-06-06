/**
 * Integration test: the `workflow done` after-create flow.
 *
 * On the final `workflow done` of a parent whose definition declares `after:`,
 * the CLI holds the parent (awaiting-after) and auto-creates one child workflow
 * per declaration, mapping params via JSONata over the parent's params and
 * registering the children on the parent.
 *
 * Drives the exported library path (workflowDone + createAfterWorkflows) — the
 * same calls the CLI `done` action makes — without spawning the binary.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { dump as dumpYaml, load as parseYaml } from 'js-yaml';
import { loadConfig } from '../../config.js';
import { loadWorkflowDefinition } from '../workflow-discovery.js';
import { workflowDone, workflowAbandon, type WorkflowFile } from '../../workflow.js';
import { runWorkflowCreate, createAfterWorkflows } from '../workflow.js';

function writeMd(filePath: string, fm: Record<string, unknown>, body = ''): void {
  mkdirSync(resolve(filePath, '..'), { recursive: true });
  writeFileSync(filePath, `---\n${dumpYaml(fm).trim()}\n---\n${body}`);
}

describe('workflow done: after-workflow auto-create', () => {
  let tmpRoot: string;
  let dataDir: string;
  let agentsDir: string;
  let previousCwd: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'wf-after-create-'));
    dataDir = join(tmpRoot, 'designbook');
    mkdirSync(dataDir, { recursive: true });
    agentsDir = join(tmpRoot, '.agents');

    // Minimal config that loadConfig() accepts; resolves data to <tmpRoot>/designbook.
    writeFileSync(join(tmpRoot, 'designbook.config.yml'), dumpYaml({ designbook: { data: 'designbook' } }));

    const skill = 'after-test';

    // Parent workflow: one stage/step, declares an after: child mapping story_id.
    writeMd(
      resolve(agentsDir, 'skills', skill, 'workflows', 'parent-wf.md'),
      {
        title: 'Parent Workflow',
        params: { story_id: { type: 'string' } },
        stages: { execute: { steps: ['do-thing'] } },
        engine: 'direct',
        after: [{ workflow: 'child-wf', params: { story_id: 'story_id' } }],
      },
      '# parent-wf',
    );
    writeMd(
      resolve(agentsDir, 'skills', skill, 'tasks', 'do-thing.md'),
      { trigger: { steps: ['do-thing'] } },
      '# do-thing',
    );

    // Child workflow: one stage/step that accepts story_id.
    writeMd(
      resolve(agentsDir, 'skills', skill, 'workflows', 'child-wf.md'),
      {
        title: 'Child Workflow',
        params: { story_id: { type: 'string' } },
        stages: { execute: { steps: ['verify'] } },
        engine: 'direct',
      },
      '# child-wf',
    );
    writeMd(resolve(agentsDir, 'skills', skill, 'tasks', 'verify.md'), { trigger: { steps: ['verify'] } }, '# verify');

    previousCwd = process.cwd();
    process.chdir(tmpRoot);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  function readTasksYml(name: string): WorkflowFile {
    const changesPath = resolve(dataDir, 'workflows', 'changes', name, 'tasks.yml');
    return parseYaml(readFileSync(changesPath, 'utf-8')) as WorkflowFile;
  }

  it('creates child workflows with JSONata-mapped params on final done', async () => {
    const config = loadConfig();

    // Create the parent with a story_id param.
    const parent = await runWorkflowCreate(
      { workflow: 'parent-wf', params: { story_id: 'debo-design-system' } },
      config,
    );
    const parentName = parent.name;
    const parentMetaBefore = readTasksYml(parentName);
    const firstTaskId = parentMetaBefore.tasks[0]!.id;

    // Complete the parent's only task via the done flow, passing after: from the definition.
    const def = loadWorkflowDefinition('parent-wf', agentsDir);
    const result = await workflowDone(config.data, parentName, firstTaskId, undefined, {
      config,
      after: def.after,
    });

    expect(result.archived).toBe(false);
    expect(result.awaitingAfter).toEqual(def.after);

    // Drive the after-create step the way the CLI done action will.
    const next = await createAfterWorkflows(result.awaitingAfter!, parentName, parentMetaBefore.params ?? {}, config);

    expect(next.length).toBe(1);
    expect(next[0]!.workflow).toBe('child-wf');

    const child = readTasksYml(next[0]!.name);
    expect(child.parent).toBe(parentName);
    expect(child.params?.story_id).toBe('debo-design-system');

    const parentMeta = readTasksYml(parentName);
    expect(parentMeta.status).toBe('awaiting-after');
    expect(parentMeta.children).toEqual([{ name: next[0]!.name, workflow: 'child-wf' }]);
  });

  it('idempotent re-run: second createAfterWorkflows call skips creation, parent has exactly 1 child', async () => {
    const config = loadConfig();

    const parent = await runWorkflowCreate(
      { workflow: 'parent-wf', params: { story_id: 'debo-design-system' } },
      config,
    );
    const parentName = parent.name;
    const parentMetaBefore = readTasksYml(parentName);
    const declarations = [{ workflow: 'child-wf', params: { story_id: 'story_id' } }];

    // First run
    const first = await createAfterWorkflows(declarations, parentName, parentMetaBefore.params ?? {}, config);
    expect(first.length).toBe(1);
    const childName = first[0]!.name;

    // Count workflow dirs after first run
    const { readdirSync } = await import('node:fs');
    const { resolve: res } = await import('node:path');
    const childDirsBefore = readdirSync(res(dataDir, 'workflows', 'changes'));

    // Second run — should skip creation entirely
    const second = await createAfterWorkflows(declarations, parentName, parentMetaBefore.params ?? {}, config);

    const childDirsAfter = readdirSync(res(dataDir, 'workflows', 'changes'));
    // No new dirs created
    expect(childDirsAfter.length).toBe(childDirsBefore.length);

    expect(second.length).toBe(1);
    expect(second[0]!.name).toBe(childName);

    // Parent still has exactly 1 child
    const parentMeta = readTasksYml(parentName);
    expect(parentMeta.children).toHaveLength(1);
    expect(parentMeta.children![0]!.name).toBe(childName);
  });

  it('rejects with a clear error when a param expression evaluates to undefined', async () => {
    const config = loadConfig();

    const parent = await runWorkflowCreate(
      { workflow: 'parent-wf', params: { story_id: 'debo-design-system' } },
      config,
    );
    const parentName = parent.name;

    const declarations = [{ workflow: 'child-wf', params: { story_id: 'nonexistent_key' } }];

    await expect(createAfterWorkflows(declarations, parentName, {}, config)).rejects.toThrow(
      "after-workflow 'child-wf': param 'story_id' expression 'nonexistent_key' evaluated to undefined on parent params",
    );

    // No child workflow dir should have been created
    const { existsSync: existsSyncLocal } = await import('node:fs');
    const { resolve: res } = await import('node:path');
    const childChanges = res(dataDir, 'workflows', 'changes');
    const dirs = existsSyncLocal(childChanges)
      ? (await import('node:fs')).readdirSync(childChanges).filter((d) => d !== parentName)
      : [];
    expect(dirs).toHaveLength(0);
  });

  it('archives the parent when the last child completes', async () => {
    const config = loadConfig();

    // Create parent (has one after: child-wf declaration)
    const parent = await runWorkflowCreate(
      { workflow: 'parent-wf', params: { story_id: 'debo-design-system' } },
      config,
    );
    const parentName = parent.name;
    const parentMetaBefore = parseYaml(
      readFileSync(resolve(dataDir, 'workflows', 'changes', parentName, 'tasks.yml'), 'utf-8'),
    ) as WorkflowFile;
    const firstTaskId = parentMetaBefore.tasks[0]!.id;

    // Complete the parent's task → awaiting-after
    const def = loadWorkflowDefinition('parent-wf', agentsDir);
    const result = await workflowDone(config.data, parentName, firstTaskId, undefined, {
      config,
      after: def.after,
    });
    expect(result.archived).toBe(false);
    expect(result.awaitingAfter).toEqual(def.after);

    // Create the child workflow
    const children = await createAfterWorkflows(
      result.awaitingAfter!,
      parentName,
      parentMetaBefore.params ?? {},
      config,
    );
    const childName = children[0]!.name;

    // Complete the child's task → should cascade and archive the parent
    const childMeta = parseYaml(
      readFileSync(resolve(dataDir, 'workflows', 'changes', childName, 'tasks.yml'), 'utf-8'),
    ) as WorkflowFile;
    const childTaskId = childMeta.tasks[0]!.id;

    const childResult = await workflowDone(config.data, childName, childTaskId, undefined, { config });
    expect(childResult.archived).toBe(true);

    // Parent must now be in archive, status completed
    const parentArchivePath = resolve(dataDir, 'workflows', 'archive', parentName, 'tasks.yml');
    expect(existsSync(parentArchivePath)).toBe(true);
    const parentArchived = parseYaml(readFileSync(parentArchivePath, 'utf-8')) as WorkflowFile;
    expect(parentArchived.status).toBe('completed');

    // Parent must no longer be in changes
    const parentChangesPath = resolve(dataDir, 'workflows', 'changes', parentName, 'tasks.yml');
    expect(existsSync(parentChangesPath)).toBe(false);
  });

  it('keeps parent awaiting-after while any child is unfinished', async () => {
    const config = loadConfig();
    const skill = 'after-test';

    // Write a parent with TWO after: declarations (child-wf and child-wf-b)
    writeMd(
      resolve(agentsDir, 'skills', skill, 'workflows', 'parent-wf-two.md'),
      {
        title: 'Parent Workflow Two',
        params: { story_id: { type: 'string' } },
        stages: { execute: { steps: ['do-thing'] } },
        engine: 'direct',
        after: [
          { workflow: 'child-wf', params: { story_id: 'story_id' } },
          { workflow: 'child-wf-b', params: { story_id: 'story_id' } },
        ],
      },
      '# parent-wf-two',
    );

    // Second child workflow
    writeMd(
      resolve(agentsDir, 'skills', skill, 'workflows', 'child-wf-b.md'),
      {
        title: 'Child Workflow B',
        params: { story_id: { type: 'string' } },
        stages: { execute: { steps: ['verify'] } },
        engine: 'direct',
      },
      '# child-wf-b',
    );

    const parent = await runWorkflowCreate(
      { workflow: 'parent-wf-two', params: { story_id: 'debo-design-system' } },
      config,
    );
    const parentName = parent.name;
    const parentMetaBefore = parseYaml(
      readFileSync(resolve(dataDir, 'workflows', 'changes', parentName, 'tasks.yml'), 'utf-8'),
    ) as WorkflowFile;
    const firstTaskId = parentMetaBefore.tasks[0]!.id;

    // Complete parent's task → awaiting-after
    const def = loadWorkflowDefinition('parent-wf-two', agentsDir);
    const result = await workflowDone(config.data, parentName, firstTaskId, undefined, {
      config,
      after: def.after,
    });
    expect(result.archived).toBe(false);

    // Create both children
    const children = await createAfterWorkflows(
      result.awaitingAfter!,
      parentName,
      parentMetaBefore.params ?? {},
      config,
    );
    expect(children.length).toBe(2);

    const firstChildName = children[0]!.name;

    // Complete only the first child
    const firstChildMeta = parseYaml(
      readFileSync(resolve(dataDir, 'workflows', 'changes', firstChildName, 'tasks.yml'), 'utf-8'),
    ) as WorkflowFile;
    const firstChildTaskId = firstChildMeta.tasks[0]!.id;

    await workflowDone(config.data, firstChildName, firstChildTaskId, undefined, { config });

    // Parent must still be in changes, still awaiting-after
    const parentChangesPath = resolve(dataDir, 'workflows', 'changes', parentName, 'tasks.yml');
    expect(existsSync(parentChangesPath)).toBe(true);
    const parentMeta = parseYaml(readFileSync(parentChangesPath, 'utf-8')) as WorkflowFile;
    expect(parentMeta.status).toBe('awaiting-after');

    // Parent must NOT be in archive
    const parentArchivePath = resolve(dataDir, 'workflows', 'archive', parentName, 'tasks.yml');
    expect(existsSync(parentArchivePath)).toBe(false);
  });

  it('abandoning a child unblocks the awaiting-after parent', async () => {
    const config = loadConfig();

    // Create parent (has one after: child-wf declaration)
    const parent = await runWorkflowCreate(
      { workflow: 'parent-wf', params: { story_id: 'debo-design-system' } },
      config,
    );
    const parentName = parent.name;
    const parentMetaBefore = parseYaml(
      readFileSync(resolve(dataDir, 'workflows', 'changes', parentName, 'tasks.yml'), 'utf-8'),
    ) as WorkflowFile;
    const firstTaskId = parentMetaBefore.tasks[0]!.id;

    // Complete the parent's task → awaiting-after
    const def = loadWorkflowDefinition('parent-wf', agentsDir);
    const result = await workflowDone(config.data, parentName, firstTaskId, undefined, {
      config,
      after: def.after,
    });
    expect(result.archived).toBe(false);
    expect(result.awaitingAfter).toEqual(def.after);

    // Create the child workflow
    const children = await createAfterWorkflows(
      result.awaitingAfter!,
      parentName,
      parentMetaBefore.params ?? {},
      config,
    );
    const childName = children[0]!.name;

    // Abandon the child — should cascade and archive the parent
    workflowAbandon(config.data, childName);

    // Parent must now be in archive with status 'completed'
    const parentArchivePath = resolve(dataDir, 'workflows', 'archive', parentName, 'tasks.yml');
    expect(existsSync(parentArchivePath)).toBe(true);
    const parentArchived = parseYaml(readFileSync(parentArchivePath, 'utf-8')) as WorkflowFile;
    expect(parentArchived.status).toBe('completed');

    // Parent must no longer be in changes
    const parentChangesPath = resolve(dataDir, 'workflows', 'changes', parentName, 'tasks.yml');
    expect(existsSync(parentChangesPath)).toBe(false);
  });
});
