/**
 * Tests for provider rules on result keys.
 *
 * A rule with `provides: <result-key>` in frontmatter becomes the provider for
 * that result key: when any task in the same stage declares `result.<key>`,
 * the rule's absolute file path is attached as `provider_rule` to the result
 * declaration in the resolved tasks.yml.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { dump as stringifyYaml } from 'js-yaml';
import { resolveAllStages, buildEnvMap, expandResultDeclarations, parseFrontmatter } from '../workflow-resolve.js';
import type { ResolvedStep } from '../workflow-resolve.js';
import { workflowCreate, readWorkflow } from '../workflow.js';
import type { DesignbookConfig } from '../config.js';

// ── helpers ────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  const dir = resolve(tmpdir(), `wf-provides-result-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeMd(filePath: string, fm: Record<string, unknown>, body = ''): void {
  mkdirSync(resolve(filePath, '..'), { recursive: true });
  const content = `---\n${stringifyYaml(fm).trim()}\n---\n${body}`;
  writeFileSync(filePath, content);
}

function writeWorkflow(agentsDir: string, skill: string, id: string, fm: Record<string, unknown>): string {
  const filePath = resolve(agentsDir, 'skills', skill, 'workflows', `${id}.md`);
  writeMd(filePath, fm, `# ${id}`);
  return filePath;
}

function writeTask(agentsDir: string, skill: string, name: string, fm: Record<string, unknown>, body = ''): string {
  const filePath = resolve(agentsDir, 'skills', skill, 'tasks', `${name}.md`);
  writeMd(filePath, fm, body || `# ${name}`);
  return filePath;
}

function writeRule(agentsDir: string, skill: string, name: string, fm: Record<string, unknown>, body = ''): string {
  const filePath = resolve(agentsDir, 'skills', skill, 'rules', `${name}.md`);
  writeMd(filePath, fm, body || `# ${name}`);
  return filePath;
}

// ── setup ──────────────────────────────────────────────────────────────

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

// ── tests ──────────────────────────────────────────────────────────────

describe('provider rules for result keys', () => {
  it('attaches provider_rule to a result entry when a rule provides that key', async () => {
    const skill = 'test-provides-result';

    const workflowPath = writeWorkflow(agentsDir, skill, 'test-provides-result', {
      title: 'Test Provides Result',
      stages: {
        execute: { steps: ['extract-thing'] },
      },
      engine: 'direct',
    });

    writeTask(agentsDir, skill, 'extract-thing', {
      trigger: { steps: ['extract-thing'] },
      result: {
        type: 'object',
        required: ['extractedValue'],
        properties: {
          extractedValue: {
            type: 'string',
          },
        },
      },
    });

    // Rule with string-valued `provides:` matching the result key.
    const rulePath = writeRule(
      agentsDir,
      skill,
      'provide-extracted-value',
      {
        provides: 'extractedValue',
        trigger: { steps: ['extract-thing'] },
      },
      `# Provide Extracted Value

Extract \`extractedValue\` from the input string using a simple rule.`,
    );

    // Resolve + create workflow (mirrors CLI create path)
    const resolved = await resolveAllStages(workflowPath, baseConfig, {}, agentsDir);
    const firstStep = resolved.step_resolved['extract-thing'] as ResolvedStep;
    expect(firstStep).toBeDefined();
    expect(firstStep.rules).toContain(rulePath);

    const envMap = buildEnvMap(baseConfig);
    const taskFm = parseFrontmatter(firstStep.task_file);
    const expandedResult = await expandResultDeclarations(
      taskFm?.result as Record<string, unknown> | undefined,
      undefined,
      {},
      envMap,
      undefined,
      true,
      firstStep.rules,
    );

    expect(expandedResult).toBeDefined();
    expect(expandedResult!.extractedValue).toBeDefined();
    expect(expandedResult!.extractedValue!.provider_rule).toBe(rulePath);

    const name = workflowCreate(
      baseConfig.data,
      'test-provides-result',
      resolved.title,
      [
        {
          id: 'extract-thing',
          title: `${resolved.title}: extract-thing`,
          type: 'data',
          step: 'extract-thing',
          stage: 'execute',
          files: [],
          result: expandedResult,
          task_file: firstStep.task_file,
          rules: firstStep.rules,
          blueprints: firstStep.blueprints,
          config_rules: firstStep.config_rules,
          config_instructions: firstStep.config_instructions,
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

    // Verify tasks.yml carries the new field
    const tasksPath = resolve(baseConfig.data, 'workflows', 'changes', name, 'tasks.yml');
    const wf = readWorkflow(tasksPath);
    const task = wf.tasks[0]!;
    expect(task.result).toBeDefined();
    expect(task.result!.extractedValue).toBeDefined();
    // readWorkflow resolves back to absolute for in-memory use.
    expect(task.result!.extractedValue!.provider_rule).toBe(rulePath);

    // Raw file must store the path RELATIVE to workspace_root (worktree-portable),
    // matching how task_file/rules are serialized today.
    const rawYaml = readFileSync(tasksPath, 'utf-8');
    // The absolute rule path must NOT appear in the raw file.
    expect(rawYaml).not.toContain(rulePath);
    // But the workspace-relative form must be present.
    const relativeRulePath = rulePath.replace(tmpDir + '/', '');
    expect(rawYaml).toContain(`provider_rule: ${relativeRulePath}`);
  });

  it('does not attach provider_rule when no rule provides the result key', async () => {
    const skill = 'test-no-provider';

    const workflowPath = writeWorkflow(agentsDir, skill, 'test-no-provider', {
      title: 'Test No Provider',
      stages: { execute: { steps: ['make-value'] } },
      engine: 'direct',
    });

    writeTask(agentsDir, skill, 'make-value', {
      trigger: { steps: ['make-value'] },
      result: {
        type: 'object',
        properties: {
          value: { type: 'string' },
        },
      },
    });

    // A rule that does NOT match the result key — it provides a different key.
    writeRule(agentsDir, skill, 'provide-other', {
      provides: 'somethingElse',
      trigger: { steps: ['make-value'] },
    });

    const resolved = await resolveAllStages(workflowPath, baseConfig, {}, agentsDir);
    const firstStep = resolved.step_resolved['make-value'] as ResolvedStep;
    expect(firstStep).toBeDefined();

    const envMap = buildEnvMap(baseConfig);
    const taskFm = parseFrontmatter(firstStep.task_file);
    const expandedResult = await expandResultDeclarations(
      taskFm?.result as Record<string, unknown> | undefined,
      undefined,
      {},
      envMap,
      undefined,
      true,
      firstStep.rules,
    );

    expect(expandedResult).toBeDefined();
    expect(expandedResult!.value).toBeDefined();
    expect(expandedResult!.value!.provider_rule).toBeUndefined();

    // Round-trip through tasks.yml — provider_rule must remain absent.
    const name = workflowCreate(
      baseConfig.data,
      'test-no-provider',
      resolved.title,
      [
        {
          id: 'make-value',
          title: `${resolved.title}: make-value`,
          type: 'data',
          step: 'make-value',
          stage: 'execute',
          files: [],
          result: expandedResult,
          task_file: firstStep.task_file,
          rules: firstStep.rules,
          blueprints: firstStep.blueprints,
          config_rules: firstStep.config_rules,
          config_instructions: firstStep.config_instructions,
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

    const tasksPath = resolve(baseConfig.data, 'workflows', 'changes', name, 'tasks.yml');
    const wf = readWorkflow(tasksPath);
    expect(wf.tasks[0]!.result!.value!.provider_rule).toBeUndefined();
  });

  it('backward-compat: object-valued provides: (schema composition) still works and does not add provider_rule', async () => {
    const skill = 'test-provides-object';

    const workflowPath = writeWorkflow(agentsDir, skill, 'test-provides-object', {
      title: 'Test Provides Object',
      stages: {
        execute: { steps: ['make-thing'], domain: ['data-model'] },
      },
      engine: 'direct',
    });

    writeTask(agentsDir, skill, 'make-thing', {
      trigger: { steps: ['make-thing'] },
      domain: ['data-model'],
      result: {
        type: 'object',
        properties: {
          thing: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      },
    });

    // Object-valued provides: — schema default mechanism (backward compat).
    writeRule(agentsDir, skill, 'provide-thing-default', {
      trigger: { domain: 'data-model' },
      provides: {
        thing: {
          properties: {
            name: { default: 'unnamed' },
          },
        },
      },
    });

    const resolved = await resolveAllStages(workflowPath, baseConfig, {}, agentsDir);
    const firstStep = resolved.step_resolved['make-thing'] as ResolvedStep;
    expect(firstStep).toBeDefined();

    const envMap = buildEnvMap(baseConfig);
    const taskFm = parseFrontmatter(firstStep.task_file);
    const expandedResult = await expandResultDeclarations(
      taskFm?.result as Record<string, unknown> | undefined,
      undefined,
      {},
      envMap,
      undefined,
      true,
      firstStep.rules,
    );

    // Object-valued provides is NOT a provider rule — provider_rule must be absent.
    expect(expandedResult).toBeDefined();
    expect(expandedResult!.thing).toBeDefined();
    expect(expandedResult!.thing!.provider_rule).toBeUndefined();

    // And the existing schema-composition path still populated schema.definitions.
    expect(firstStep.schema).toBeDefined();
    expect(firstStep.schema!.definitions.thing).toBeDefined();
    const thingDef = firstStep.schema!.definitions.thing as Record<string, unknown>;
    const props = thingDef.properties as Record<string, Record<string, unknown>>;
    expect(props.name!.default).toBe('unnamed');

    // Round-trip through tasks.yml — provider_rule must remain absent for
    // object-valued provides (backward-compat path).
    const name = workflowCreate(
      baseConfig.data,
      'test-provides-object',
      resolved.title,
      [
        {
          id: 'make-thing',
          title: `${resolved.title}: make-thing`,
          type: 'data',
          step: 'make-thing',
          stage: 'execute',
          files: [],
          result: expandedResult,
          task_file: firstStep.task_file,
          rules: firstStep.rules,
          blueprints: firstStep.blueprints,
          config_rules: firstStep.config_rules,
          config_instructions: firstStep.config_instructions,
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

    const tasksPath = resolve(baseConfig.data, 'workflows', 'changes', name, 'tasks.yml');
    const wf = readWorkflow(tasksPath);
    expect(wf.tasks[0]!.result!.thing!.provider_rule).toBeUndefined();
  });

  it('throws when two rules provide the same result key', async () => {
    const skill = 'test-provides-conflict';

    const workflowPath = writeWorkflow(agentsDir, skill, 'test-provides-conflict', {
      title: 'Test Provides Conflict',
      stages: {
        execute: { steps: ['make-dup'] },
      },
      engine: 'direct',
    });

    writeTask(agentsDir, skill, 'make-dup', {
      trigger: { steps: ['make-dup'] },
      result: {
        type: 'object',
        properties: {
          dupValue: { type: 'string' },
        },
      },
    });

    // Two rules that both provide the same key — this is a config error.
    writeRule(agentsDir, skill, 'provide-dup-a', {
      provides: 'dupValue',
      trigger: { steps: ['make-dup'] },
    });
    writeRule(agentsDir, skill, 'provide-dup-b', {
      provides: 'dupValue',
      trigger: { steps: ['make-dup'] },
    });

    const resolved = await resolveAllStages(workflowPath, baseConfig, {}, agentsDir);
    const firstStep = resolved.step_resolved['make-dup'] as ResolvedStep;
    expect(firstStep).toBeDefined();
    // Both rules must have been matched, otherwise the test is meaningless.
    expect(firstStep.rules.length).toBe(2);

    const envMap = buildEnvMap(baseConfig);
    const taskFm = parseFrontmatter(firstStep.task_file);

    await expect(
      expandResultDeclarations(
        taskFm?.result as Record<string, unknown> | undefined,
        undefined,
        {},
        envMap,
        undefined,
        true,
        firstStep.rules,
      ),
    ).rejects.toThrow(/Multiple provider rules for result key "dupValue"/);
  });
});
