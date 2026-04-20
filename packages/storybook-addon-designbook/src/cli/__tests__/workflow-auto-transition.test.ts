import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dump as dumpYaml, load as parseYaml } from 'js-yaml';
import { buildInstructions } from '../workflow.js';

describe('waiting→running auto-transition removal', () => {
  let dataDir: string;
  let workflowName: string;
  let tasksYmlPath: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'wf-auto-'));
    workflowName = 'test-wf-2026-04-20-abcd';
    const dir = join(dataDir, 'workflows', 'changes', workflowName);
    mkdirSync(dir, { recursive: true });
    tasksYmlPath = join(dir, 'tasks.yml');
    writeFileSync(
      tasksYmlPath,
      dumpYaml({
        title: 'Test',
        workflow: 'test-wf',
        status: 'waiting',
        waiting_message: 'Preview OK?',
        stages: { intake: { steps: ['intake'] } },
        stage_loaded: {
          intake: {
            task_file: '/abs/intake.md',
            rules: [],
            blueprints: [],
            config_rules: [],
            config_instructions: [],
          },
        },
        tasks: [{ id: 'intake', status: 'in-progress', title: 'Intake', stage: 'intake' }],
      }),
    );
  });

  afterEach(() => rmSync(dataDir, { recursive: true, force: true }));

  it('buildInstructions does NOT flip waiting→running', () => {
    buildInstructions(dataDir, workflowName, 'intake');
    const raw = parseYaml(readFileSync(tasksYmlPath, 'utf-8')) as {
      status: string;
      waiting_message?: string;
    };
    expect(raw.status).toBe('waiting');
    expect(raw.waiting_message).toBe('Preview OK?');
  });
});
