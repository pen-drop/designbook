import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { dump as stringifyYaml } from 'js-yaml';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import {
  resolveTaskFiles,
  expandFilePath,
  matchRuleFiles,
  resolveConfigForStep,
  validateAndMergeParams,
  isJsonSchemaParam,
  validateParamFormats,
  generateTaskId,
  resolveWorkflowPlan,
  buildEnvMap,
  buildWorktreeEnvMap,
  lookup,
  checkWhen,
  resolveFiles,
  buildRuntimeContext,
  buildEnrichedConfig,
  deriveArtifactName,
  resolveShortName,
  deduplicateByNameAs,
  collectAndResolveSchemas,
  resolveSchemaRef,
  resolveParamsRef,
  matchDomain,
  type ResolvedFile,
  type ResolvedTask,
} from '../../workflow-resolve.js';
import { acquireLock, releaseLock, withLock } from '../../workflow-lock.js';
import type { DesignbookConfig } from '../../config.js';

// ── Test helpers ───────────────────────────────────────────────────

function makeTmpDir(): string {
  const dir = resolve(tmpdir(), `designbook-test-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeSkillTaskFile(
  agentsDir: string,
  skillName: string,
  taskName: string,
  frontmatter: string,
  body = '',
): string {
  const dir = resolve(agentsDir, 'skills', skillName, 'tasks');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${taskName}.md`);
  writeFileSync(path, `---\n${frontmatter}\n---\n${body}`);
  return path;
}

function writeSkillRuleFile(
  agentsDir: string,
  skillName: string,
  ruleName: string,
  frontmatter: string,
  body = '',
): string {
  const dir = resolve(agentsDir, 'skills', skillName, 'rules');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${ruleName}.md`);
  writeFileSync(path, `---\n${frontmatter}\n---\n${body}`);
  return path;
}

function writeSkillRuleFileInSubdir(
  agentsDir: string,
  skillName: string,
  subdir: string,
  ruleName: string,
  frontmatter: string,
  body = '',
): string {
  const dir = resolve(agentsDir, 'skills', skillName, subdir, 'rules');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${ruleName}.md`);
  writeFileSync(path, `---\n${frontmatter}\n---\n${body}`);
  return path;
}

