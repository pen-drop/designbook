/**
 * M3 regression (workflowDone level): an intake-stage `workflow done` whose result
 * plans brand-new component ids — ids NOT present in the live Storybook index — is
 * accepted, with no `component must be equal to one of the allowed values` rejection.
 *
 * This guards the M3 fix at the level that actually failed on a fresh run. The old
 * blocker injected a `ComponentNode.component` enum (frozen from the fresh index:
 * only `card` + `plain`) into result validation, so an intake planning new components
 * could never validate. That enum is deleted; component existence is enforced only by
 * the `scene` validator's live-index inventory walk at the scene stage. The unit tests
 * for the deleted module could not catch a wiring regression that re-introduced the
 * enum — this test drives the real workflowDone result-validation path instead.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { dump as dumpYaml, load as parseYaml } from 'js-yaml';
import { loadConfig } from '../../config.js';
import { runWorkflowCreate } from '../workflow.js';
import { workflowDone, type WorkflowFile } from '../../workflow.js';

function writeMd(filePath: string, fm: Record<string, unknown>, body = ''): void {
  mkdirSync(resolve(filePath, '..'), { recursive: true });
  writeFileSync(filePath, `---\n${dumpYaml(fm).trim()}\n---\n${body}`);
}

describe('M3: intake plans new components at workflow done', () => {
  let tmpRoot: string;
  let dataDir: string;
  let agentsDir: string;
  let previousCwd: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'wf-intake-components-'));
    dataDir = join(tmpRoot, 'designbook');
    mkdirSync(dataDir, { recursive: true });
    agentsDir = join(tmpRoot, '.agents');
    writeFileSync(join(tmpRoot, 'designbook.config.yml'), dumpYaml({ designbook: { data: 'designbook' } }));

    const skill = 'intake-test';
    // A one-step intake workflow whose data result plans a set of components. The
    // `component` property is a plain string — there is deliberately NO enum. If a
    // regression re-injected the frozen index enum into result validation, the
    // un-indexed ids below would be rejected and this test would fail.
    writeMd(
      resolve(agentsDir, 'skills', skill, 'workflows', 'intake-wf.md'),
      {
        title: 'Intake Workflow',
        stages: { intake: { steps: ['intake'] } },
        engine: 'direct',
      },
      '# intake-wf',
    );
    writeMd(
      resolve(agentsDir, 'skills', skill, 'tasks', 'intake.md'),
      {
        trigger: { steps: ['intake'] },
        result: {
          type: 'object',
          required: ['plan'],
          properties: {
            plan: {
              type: 'object',
              required: ['scenes'],
              properties: {
                scenes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['component'],
                    properties: { component: { type: 'string', description: 'planned component id' } },
                  },
                },
              },
            },
          },
        },
      },
      '# intake',
    );

    previousCwd = process.cwd();
    process.chdir(tmpRoot);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  function readTasksYml(name: string): WorkflowFile {
    return parseYaml(
      readFileSync(resolve(dataDir, 'workflows', 'changes', name, 'tasks.yml'), 'utf-8'),
    ) as WorkflowFile;
  }

  it('accepts a done payload referencing un-indexed component ids', async () => {
    const config = loadConfig();
    const created = await runWorkflowCreate({ workflow: 'intake-wf' }, config);
    const name = created.name;
    const taskId = readTasksYml(name).tasks[0]!.id;

    // ids that are NOT `card` / `plain` — the fresh-index inventory the old enum froze.
    const result = await workflowDone(config.data, name, taskId, undefined, {
      config,
      data: {
        plan: {
          scenes: [{ component: 'brand-new-hero' }, { component: 'site-footer' }, { component: 'mega-nav' }],
        },
      },
    });

    const validationErrors = (result.response?.validation_errors as string[] | undefined) ?? [];
    expect(validationErrors).toEqual([]);
    // The single-task workflow completes and archives — no enum rejection blocked done.
    expect(result.archived).toBe(true);
  });
});