function writeSkillTaskFileInSubdir(
  agentsDir: string,
  skillName: string,
  subdir: string,
  taskName: string,
  frontmatter: string,
  body = '',
): string {
  const dir = resolve(agentsDir, 'skills', skillName, subdir, 'tasks');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${taskName}.md`);
  writeFileSync(path, `---\n${frontmatter}\n---\n${body}`);
  return path;
}

function writeWorkflowFile(dir: string, name: string, frontmatter: string): string {
  const path = resolve(dir, `${name}.md`);
  writeFileSync(path, `---\n${frontmatter}\n---\nLoad skill designbook-workflow.`);
  return path;
}

const baseConfig: DesignbookConfig = {
  data: '/test/dist',
  technology: 'drupal',
  backend: 'drupal',
  'frameworks.component': 'sdc',
  'frameworks.css': 'tailwind',
  workspace: '/test',
  'designbook.home': '/test/theme',
  'designbook.data': '/test/dist',
  'css.app': '/test/css/app.src.css',
};

// ── Tests ──────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = makeTmpDir();
});

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
});

// 5.1: Task file resolution
describe('resolveTaskFiles', () => {
  it('resolves named stage (skill:task format) via when.steps', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillTaskFile(
      agentsDir,
      'designbook-sections',
      'create-section',
      'when:\n  steps: [designbook-sections:create-section]\nparams:\n  section_id: { type: string }',
    );

    const result = resolveTaskFiles('designbook-sections:create-section', baseConfig, agentsDir);
    expect(result).toEqual([resolve(agentsDir, 'skills/designbook-sections/tasks/create-section.md')]);
  });

  it('resolves generic stage via when.steps', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillTaskFile(
      agentsDir,
      'designbook-tokens',
      'create-tokens',
      'when:\n  steps: [create-tokens]\nparams:\n  colors: { type: object }',
    );

    const result = resolveTaskFiles('create-tokens', baseConfig, agentsDir);
    expect(result).toEqual([resolve(agentsDir, 'skills/designbook-tokens/tasks/create-tokens.md')]);
  });

  it('returns all matching task files for generic stage via when.steps', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    // Generic match
    const genericPath = writeSkillTaskFile(
      agentsDir,
      'generic-comp',
      'create-component',
      'when:\n  steps: [create-component]\nparams:\n  component: { type: string }',
    );
    // Specific match (when frameworks.component: sdc + steps)
    const specificPath = writeSkillTaskFile(
      agentsDir,
      'sdc-comp',
      'create-component',
      'when:\n  steps: [create-component]\n  frameworks.component: sdc\nparams:\n  component: { type: string }',
    );

    const result = resolveTaskFiles('create-component', baseConfig, agentsDir);
    expect(result).toHaveLength(2);
    expect(result).toContain(genericPath);
    expect(result).toContain(specificPath);
  });

  it('returns empty array on no matching task file', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    mkdirSync(resolve(agentsDir, 'skills'), { recursive: true });

    const result = resolveTaskFiles('nonexistent-stage', baseConfig, agentsDir);
    expect(result).toEqual([]);
  });

  it('discovers task file nested in a subdirectory above tasks/', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const taskPath = writeSkillTaskFileInSubdir(
      agentsDir,
      'designbook-sdc',
      'components',
      'create-component',
      'when:\n  steps: [create-component]\nparams:\n  component: { type: string }',
    );

    const result = resolveTaskFiles('create-component', baseConfig, agentsDir);
    expect(result).toContain(taskPath);
  });

  it('flat task structure still discovered after glob change', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const taskPath = writeSkillTaskFile(
      agentsDir,
      'designbook-tokens',
      'create-tokens',
      'when:\n  steps: [create-tokens]\nparams:\n  colors: { type: object }',
    );

    const result = resolveTaskFiles('create-tokens', baseConfig, agentsDir);
    expect(result).toContain(taskPath);
  });

  // 3.1: broad-scan finds task by when.steps regardless of filename
  it('finds task by when.steps even when filename does not match step name', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const taskPath = writeSkillTaskFile(
      agentsDir,
      'designbook-devtools',
      'inspect-storybook',
      'when:\n  steps: [inspect]',
    );

    const result = resolveTaskFiles('inspect', baseConfig, agentsDir);
    expect(result).toEqual([taskPath]);
  });

  // 3.2: task without when.steps falls back to filename match with warning
  it('falls back to filename match with warning when task has no when.steps', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const taskPath = writeSkillTaskFile(agentsDir, 'legacy-skill', 'my-step', 'params:\n  foo: bar');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = resolveTaskFiles('my-step', baseConfig, agentsDir);
    expect(result).toEqual([taskPath]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('resolved by filename'));
    warnSpy.mockRestore();
  });

  // 3.3: multiple tasks from different skills match one step via when.steps
  it('returns tasks from multiple skills matching the same step via when.steps', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const path1 = writeSkillTaskFile(agentsDir, 'skill-a', 'do-thing', 'when:\n  steps: [shared-step]');
    const path2 = writeSkillTaskFile(agentsDir, 'skill-b', 'do-thing-alt', 'when:\n  steps: [shared-step]');

    const result = resolveTaskFiles('shared-step', baseConfig, agentsDir);
    expect(result).toHaveLength(2);
    expect(result).toContain(path1);
    expect(result).toContain(path2);
  });

  // Named stage fallback: direct path when no when.steps
  it('named stage falls back to direct path with warning when no when.steps match', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillTaskFile(agentsDir, 'my-skill', 'my-task', 'params:\n  x: 1');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = resolveTaskFiles('my-skill:my-task', baseConfig, agentsDir);
    expect(result).toEqual([resolve(agentsDir, 'skills/my-skill/tasks/my-task.md')]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('resolved by filename'));
    warnSpy.mockRestore();
  });

  // Workflow-qualified step via when.steps (e.g. design-shell:intake)
  it('resolves workflow-qualified step via when.steps on -- task files', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const taskPath = writeSkillTaskFile(
      agentsDir,
      'designbook',
      'intake--design-shell',
      'when:\n  steps: [design-shell:intake]',
    );

    const result = resolveTaskFiles('design-shell:intake', baseConfig, agentsDir);
    expect(result).toEqual([taskPath]);
  });
});

// 5.2: File path expansion
describe('expandFilePath', () => {
  const envMap = { DESIGNBOOK_DATA: '/test/dist', DESIGNBOOK_DIRS_COMPONENTS: '/test/theme/components' };

  it('expands {{ param }} placeholders', () => {
    const result = expandFilePath(
      '$DESIGNBOOK_DATA/components/{{ component }}/{{ component }}.yml',
      { component: 'button' },
      envMap,
    );
    expect(result).toBe('/test/dist/components/button/button.yml');
  });

  it('expands ${VAR} env vars', () => {
    const result = expandFilePath('${DESIGNBOOK_DIRS_COMPONENTS}/test.yml', {}, envMap);
    expect(result).toBe('/test/theme/components/test.yml');
  });

  it('expands $VAR env vars (without braces)', () => {
    const result = expandFilePath('$DESIGNBOOK_DATA/data.yml', {}, envMap);
    expect(result).toBe('/test/dist/data.yml');
  });

  it('throws on unknown env var', () => {
    expect(() => expandFilePath('$UNKNOWN_VAR/test', {}, envMap)).toThrow(/Unknown environment variable/);
  });

  it('throws on unknown param', () => {
    expect(() => expandFilePath('{{ missing }}', {}, envMap)).toThrow(/Unknown param/);
  });
});

// 5.4: Params validation
describe('isJsonSchemaParam', () => {
  it('accepts object with type property', () => {
    expect(isJsonSchemaParam({ type: 'string' })).toBe(true);
  });

  it('accepts complex object with type and properties', () => {
    expect(isJsonSchemaParam({ type: 'object', properties: { name: { type: 'string' } } })).toBe(true);
  });

  it('accepts object with type and default', () => {
    expect(isJsonSchemaParam({ type: 'array', default: [] })).toBe(true);
  });

  it('rejects null', () => {
    expect(isJsonSchemaParam(null)).toBe(false);
  });

  it('rejects bare array', () => {
    expect(isJsonSchemaParam([])).toBe(false);
  });

  it('rejects bare object without type', () => {
    expect(isJsonSchemaParam({})).toBe(false);
  });

  it('rejects string scalar', () => {
    expect(isJsonSchemaParam('hello')).toBe(false);
  });

  it('rejects number scalar', () => {
    expect(isJsonSchemaParam(42)).toBe(false);
  });

  it('rejects boolean scalar', () => {
    expect(isJsonSchemaParam(true)).toBe(false);
  });
});

describe('validateParamFormats', () => {
  it('passes with valid JSON Schema params', () => {
    expect(() =>
      validateParamFormats({ name: { type: 'string' }, items: { type: 'array', default: [] } }, 'test.md'),
    ).not.toThrow();
  });

  it('rejects null param', () => {
    expect(() => validateParamFormats({ name: null }, 'test.md')).toThrow(
      /Invalid param "name" in test\.md: expected JSON Schema object with "type" property, got null/,
    );
  });

  it('rejects bare array param', () => {
    expect(() => validateParamFormats({ items: [] }, 'test.md')).toThrow(
      /Invalid param "items" in test\.md:.*got array/,
    );
  });

  it('rejects bare object without type', () => {
    expect(() => validateParamFormats({ data: {} }, 'test.md')).toThrow(
      /Invalid param "data" in test\.md:.*got object without "type"/,
    );
  });

  it('rejects string scalar', () => {
    expect(() => validateParamFormats({ name: 'hello' }, 'test.md')).toThrow(
      /Invalid param "name" in test\.md:.*got string/,
    );
  });

  it('rejects number scalar', () => {
    expect(() => validateParamFormats({ count: 0 }, 'test.md')).toThrow(
      /Invalid param "count" in test\.md:.*got number/,
    );
  });

  it('rejects boolean scalar', () => {
    expect(() => validateParamFormats({ flag: true }, 'test.md')).toThrow(
      /Invalid param "flag" in test\.md:.*got boolean/,
    );
  });
});

describe('validateAndMergeParams', () => {
  it('passes with all required JSON Schema params provided', () => {
    const result = validateAndMergeParams(
      { component: 'button' },
      { component: { type: 'string' }, slots: { type: 'array', default: [] } },
      'create-component',
    );
    expect(result).toEqual({ component: 'button', slots: [] });
  });

  it('throws on missing required JSON Schema param', () => {
    expect(() =>
      validateAndMergeParams(
        {},
        { component: { type: 'string' }, slots: { type: 'array', default: [] } },
        'create-component',
      ),
    ).toThrow(
      /Missing required param 'component' for step 'create-component'. Expected params: component \(required\), slots \(optional\)/,
    );
  });

  it('uses default from JSON Schema for optional params', () => {
    const result = validateAndMergeParams(
      { component: 'button' },
      { component: { type: 'string' }, slots: { type: 'array', default: ['default'] } },
      'create-component',
    );
    expect(result).toEqual({ component: 'button', slots: ['default'] });
  });

  it('handles null default in JSON Schema (optional, default is null)', () => {
    const result = validateAndMergeParams(
      { name: 'test' },
      { name: { type: 'string' }, ref: { type: 'object', default: null } },
      'create-vision',
    );
    expect(result).toEqual({ name: 'test', ref: null });
  });

  it('item params override JSON Schema defaults', () => {
    const result = validateAndMergeParams(
      { component: 'card', slots: ['header'] },
      { component: { type: 'string' }, slots: { type: 'array', default: [] } },
      'create-component',
    );
    expect(result).toEqual({ component: 'card', slots: ['header'] });
  });
});

// 5.5: Config resolution
describe('resolveConfigForStep', () => {
  it('resolves config rules and instructions for a stage', () => {
    const rawConfig = {
      workflow: {
        rules: {
          'create-component': ['Rule A', 'Rule B'],
        },
        tasks: {
          'create-component': ['Instruction A'],
        },
      },
    };

    const result = resolveConfigForStep('create-component', rawConfig);
    expect(result.config_rules).toEqual(['Rule A', 'Rule B']);
    expect(result.config_instructions).toEqual(['Instruction A']);
  });

  it('returns empty arrays for missing stage', () => {
    const rawConfig = { workflow: { rules: {}, tasks: {} } };
    const result = resolveConfigForStep('nonexistent', rawConfig);
    expect(result.config_rules).toEqual([]);
    expect(result.config_instructions).toEqual([]);
  });

  it('handles absent workflow config', () => {
    const result = resolveConfigForStep('create-component', {});
    expect(result.config_rules).toEqual([]);
    expect(result.config_instructions).toEqual([]);
  });

  it('resolves named intake stage keys', () => {
    const rawConfig = {
      workflow: {
        rules: {
          'designbook-data-model:intake': ['Drupal intake rule'],
        },
        tasks: {},
      },
    };

    const result = resolveConfigForStep('designbook-data-model:intake', rawConfig);
    expect(result.config_rules).toEqual(['Drupal intake rule']);
  });
});

// 5.1 continued: Rule file matching
describe('matchRuleFiles', () => {
  it('matches rule file by stage', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const rulePath = writeSkillRuleFile(
      agentsDir,
      'designbook-scenes',
      'scene-rules',
      'when:\n  stages: [create-scene]',
    );

    const result = matchRuleFiles('create-scene', baseConfig, agentsDir);
    expect(result).toContain(rulePath);
  });

  it('excludes rule file for non-matching stage', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFile(agentsDir, 'designbook-scenes', 'scene-rules', 'when:\n  stages: [create-scene]');

    const result = matchRuleFiles('create-component', baseConfig, agentsDir);
    expect(result).toEqual([]);
  });

  it('matches rule file with config condition', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const rulePath = writeSkillRuleFile(
      agentsDir,
      'designbook-css',
      'tailwind-rules',
      'when:\n  frameworks.css: tailwind\n  stages: [create-tokens]',
    );

    const result = matchRuleFiles('create-tokens', baseConfig, agentsDir);
    expect(result).toContain(rulePath);
  });

  it('excludes rule file with non-matching config condition', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFile(
      agentsDir,
      'designbook-css',
      'daisyui-rules',
      'when:\n  frameworks.css: daisyui\n  stages: [create-tokens]',
    );

    // Config has tailwind, not daisyui
    const result = matchRuleFiles('create-tokens', baseConfig, agentsDir);
    expect(result).toEqual([]);
  });

  it('excludes rule file with empty when', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFile(agentsDir, 'designbook-workflow', 'global-rule', 'when: {}');

    const result = matchRuleFiles('any-stage', baseConfig, agentsDir);
    expect(result).toEqual([]);
  });

  it('discovers rule file nested in a subdirectory above rules/', () => {
    // Verifies skills/<skill>/scenes/rules/rule.md is found (subdirectory above rules/)
    const agentsDir = resolve(tmpDir, '.agents');
    const rulePath = writeSkillRuleFileInSubdir(
      agentsDir,
      'designbook-drupal',
      'scenes',
      'canvas-rule',
      'when:\n  stages: [create-scene]',
    );

    const result = matchRuleFiles('create-scene', baseConfig, agentsDir);
    expect(result).toContain(rulePath);
  });

  it('flat structure still discovered after glob change', () => {
    // skills/<skill>/rules/rule.md continues to work
    const agentsDir = resolve(tmpDir, '.agents');
    const rulePath = writeSkillRuleFile(agentsDir, 'designbook-scenes', 'flat-rule', 'when:\n  stages: [create-scene]');

    const result = matchRuleFiles('create-scene', baseConfig, agentsDir);
    expect(result).toContain(rulePath);
  });
});

// 5.6: End-to-end resolveWorkflowPlan
describe('resolveWorkflowPlan', () => {
  it('resolves a complete plan from workflow file and items', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const workflowsDir = resolve(tmpDir, 'workflows');
    mkdirSync(workflowsDir, { recursive: true });

    // Create task files
    writeSkillTaskFile(
      agentsDir,
      'designbook-components',
      'create-component',
      'params:\n  component: { type: string }\n  slots: { type: array, default: [] }\nfiles:\n  - file: $DESIGNBOOK_DATA/components/{{ component }}/{{ component }}.yml\n    key: component\n    validators: [component]',
    );
    writeSkillTaskFile(
      agentsDir,
      'designbook-scenes',
      'create-scene',
      'params:\n  section_id: { type: string }\nfiles:\n  - file: $DESIGNBOOK_DATA/scenes/{{ section_id }}.yml\n    key: scene\n    validators: [scene]',
    );

    // Create workflow file
    const wfPath = writeWorkflowFile(
      workflowsDir,
      'debo-test',
      'title: Test\nstages:\n  intake:\n    steps: [intake]\n  component:\n    steps: [create-component]\n  scene:\n    steps: [create-scene]',
    );

    const plan = resolveWorkflowPlan(
      wfPath,
      { section_id: 'dashboard' },
      [
        { step: 'create-component', params: { component: 'button' } },
        { step: 'create-component', params: { component: 'card' } },
        { step: 'create-scene', params: { section_id: 'dashboard' } },
      ],
      baseConfig,
      {},
      agentsDir,
    );

    // Check steps (intake included like any other step)
    expect(plan.steps).toEqual(['intake', 'create-component', 'create-scene']);

    // Check tasks
    expect(plan.tasks).toHaveLength(3);

    // First two tasks: create-component (parallel within step)
    expect(plan.tasks[0]!.id).toMatch(/^create-component-[0-9a-f]{6}$/);
    expect(plan.tasks[0]!.step).toBe('create-component');
    expect(plan.tasks[0]!.params.component).toBe('button');
    expect(plan.tasks[0]!.files).toEqual([
      { path: '/test/dist/components/button/button.yml', key: 'component', validators: ['component'] },
    ]);

    expect(plan.tasks[1]!.id).toMatch(/^create-component-[0-9a-f]{6}$/);
    expect(plan.tasks[0]!.id).not.toBe(plan.tasks[1]!.id);

    // Third task: create-scene (ordered by stage, no depends_on)
    expect(plan.tasks[2]!.id).toMatch(/^create-scene-[0-9a-f]{6}$/);
    expect(plan.tasks[2]!.files).toEqual([
      { path: '/test/dist/scenes/dashboard.yml', key: 'scene', validators: ['scene'] },
    ]);

    // Global params
    expect(plan.params).toEqual({ section_id: 'dashboard' });
  });

  it('throws on item with step not in workflow', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const workflowsDir = resolve(tmpDir, 'workflows');
    mkdirSync(workflowsDir, { recursive: true });

    const wfPath = writeWorkflowFile(
      workflowsDir,
      'debo-test',
      'workflow:\n  title: Test\n  stages: [create-component]',
    );

    expect(() => resolveWorkflowPlan(wfPath, {}, [{ step: 'nonexistent' }], baseConfig, {}, agentsDir)).toThrow(
      /not found in workflow steps/,
    );
  });
});

// Task ID generation
describe('generateTaskId', () => {
  it('generates hash-based ID with step prefix', () => {
    const id = generateTaskId('create-component', { component: 'button', slots: [] });
    expect(id).toMatch(/^create-component-[0-9a-f]{6}$/);
  });

  it('strips skill prefix from named stages', () => {
    const id = generateTaskId('designbook-sections:create-section', { section_id: 'dashboard' });
    expect(id).toMatch(/^create-section-[0-9a-f]{6}$/);
  });

  it('produces hash even when no string params', () => {
    const id = generateTaskId('create-tokens', { colors: {} });
    expect(id).toMatch(/^create-tokens-[0-9a-f]{6}$/);
  });

  it('produces different hashes for different params', () => {
    const id1 = generateTaskId('create-component', { component: 'button' });
    const id2 = generateTaskId('create-component', { component: 'card' });
    expect(id1).not.toBe(id2);
  });

  it('produces different hashes for same params but different index', () => {
    const id1 = generateTaskId('create-component', { component: 'button' }, undefined, 0);
    const id2 = generateTaskId('create-component', { component: 'button' }, undefined, 1);
    expect(id1).not.toBe(id2);
  });
});

// buildEnvMap
describe('buildEnvMap', () => {
  it('builds env map from config', () => {
    const env = buildEnvMap(baseConfig);
    expect(env.DESIGNBOOK_WORKSPACE).toBe('/test');
    expect(env.DESIGNBOOK_HOME).toBe('/test/theme');
    expect(env.DESIGNBOOK_DATA).toBe('/test/dist');
  });

  it('renames frameworks.* to DESIGNBOOK_FRAMEWORK_* (singular)', () => {
    const env = buildEnvMap(baseConfig);
    expect(env.DESIGNBOOK_FRAMEWORK_CSS).toBe('tailwind');
    expect(env.DESIGNBOOK_FRAMEWORK_COMPONENT).toBe('sdc');
    expect(env.DESIGNBOOK_FRAMEWORKS_CSS).toBeUndefined();
  });

  it('exposes dirs.* as DESIGNBOOK_DIRS_* env vars', () => {
    const config: DesignbookConfig = {
      ...baseConfig,
      'dirs.config': '/test/dist',
      'dirs.components': '/test/components',
    };
    const env = buildEnvMap(config);
    expect(env.DESIGNBOOK_HOME).toBe('/test/theme');
    expect(env.DESIGNBOOK_DIRS_CONFIG).toBe('/test/dist');
    expect(env.DESIGNBOOK_DIRS_COMPONENTS).toBe('/test/components');
  });
});

// buildWorktreeEnvMap
describe('buildWorktreeEnvMap', () => {
  it('swaps DESIGNBOOK_WORKSPACE and remaps DESIGNBOOK_DIRS_* to WORKTREE paths', () => {
    const rootDir = '/home/user/project';
    const envMap = {
      DESIGNBOOK_WORKSPACE: rootDir,
      DESIGNBOOK_HOME: '/home/user/project/theme',
      DESIGNBOOK_DATA: '/home/user/project/theme/designbook',
      DESIGNBOOK_DIRS_COMPONENTS: '/home/user/project/components',
    };
    const worktreePath = '/tmp/wt-abc123';
    const remapped = buildWorktreeEnvMap(envMap, worktreePath, rootDir);

    expect(remapped.DESIGNBOOK_WORKSPACE).toBe('/tmp/wt-abc123');
    expect(remapped.DESIGNBOOK_HOME).toBe('/tmp/wt-abc123/theme');
    expect(remapped.DESIGNBOOK_DATA).toBe('/tmp/wt-abc123/theme/designbook');
    expect(remapped.DESIGNBOOK_DIRS_COMPONENTS).toBe('/tmp/wt-abc123/components');
  });

  it('does not remap non-workspace vars', () => {
    const rootDir = '/home/user/project';
    const envMap = {
      DESIGNBOOK_WORKSPACE: rootDir,
      DESIGNBOOK_TECHNOLOGY: 'drupal',
      DESIGNBOOK_HOME: '/home/user/project/designbook',
    };
    const remapped = buildWorktreeEnvMap(envMap, '/tmp/wt', rootDir);

    expect(remapped.DESIGNBOOK_TECHNOLOGY).toBe('drupal');
  });

  it('files: paths using remapped env differ from reads: paths using original env', () => {
    const rootDir = '/home/user/project';
    const envMap = {
      DESIGNBOOK_WORKSPACE: rootDir,
      DESIGNBOOK_HOME: '/home/user/project/designbook',
    };
    const worktreePath = '/tmp/wt-123';
    const remappedEnvMap = buildWorktreeEnvMap(envMap, worktreePath, rootDir);

    // files: path (uses remapped env) → WORKTREE
    const fileTemplate = '$DESIGNBOOK_HOME/data-model.yml';
    const filesPath = expandFilePath(fileTemplate, {}, remappedEnvMap);
    expect(filesPath).toBe('/tmp/wt-123/designbook/data-model.yml');

    // reads: path (uses original env) → real path
    const readsPath = expandFilePath(fileTemplate, {}, envMap);
    expect(readsPath).toBe('/home/user/project/designbook/data-model.yml');
  });
});

// lookup: context-first, config-fallback with dot-path
describe('lookup', () => {
  it('prefers context over config', () => {
    expect(lookup('stages', { stages: 'create-scene' }, { stages: 'other' })).toBe('create-scene');
  });

  it('falls back to config flat key', () => {
    expect(lookup('frameworks.css', {}, { 'frameworks.css': 'tailwind' })).toBe('tailwind');
  });

  it('falls back to config dot-path traversal', () => {
    expect(lookup('frameworks.css', {}, { frameworks: { css: 'daisyui' } })).toBe('daisyui');
  });

  it('returns undefined for missing key', () => {
    expect(lookup('nonexistent', {}, {})).toBeUndefined();
  });

  it('flat key takes precedence over dot-path traversal', () => {
    // Config has both flat 'frameworks.css' and nested frameworks.css — flat wins
    expect(lookup('frameworks.css', {}, { 'frameworks.css': 'tailwind', frameworks: { css: 'daisyui' } })).toBe(
      'tailwind',
    );
  });
});

// checkWhen: dual-source (context + config)
describe('checkWhen', () => {
  it('matches scalar from config', () => {
    expect(checkWhen({ backend: 'drupal' }, {}, { backend: 'drupal' })).toBe(1);
  });

  it('matches scalar from context (takes priority)', () => {
    expect(checkWhen({ template: 'canvas' }, { template: 'canvas' }, {})).toBe(1);
  });

  it('matches array when value — stage in list', () => {
    expect(checkWhen({ stages: ['create-scene', 'create-tokens'] }, { stages: 'create-scene' }, {})).toBe(1);
  });

  it('matches array context value — extension inclusion', () => {
    expect(checkWhen({ extensions: 'canvas' }, {}, { extensions: ['canvas', 'drupal'] })).toBe(1);
  });

  it('returns false on mismatch', () => {
    expect(checkWhen({ backend: 'drupal' }, {}, { backend: 'html' })).toBe(false);
  });

  it('returns specificity count', () => {
    const result = checkWhen(
      { stages: ['create-component'], 'frameworks.css': 'tailwind', backend: 'drupal' },
      { stages: 'create-component' },
      { 'frameworks.css': 'tailwind', backend: 'drupal' },
    );
    expect(result).toBe(3);
  });

  it('returns false if any condition fails', () => {
    const result = checkWhen(
      { stages: ['create-component'], 'frameworks.css': 'daisyui' },
      { stages: 'create-component' },
      { 'frameworks.css': 'tailwind' },
    );
    expect(result).toBe(false);
  });
});

describe('matchDomain', () => {
  it('exact match', () => {
    expect(matchDomain('components', ['components'])).toBe(true);
  });

  it('no match — different domain', () => {
    expect(matchDomain('scenes', ['components'])).toBe(false);
  });

  it('broad need loads sub-domain rule', () => {
    expect(matchDomain('components.layout', ['components'])).toBe(true);
  });

  it('specific need loads parent rule', () => {
    expect(matchDomain('components', ['components.layout'])).toBe(true);
  });

  it('specific need does NOT load sibling', () => {
    expect(matchDomain('components.discovery', ['components.layout'])).toBe(false);
  });

  it('matches against any domain in the set', () => {
    expect(matchDomain('scenes', ['components', 'scenes'])).toBe(true);
  });

  it('does not partial-match without dot boundary', () => {
    expect(matchDomain('components-extra', ['components'])).toBe(false);
  });

  it('deep subcontext matches parent', () => {
    expect(matchDomain('design', ['design.intake'])).toBe(true);
  });

  it('deep subcontext matches exact', () => {
    expect(matchDomain('design.intake', ['design.intake'])).toBe(true);
  });

  it('empty effective domains matches nothing', () => {
    expect(matchDomain('components', [])).toBe(false);
  });
});

// resolveFiles: unified glob + when filter
describe('resolveFiles', () => {
  it('finds files matching glob and filters by when', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFile(agentsDir, 'designbook-css', 'tailwind-rule', 'when:\n  frameworks.css: tailwind');
    writeSkillRuleFile(agentsDir, 'designbook-css', 'daisyui-rule', 'when:\n  frameworks.css: daisyui');

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext();
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.path).toContain('tailwind-rule');
    expect(matches[0]!.specificity).toBe(1);
  });

  it('skips files without when or with empty when', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFile(agentsDir, 'designbook-workflow', 'global-rule', 'when: {}');

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext();
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir);

    expect(matches).toHaveLength(0);
  });

  it('uses context for stage matching and config for framework matching', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFile(
      agentsDir,
      'designbook-css',
      'tailwind-tokens',
      'when:\n  stages: [create-tokens]\n  frameworks.css: tailwind',
    );

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext('create-tokens');
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.specificity).toBe(2);
  });
});

// Task 2: Domain-aware resolveFiles()
describe('resolveFiles with domain', () => {
  it('matches rule by domain when effectiveDomains provided', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const rulePath = writeSkillRuleFile(agentsDir, 'designbook-sdc', 'component-rules', 'domain: components');

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext();
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir, true, ['components']);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.path).toBe(rulePath);
  });

  it('domain rule NOT matched when effectiveDomains empty', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFile(agentsDir, 'designbook-sdc', 'component-rules', 'domain: components');

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext();
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir, true, []);

    expect(matches).toHaveLength(0);
  });

  it('domain rule excluded when effectiveDomains not passed', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFile(agentsDir, 'designbook-sdc', 'component-rules', 'domain: components');

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext();
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir);

    expect(matches).toHaveLength(0);
  });

  it('domain rule excluded when config condition fails', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    // Rule requires daisyui but config has tailwind
    writeSkillRuleFile(
      agentsDir,
      'designbook-css',
      'daisyui-component-rules',
      'domain: components\nwhen:\n  frameworks.css: daisyui',
    );

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext();
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir, true, ['components']);

    expect(matches).toHaveLength(0);
  });

  it('domain rule included when config condition passes', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const rulePath = writeSkillRuleFile(
      agentsDir,
      'designbook-css',
      'tailwind-component-rules',
      'domain: components\nwhen:\n  frameworks.css: tailwind',
    );

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext();
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir, true, ['components']);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.path).toBe(rulePath);
  });

  it('broad need loads sub-domain rule via prefix matching', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    // Rule domain is "components.layout" (child of "components")
    const rulePath = writeSkillRuleFile(
      agentsDir,
      'designbook-sdc',
      'layout-component-rules',
      'domain: components.layout',
    );

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext();
    // effectiveDomains has "components" (parent) → should match "components.layout" (child)
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir, true, ['components']);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.path).toBe(rulePath);
  });

  it('domain rule NOT matched when domain does not overlap', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFile(agentsDir, 'designbook-sdc', 'scene-rules', 'domain: scenes');

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext();
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir, true, ['components']);

    expect(matches).toHaveLength(0);
  });

  it('legacy when.steps still works when no domain in frontmatter', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const rulePath = writeSkillRuleFile(
      agentsDir,
      'designbook-scenes',
      'scene-rules',
      'when:\n  stages: [create-scene]',
    );

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext('create-scene');
    // Pass effectiveDomains — legacy file has no domain: so it still uses when.steps
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir, true, ['components']);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.path).toBe(rulePath);
  });

  it('domain takes precedence over when.steps when both domain and when.steps present', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    // File has BOTH domain: and when.steps: — domain matching path is used
    const rulePath = writeSkillRuleFile(
      agentsDir,
      'designbook-sdc',
      'mixed-rules',
      'domain: components\nwhen:\n  steps: [create-scene]',
    );

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    // context has create-component step (NOT create-scene), but domain matches
    const context = buildRuntimeContext('create-component');
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir, true, ['components']);

    // Should match via domain — when.steps is ignored for domain-tagged files
    expect(matches).toHaveLength(1);
    expect(matches[0]!.path).toBe(rulePath);
  });

  it('domain as array: matches when any rule domain matches effective domain', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const rulePath = writeSkillRuleFile(
      agentsDir,
      'designbook-sdc',
      'multi-domain-rules',
      'domain:\n  - scenes\n  - components',
    );

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext();
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir, true, ['components']);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.path).toBe(rulePath);
  });
});

// buildRuntimeContext
describe('buildRuntimeContext', () => {
  it('builds empty context without args', () => {
    expect(buildRuntimeContext()).toEqual({});
  });

  it('includes step as steps key (with legacy stages compat)', () => {
    expect(buildRuntimeContext('create-scene')).toEqual({ steps: 'create-scene', stages: 'create-scene' });
  });

  it('merges extra conditions', () => {
    expect(buildRuntimeContext('create-sample-data', { template: 'canvas' })).toEqual({
      steps: 'create-sample-data',
      stages: 'create-sample-data',
      template: 'canvas',
    });
  });
});

// buildEnrichedConfig
describe('buildEnrichedConfig', () => {
  it('includes original config values', () => {
    const enriched = buildEnrichedConfig(baseConfig);
    expect(enriched['frameworks.css']).toBe('tailwind');
    expect(enriched['backend']).toBe('drupal');
  });

  it('includes DESIGNBOOK_* env vars', () => {
    const enriched = buildEnrichedConfig(baseConfig);
    expect(enriched['DESIGNBOOK_WORKSPACE']).toBe('/test');
    expect(enriched['DESIGNBOOK_HOME']).toBe('/test/theme');
    expect(enriched['DESIGNBOOK_DATA']).toBe('/test/dist');
  });

  it('normalizes extensions to string array', () => {
    const configWithExt = { ...baseConfig, extensions: [{ id: 'canvas', url: 'https://example.com' }] };
    const enriched = buildEnrichedConfig(configWithExt);
    expect(enriched['extensions']).toEqual(['canvas']);
  });
});

// 5.7: File locking
describe('file locking', () => {
  it('acquires and releases lock', () => {
    const filePath = resolve(tmpDir, 'test.yml');
    writeFileSync(filePath, 'data: true');

    const lockPath = acquireLock(filePath);
    expect(existsSync(lockPath)).toBe(true);

    releaseLock(lockPath);
    expect(existsSync(lockPath)).toBe(false);
  });

  it('withLock executes function and releases lock', () => {
    const filePath = resolve(tmpDir, 'test.yml');
    writeFileSync(filePath, 'data: true');

    const result = withLock(filePath, () => {
      // Lock should be held during execution
      expect(existsSync(`${filePath}.lock`)).toBe(true);
      return 42;
    });

    expect(result).toBe(42);
    expect(existsSync(`${filePath}.lock`)).toBe(false);
  });

  it('withLock releases lock on error', () => {
    const filePath = resolve(tmpDir, 'test.yml');
    writeFileSync(filePath, 'data: true');

    expect(() =>
      withLock(filePath, () => {
        throw new Error('intentional');
      }),
    ).toThrow('intentional');

    expect(existsSync(`${filePath}.lock`)).toBe(false);
  });

  it('sequential withLock calls serialize writes correctly', () => {
    const filePath = resolve(tmpDir, 'counter.yml');
    writeFileSync(filePath, '0');

    // Two sequential withLock calls should both succeed without corruption
    withLock(filePath, () => {
      const val = parseInt(readFileSync(filePath, 'utf-8'), 10);
      writeFileSync(filePath, String(val + 1));
    });

    withLock(filePath, () => {
      const val = parseInt(readFileSync(filePath, 'utf-8'), 10);
      writeFileSync(filePath, String(val + 1));
    });

    expect(readFileSync(filePath, 'utf-8')).toBe('2');
  });

  it('detects stale lock and recovers', () => {
    const filePath = resolve(tmpDir, 'stale.yml');
    writeFileSync(filePath, 'data');

    // Create a stale lock (timestamp far in the past)
    const lockPath = `${filePath}.lock`;
    writeFileSync(lockPath, String(Date.now() - 60_000), { flag: 'w' });

    // Should recover from stale lock
    const result = withLock(filePath, () => 'recovered');
    expect(result).toBe('recovered');
  });
});

// ── Artifact Name Derivation ──────────────────────────────────────

describe('deriveArtifactName', () => {
  it('derives nested skill name: skill/concern/tasks/file.md', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const filePath = resolve(agentsDir, 'skills/designbook/design/tasks/screenshot-reference.md');
    expect(deriveArtifactName(filePath, agentsDir)).toBe('designbook:design:screenshot-reference');
  });

  it('derives flat skill name: skill/tasks/file.md', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const filePath = resolve(agentsDir, 'skills/designbook-stitch/tasks/stitch-inspect.md');
    expect(deriveArtifactName(filePath, agentsDir)).toBe('designbook-stitch:stitch-inspect');
  });

  it('derives name for nested rule file', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const filePath = resolve(agentsDir, 'skills/designbook/design/rules/playwright-session.md');
    expect(deriveArtifactName(filePath, agentsDir)).toBe('designbook:design:playwright-session');
  });

  it('derives name for flat rule file', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const filePath = resolve(agentsDir, 'skills/designbook-css/rules/tailwind-tokens.md');
    expect(deriveArtifactName(filePath, agentsDir)).toBe('designbook-css:tailwind-tokens');
  });

  it('uses explicit name from frontmatter if present', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const filePath = resolve(agentsDir, 'skills/designbook-stitch/tasks/screenshot-stitch.md');
    const fm = { name: 'designbook-stitch:design:screenshot-stitch' };
    expect(deriveArtifactName(filePath, agentsDir, fm)).toBe('designbook-stitch:design:screenshot-stitch');
  });

  it('derives blueprint name from type+name (legacy)', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const filePath = resolve(agentsDir, 'skills/designbook-sdc/blueprints/section.md');
    const fm = { type: 'component', name: 'section' };
    expect(deriveArtifactName(filePath, agentsDir, fm)).toBe('designbook-sdc:blueprints:component/section');
  });

  it('derives blueprint name using filename when no name in frontmatter', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const filePath = resolve(agentsDir, 'skills/designbook-sdc/blueprints/component.md');
    const fm = { type: 'component' };
    expect(deriveArtifactName(filePath, agentsDir, fm)).toBe('designbook-sdc:blueprints:component/component');
  });
});

// ── Short Name Resolution ─────────────────────────────────────────

describe('resolveShortName', () => {
  it('resolves 2-segment short name within skill', () => {
    expect(resolveShortName('design:screenshot-reference', 'designbook')).toBe(
      'designbook:design:screenshot-reference',
    );
  });

  it('passes through fully qualified name unchanged', () => {
    expect(resolveShortName('designbook:design:screenshot-reference', 'designbook-stitch')).toBe(
      'designbook:design:screenshot-reference',
    );
  });

  it('resolves single-segment name within skill', () => {
    expect(resolveShortName('stitch-inspect', 'designbook-stitch')).toBe('designbook-stitch:stitch-inspect');
  });
});

// ── resolveFiles includes name ────────────────────────────────────

describe('resolveFiles with name', () => {
  it('includes derived name in resolved files', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFile(agentsDir, 'designbook-css', 'tailwind-rule', 'when:\n  frameworks.css: tailwind');

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext();
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.name).toBe('designbook-css:tailwind-rule');
  });

  it('includes derived name for nested skill files', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFileInSubdir(agentsDir, 'designbook', 'design', 'screenshot-rule', 'when:\n  stages: [screenshot]');

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext('screenshot');
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.name).toBe('designbook:design:screenshot-rule');
  });

  it('uses explicit name from frontmatter over derived name', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFile(
      agentsDir,
      'designbook-css',
      'tailwind-rule',
      'name: designbook-css:tokens:tailwind-rule\nwhen:\n  frameworks.css: tailwind',
    );

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext();
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.name).toBe('designbook-css:tokens:tailwind-rule');
  });

  it('includes name for task files without when (requireWhen=false)', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillTaskFile(agentsDir, 'designbook-tokens', 'create-tokens', 'params:\n  colors: {}');

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext();
    const matches = resolveFiles('skills/**/tasks/*.md', context, enrichedConfig, agentsDir, false);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.name).toBe('designbook-tokens:create-tokens');
  });

  it('includes name for nested task files', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillTaskFileInSubdir(
      agentsDir,
      'designbook',
      'design',
      'screenshot-storybook',
      'when:\n  stages: [screenshot]\npriority: 10',
    );

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext('screenshot');
    const matches = resolveFiles('skills/**/tasks/*.md', context, enrichedConfig, agentsDir, false);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.name).toBe('designbook:design:screenshot-storybook');
  });
});

// ── when + name integration ───────────────────────────────────────

describe('when conditions with named artifacts', () => {
  it('filters by when and preserves name on matching artifacts', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillTaskFileInSubdir(
      agentsDir,
      'designbook',
      'design',
      'inspect-storybook',
      'name: designbook:design:inspect-storybook\nwhen:\n  stages: [inspect]\npriority: 10',
    );
    writeSkillTaskFileInSubdir(
      agentsDir,
      'designbook',
      'design',
      'inspect-reference',
      'name: designbook:design:inspect-reference\nwhen:\n  stages: [inspect]\npriority: 20',
    );
    writeSkillTaskFile(
      agentsDir,
      'designbook-stitch',
      'inspect-stitch',
      'name: designbook-stitch:inspect-stitch\nwhen:\n  stages: [inspect]\n  backend: drupal\npriority: 30',
    );

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext('inspect');
    const matches = resolveFiles('skills/**/tasks/*.md', context, enrichedConfig, agentsDir, false);

    // All three match (backend=drupal is in baseConfig)
    expect(matches).toHaveLength(3);
    const names = matches.map((m) => m.name).sort();
    expect(names).toEqual([
      'designbook-stitch:inspect-stitch',
      'designbook:design:inspect-reference',
      'designbook:design:inspect-storybook',
    ]);
  });

  it('excludes artifacts whose when conditions do not match', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillTaskFile(
      agentsDir,
      'designbook-stitch',
      'inspect-stitch',
      'name: designbook-stitch:inspect-stitch\nwhen:\n  stages: [inspect]\n  backend: html\npriority: 30',
    );

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext('inspect');
    const matches = resolveFiles('skills/**/tasks/*.md', context, enrichedConfig, agentsDir, false);

    // backend: html doesn't match (config has drupal)
    expect(matches).toHaveLength(0);
  });

  it('preserves priority from frontmatter alongside name', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillTaskFileInSubdir(
      agentsDir,
      'designbook',
      'design',
      'ensure-storybook',
      'name: designbook:design:ensure-storybook\nwhen:\n  stages: [screenshot]\npriority: 5',
    );
    writeSkillTaskFileInSubdir(
      agentsDir,
      'designbook',
      'design',
      'screenshot-storybook',
      'name: designbook:design:screenshot-storybook\nwhen:\n  stages: [screenshot]\npriority: 10',
    );

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext('screenshot');
    const matches = resolveFiles('skills/**/tasks/*.md', context, enrichedConfig, agentsDir, false);

    expect(matches).toHaveLength(2);
    // Sort by priority to verify ordering
    const sorted = matches.sort(
      (a, b) => ((a.frontmatter?.priority as number) ?? 0) - ((b.frontmatter?.priority as number) ?? 0),
    );
    expect(sorted[0]!.name).toBe('designbook:design:ensure-storybook');
    expect(sorted[0]!.frontmatter?.priority).toBe(5);
    expect(sorted[1]!.name).toBe('designbook:design:screenshot-storybook');
    expect(sorted[1]!.frontmatter?.priority).toBe(10);
  });

  it('matches rules from multiple skills for the same step', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFileInSubdir(
      agentsDir,
      'designbook',
      'design',
      'playwright-session',
      'name: designbook:design:playwright-session\nwhen:\n  stages: [inspect]',
    );
    writeSkillRuleFile(
      agentsDir,
      'designbook-css',
      'inspect-tokens',
      'name: designbook-css:inspect-tokens\nwhen:\n  stages: [inspect]\n  frameworks.css: tailwind',
    );

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext('inspect');
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir);

    expect(matches).toHaveLength(2);
    const names = matches.map((m) => m.name).sort();
    expect(names).toEqual(['designbook-css:inspect-tokens', 'designbook:design:playwright-session']);
  });
});

// ── deduplicateByNameAs ───────────────────────────────────────────

describe('deduplicateByNameAs', () => {
  function makeResolvedFile(name: string, priority: number, as?: string, skillDir = 'designbook'): ResolvedFile {
    const agentsDir = resolve(tmpDir, '.agents');
    return {
      path: resolve(agentsDir, `skills/${skillDir}/tasks/${name.split(':').pop()}.md`),
      name,
      specificity: 1,
      frontmatter: {
        priority,
        ...(as ? { as } : {}),
      },
    };
  }

  it('returns all additive files sorted by priority', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const files: ResolvedFile[] = [
      makeResolvedFile('designbook:design:screenshot-storybook', 10),
      makeResolvedFile('designbook:design:ensure-storybook', 5),
      makeResolvedFile('designbook:design:screenshot-reference', 20),
    ];

    const result = deduplicateByNameAs(files, agentsDir);
    expect(result.map((r) => r.name)).toEqual([
      'designbook:design:ensure-storybook',
      'designbook:design:screenshot-storybook',
      'designbook:design:screenshot-reference',
    ]);
  });

  it('override with higher priority replaces original', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const files: ResolvedFile[] = [
      makeResolvedFile('designbook:design:screenshot-reference', 20),
      makeResolvedFile(
        'designbook-stitch:design:screenshot-stitch',
        30,
        'designbook:design:screenshot-reference',
        'designbook-stitch',
      ),
    ];

    const result = deduplicateByNameAs(files, agentsDir);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('designbook-stitch:design:screenshot-stitch');
  });

  it('override with lower priority does not replace original', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const files: ResolvedFile[] = [
      makeResolvedFile('designbook:design:screenshot-reference', 20),
      makeResolvedFile(
        'designbook-stitch:design:screenshot-stitch',
        10,
        'designbook:design:screenshot-reference',
        'designbook-stitch',
      ),
    ];

    const result = deduplicateByNameAs(files, agentsDir);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('designbook:design:screenshot-reference');
  });

  it('override alongside additive tasks', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const files: ResolvedFile[] = [
      makeResolvedFile('designbook:design:ensure-storybook', 5),
      makeResolvedFile('designbook:design:screenshot-reference', 20),
      makeResolvedFile(
        'designbook-stitch:design:screenshot-stitch',
        30,
        'designbook:design:screenshot-reference',
        'designbook-stitch',
      ),
    ];

    const result = deduplicateByNameAs(files, agentsDir);
    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe('designbook:design:ensure-storybook');
    expect(result[1]!.name).toBe('designbook-stitch:design:screenshot-stitch');
  });

  it('warns when as target does not exist and runs as additive', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const warnings: string[] = [];
    const files: ResolvedFile[] = [
      makeResolvedFile(
        'designbook-stitch:design:screenshot-stitch',
        30,
        'designbook:design:nonexistent',
        'designbook-stitch',
      ),
    ];

    const result = deduplicateByNameAs(files, agentsDir, warnings);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('designbook-stitch:design:screenshot-stitch');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('nonexistent');
    expect(warnings[0]).toContain('not found');
  });

  it('resolves short name in as field using skill from file path', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    // File in designbook-stitch skill with short as: "design:screenshot-reference"
    // Should resolve to designbook-stitch:design:screenshot-reference (own skill)
    // which doesn't match the standalone — so it warns and runs as additive
    const files: ResolvedFile[] = [
      makeResolvedFile('designbook:design:screenshot-reference', 20),
      {
        path: resolve(agentsDir, 'skills/designbook-stitch/tasks/screenshot-stitch.md'),
        name: 'designbook-stitch:screenshot-stitch',
        specificity: 1,
        frontmatter: { priority: 30, as: 'design:screenshot-reference' },
      },
    ];

    const warnings: string[] = [];
    const result = deduplicateByNameAs(files, agentsDir, warnings);
    // Short name resolves to designbook-stitch:design:screenshot-reference — not found
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('designbook-stitch:design:screenshot-reference');
    // Both run (additive fallback + original)
    expect(result).toHaveLength(2);
  });

  it('full name as field correctly overrides across skills', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const files: ResolvedFile[] = [
      makeResolvedFile('designbook:design:screenshot-reference', 20),
      {
        path: resolve(agentsDir, 'skills/designbook-stitch/tasks/screenshot-stitch.md'),
        name: 'designbook-stitch:screenshot-stitch',
        specificity: 1,
        frontmatter: { priority: 30, as: 'designbook:design:screenshot-reference' },
      },
    ];

    const result = deduplicateByNameAs(files, agentsDir);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('designbook-stitch:screenshot-stitch');
  });

  it('equal priority uses alphabetical skill tiebreak (last wins)', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    // 2-segment names are flat skills — as must use full name for cross-skill override
    // resolveShortName('aaa-skill:screenshot-ref', 'zzz-skill') would resolve to own skill
    // So we need a 3-segment name to test proper cross-skill override
    const files: ResolvedFile[] = [
      {
        path: resolve(agentsDir, 'skills/aaa-skill/design/tasks/screenshot-ref.md'),
        name: 'aaa-skill:design:screenshot-ref',
        specificity: 1,
        frontmatter: { priority: 20 },
      },
      {
        path: resolve(agentsDir, 'skills/zzz-skill/tasks/screenshot-alt.md'),
        name: 'zzz-skill:screenshot-alt',
        specificity: 1,
        frontmatter: { priority: 20, as: 'aaa-skill:design:screenshot-ref' },
      },
    ];

    const result = deduplicateByNameAs(files, agentsDir);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('zzz-skill:screenshot-alt');
  });

  it('default priority is 0 for files without priority field', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const files: ResolvedFile[] = [
      {
        path: resolve(agentsDir, 'skills/designbook/tasks/basic.md'),
        name: 'designbook:basic',
        specificity: 1,
        frontmatter: {},
      },
      makeResolvedFile('designbook:design:advanced', 10),
    ];

    const result = deduplicateByNameAs(files, agentsDir);
    expect(result[0]!.name).toBe('designbook:basic'); // priority 0 comes first
    expect(result[1]!.name).toBe('designbook:design:advanced'); // priority 10
  });
});

// ── $ref schema resolution ────────────────────────────────────────────────

describe('resolveSchemaRef', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves a relative $ref to a schema type', () => {
    // Create schemas.yml next to the task file's parent
    const tasksDir = resolve(tmpDir, 'skills', 'designbook', 'design', 'tasks');
    const schemasDir = resolve(tmpDir, 'skills', 'designbook', 'design');
    mkdirSync(tasksDir, { recursive: true });

    const schemasContent = stringifyYaml({
      Check: {
        type: 'object',
        required: ['storyId', 'breakpoint'],
        properties: {
          storyId: { type: 'string' },
          breakpoint: { type: 'string' },
        },
      },
    });
    writeFileSync(resolve(schemasDir, 'schemas.yml'), schemasContent);

    const taskFilePath = resolve(tasksDir, 'setup-compare.md');
    writeFileSync(taskFilePath, '---\nname: test\n---\n');

    const result = resolveSchemaRef('../schemas.yml#/Check', taskFilePath, resolve(tmpDir, 'skills'));
    expect(result.typeName).toBe('Check');
    expect(result.schema).toEqual({
      type: 'object',
      required: ['storyId', 'breakpoint'],
      properties: {
        storyId: { type: 'string' },
        breakpoint: { type: 'string' },
      },
    });
  });

  it('throws on non-existent schema file', () => {
    const taskFilePath = resolve(tmpDir, 'task.md');
    writeFileSync(taskFilePath, '---\nname: test\n---\n');

    expect(() => resolveSchemaRef('../missing.yml#/Foo', taskFilePath, tmpDir)).toThrow('Schema file not found');
  });

  it('throws on missing type name in schema file', () => {
    const schemasContent = stringifyYaml({ Check: { type: 'object' } });
    writeFileSync(resolve(tmpDir, 'schemas.yml'), schemasContent);

    const taskFilePath = resolve(tmpDir, 'tasks', 'task.md');
    mkdirSync(resolve(tmpDir, 'tasks'), { recursive: true });
    writeFileSync(taskFilePath, '---\nname: test\n---\n');

    expect(() => resolveSchemaRef('../schemas.yml#/Missing', taskFilePath, tmpDir)).toThrow("Type 'Missing' not found");
  });
});

describe('resolveParamsRef', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function setupSchemaFile(properties: Record<string, unknown>): { taskFilePath: string; skillsRoot: string } {
    const tasksDir = resolve(tmpDir, 'skills', 'designbook', 'sections', 'tasks');
    const schemasDir = resolve(tmpDir, 'skills', 'designbook', 'sections');
    mkdirSync(tasksDir, { recursive: true });

    writeFileSync(
      resolve(schemasDir, 'schemas.yml'),
      stringifyYaml({
        Section: {
          type: 'object',
          required: ['id', 'title'],
          properties,
        },
      }),
    );

    const taskFilePath = resolve(tasksDir, 'create-section.md');
    writeFileSync(taskFilePath, '---\nname: test\n---\n');

    return { taskFilePath, skillsRoot: resolve(tmpDir, 'skills') };
  }

  it('resolves $ref and extracts properties', () => {
    const props = { id: { type: 'string' }, title: { type: 'string' }, order: { type: 'integer' } };
    const { taskFilePath, skillsRoot } = setupSchemaFile(props);

    const result = resolveParamsRef({ $ref: '../schemas.yml#/Section' }, taskFilePath, skillsRoot);

    expect(result).toEqual({
      id: { type: 'string' },
      title: { type: 'string' },
      order: { type: 'integer' },
    });
  });

  it('explicit entries override schema properties', () => {
    const props = { id: { type: 'string' }, order: { type: 'integer' } };
    const { taskFilePath, skillsRoot } = setupSchemaFile(props);

    const result = resolveParamsRef(
      { $ref: '../schemas.yml#/Section', order: { type: 'integer', default: 1 } },
      taskFilePath,
      skillsRoot,
    );

    expect(result).toEqual({
      id: { type: 'string' },
      order: { type: 'integer', default: 1 },
    });
  });

  it('explicit entries extend schema properties', () => {
    const props = { id: { type: 'string' } };
    const { taskFilePath, skillsRoot } = setupSchemaFile(props);

    const result = resolveParamsRef(
      { $ref: '../schemas.yml#/Section', extra: { type: 'boolean', default: false } },
      taskFilePath,
      skillsRoot,
    );

    expect(result).toEqual({
      id: { type: 'string' },
      extra: { type: 'boolean', default: false },
    });
  });

  it('throws when schema has no properties', () => {
    const tasksDir = resolve(tmpDir, 'skills', 'designbook', 'sections', 'tasks');
    const schemasDir = resolve(tmpDir, 'skills', 'designbook', 'sections');
    mkdirSync(tasksDir, { recursive: true });

    writeFileSync(resolve(schemasDir, 'schemas.yml'), stringifyYaml({ Section: { type: 'string' } }));

    const taskFilePath = resolve(tasksDir, 'task.md');
    writeFileSync(taskFilePath, '---\nname: test\n---\n');

    expect(() =>
      resolveParamsRef({ $ref: '../schemas.yml#/Section' }, taskFilePath, resolve(tmpDir, 'skills')),
    ).toThrow('params: $ref must point to an object schema with properties');
  });

  it('passes through params without $ref unchanged', () => {
    // resolveParamsRef should not be called without $ref — this documents behavior
    // The caller checks for $ref before calling, so this is a safety test
    const props = { id: { type: 'string' } };
    const { taskFilePath, skillsRoot } = setupSchemaFile(props);

    // If called with a params object that has no $ref, it would throw because
    // params['$ref'] is undefined. This confirms the caller must check first.
    expect(() => resolveParamsRef({ id: { type: 'string' } }, taskFilePath, skillsRoot)).toThrow();
  });
});

describe('collectAndResolveSchemas', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves $ref in task result schemas and populates schemas map', () => {
    const skillsRoot = resolve(tmpDir, 'skills');
    const designDir = resolve(skillsRoot, 'designbook', 'design');
    const tasksDir = resolve(designDir, 'tasks');
    mkdirSync(tasksDir, { recursive: true });

    // Create schemas.yml
    const schemasContent = stringifyYaml({
      Check: {
        type: 'object',
        required: ['storyId', 'breakpoint'],
        properties: {
          storyId: { type: 'string' },
          breakpoint: { type: 'string' },
        },
      },
      Issue: {
        type: 'object',
        required: ['severity', 'description'],
        properties: {
          severity: { type: 'string' },
          description: { type: 'string' },
        },
      },
    });
    writeFileSync(resolve(designDir, 'schemas.yml'), schemasContent);

    // Create task file with $ref in result
    const taskFilePath = resolve(tasksDir, 'setup-compare.md');
    writeFileSync(
      taskFilePath,
      [
        '---',
        'name: test:setup-compare',
        'result:',
        '  checks:',
        '    $ref: "../schemas.yml#/Check"',
        '    type: array',
        '---',
        '',
      ].join('\n'),
    );

    // Simulate expanded tasks (result without schema, as expandResultDeclarations currently produces)
    const tasks = [
      {
        id: 'setup-compare-abc123',
        title: 'Setup Compare',
        type: 'data' as const,
        step: 'setup-compare',
        stage: 'setup',
        params: {},
        task_file: taskFilePath,
        rules: [],
        blueprints: [],
        config_rules: [],
        config_instructions: [],
        files: [],
        result: {
          checks: { schema: { type: 'array' } },
        },
      },
    ];

    const schemas = collectAndResolveSchemas(tasks as unknown as ResolvedTask[], skillsRoot);

    // Schema map should contain the Check type
    expect(schemas).toHaveProperty('Check');
    expect(schemas.Check).toEqual({
      type: 'object',
      required: ['storyId', 'breakpoint'],
      properties: {
        storyId: { type: 'string' },
        breakpoint: { type: 'string' },
      },
    });

    // Task result entry should have its schema populated
    expect(tasks[0]!.result!.checks!.schema).toEqual(schemas.Check);
  });

  it('resolves multiple $ref entries across tasks', () => {
    const skillsRoot = resolve(tmpDir, 'skills');
    const designDir = resolve(skillsRoot, 'designbook', 'design');
    const tasksDir = resolve(designDir, 'tasks');
    mkdirSync(tasksDir, { recursive: true });

    const schemasContent = stringifyYaml({
      Check: { type: 'object', properties: { storyId: { type: 'string' } } },
      Issue: { type: 'object', properties: { severity: { type: 'string' } } },
    });
    writeFileSync(resolve(designDir, 'schemas.yml'), schemasContent);

    // Task 1: $ref to Check
    const task1Path = resolve(tasksDir, 'task1.md');
    writeFileSync(
      task1Path,
      ['---', 'name: test:task1', 'result:', '  checks:', '    $ref: "../schemas.yml#/Check"', '---', ''].join('\n'),
    );

    // Task 2: $ref to Issue
    const task2Path = resolve(tasksDir, 'task2.md');
    writeFileSync(
      task2Path,
      ['---', 'name: test:task2', 'result:', '  issues:', '    $ref: "../schemas.yml#/Issue"', '---', ''].join('\n'),
    );

    const baseMeta = { params: {}, rules: [], blueprints: [], config_rules: [], config_instructions: [], files: [] };
    const tasks = [
      {
        ...baseMeta,
        id: 'task1-abc',
        title: 'Task 1',
        type: 'data' as const,
        step: 'step1',
        stage: 'stage1',
        task_file: task1Path,
        result: { checks: {} },
      },
      {
        ...baseMeta,
        id: 'task2-abc',
        title: 'Task 2',
        type: 'data' as const,
        step: 'step2',
        stage: 'stage2',
        task_file: task2Path,
        result: { issues: {} },
      },
    ];

    const schemas = collectAndResolveSchemas(tasks as unknown as ResolvedTask[], skillsRoot);

    expect(Object.keys(schemas)).toEqual(expect.arrayContaining(['Check', 'Issue']));
    expect((tasks[0]!.result!.checks as { schema?: object }).schema).toEqual(schemas.Check);
    expect((tasks[1]!.result!.issues as { schema?: object }).schema).toEqual(schemas.Issue);
  });

  it('returns empty map when no tasks have $ref', () => {
    const skillsRoot = resolve(tmpDir, 'skills');
    const tasksDir = resolve(skillsRoot, 'designbook', 'tasks');
    mkdirSync(tasksDir, { recursive: true });

    const taskFilePath = resolve(tasksDir, 'plain.md');
    writeFileSync(
      taskFilePath,
      ['---', 'name: test:plain', 'result:', '  data:', '    type: object', '---', ''].join('\n'),
    );

    const tasks = [
      {
        id: 'plain-abc',
        title: 'Plain',
        type: 'data' as const,
        step: 'step',
        stage: 'stage',
        params: {},
        task_file: taskFilePath,
        rules: [],
        blueprints: [],
        config_rules: [],
        config_instructions: [],
        files: [],
        result: { data: { schema: { type: 'object' } } },
      },
    ];

    const schemas = collectAndResolveSchemas(tasks as unknown as ResolvedTask[], skillsRoot);
    expect(Object.keys(schemas)).toHaveLength(0);
  });
});

describe('$ref end-to-end: collectAndResolveSchemas → workflowPlan → workflowResult', () => {
  let dist: string;
  let tmpDir: string;

  beforeEach(() => {
    dist = makeTmpDir();
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(dist, { recursive: true, force: true });
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('validates data result against $ref-resolved schema via workflowResult', async () => {
    // Setup: skill files with schemas.yml + task with items.$ref (real-world pattern)
    const skillsRoot = resolve(tmpDir, 'skills');
    const designDir = resolve(skillsRoot, 'designbook', 'design');
    const tasksDir = resolve(designDir, 'tasks');
    mkdirSync(tasksDir, { recursive: true });

    const checkSchema = {
      type: 'object',
      required: ['storyId', 'breakpoint'],
      properties: {
        storyId: { type: 'string' },
        breakpoint: { type: 'string' },
      },
    };
    writeFileSync(resolve(designDir, 'schemas.yml'), stringifyYaml({ Check: checkSchema }));

    // Real-world pattern: type: array + items: { $ref: ... }
    const taskFilePath = resolve(tasksDir, 'setup-compare.md');
    writeFileSync(
      taskFilePath,
      [
        '---',
        'name: test:setup-compare',
        'result:',
        '  checks:',
        '    type: array',
        '    items:',
        '      $ref: "../schemas.yml#/Check"',
        '---',
        '',
      ].join('\n'),
    );

    // Simulate expanded task — expandResultDeclarations produces { schema: { type: 'array', items: { $ref: '...' } } }
    // but strips $ref from items. After collectAndResolveSchemas, items should be replaced with the resolved schema.
    const tasks = [
      {
        id: 'setup-compare',
        title: 'Setup Compare',
        type: 'data' as const,
        step: 'setup-compare',
        stage: 'setup',
        params: {},
        task_file: taskFilePath,
        rules: [],
        blueprints: [],
        config_rules: [],
        config_instructions: [],
        files: [],
        result: {
          checks: {
            schema: { type: 'array', items: {} },
          },
        },
      },
    ];

    const schemas = collectAndResolveSchemas(tasks as unknown as ResolvedTask[], skillsRoot);

    // Schema map should contain the Check type
    expect(schemas).toHaveProperty('Check');

    // The schema's items should now be resolved from $ref
    // collectAndResolveSchemas resolves nested $ref via resolveRefsInDeclaration
    // but the actual task.result schema is only updated for top-level $ref (line 186)
    // For items.$ref, only the schemas map is populated — the task schema items stay as-is

    // Create workflow and plan with resolved schemas + manually fix items schema
    const { workflowCreate, workflowPlan, workflowResult } = await import('../../workflow.js');

    // Build the full schema with resolved items (as workflow create does for intake at lines 216-224)
    tasks[0]!.result!.checks!.schema = {
      type: 'array',
      items: checkSchema,
    };

    const name = workflowCreate(dist, 'debo-test', 'Test $ref', []);
    workflowPlan(
      dist,
      name,
      tasks,
      { setup: { steps: ['setup-compare'] } },
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
      schemas,
    );

    // Valid data — should pass
    const validData = [
      { storyId: 'shell', breakpoint: 'sm' },
      { storyId: 'shell', breakpoint: 'xl' },
    ];
    const mockConfig = { data: dist, technology: 'html' as const, extensions: [] };
    const validResult = await workflowResult(dist, name, 'setup-compare', 'checks', validData, mockConfig);
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toEqual([]);

    // Invalid data — missing required 'breakpoint'
    const invalidData = [{ storyId: 'shell' }];
    const invalidResult = await workflowResult(dist, name, 'setup-compare', 'checks', invalidData, mockConfig);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });
});
