import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import {
  resolveTaskFiles,
  expandFilePath,
  matchRuleFiles,
  resolveConfigForStep,
  validateAndMergeParams,
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
  validateStageDefinitions,
  resolveWorkflowFileById,
  type ResolvedFile,
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
      'when:\n  steps: [designbook-sections:create-section]\nparams:\n  section_id: ~',
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
      'when:\n  steps: [create-tokens]\nparams:\n  colors: {}',
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
      'when:\n  steps: [create-component]\nparams:\n  component: ~',
    );
    // Specific match (when frameworks.component: sdc + steps)
    const specificPath = writeSkillTaskFile(
      agentsDir,
      'sdc-comp',
      'create-component',
      'when:\n  steps: [create-component]\n  frameworks.component: sdc\nparams:\n  component: ~',
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
      'when:\n  steps: [create-component]\nparams:\n  component: ~',
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
      'when:\n  steps: [create-tokens]\nparams:\n  colors: {}',
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
describe('validateAndMergeParams', () => {
  it('passes with all required params provided', () => {
    const result = validateAndMergeParams({ component: 'button' }, { component: null, slots: [] }, 'create-component');
    expect(result).toEqual({ component: 'button', slots: [] });
  });

  it('throws on missing required param with expected params list', () => {
    expect(() => validateAndMergeParams({}, { component: null, slots: [] }, 'create-component')).toThrow(
      /Missing required param 'component' for step 'create-component'. Expected params: component \(required\), slots \(optional\)/,
    );
  });

  it('uses default for optional params', () => {
    const result = validateAndMergeParams(
      { component: 'button' },
      { component: null, slots: ['default'], count: 0 },
      'create-component',
    );
    expect(result).toEqual({ component: 'button', slots: ['default'], count: 0 });
  });

  it('item params override defaults', () => {
    const result = validateAndMergeParams(
      { component: 'card', slots: ['header'] },
      { component: null, slots: [] },
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
      'params:\n  component: ~\n  slots: []\nfiles:\n  - file: $DESIGNBOOK_DATA/components/{{ component }}/{{ component }}.yml\n    key: component\n    validators: [component]',
    );
    writeSkillTaskFile(
      agentsDir,
      'designbook-scenes',
      'create-scene',
      'params:\n  section_id: ~\nfiles:\n  - file: $DESIGNBOOK_DATA/scenes/{{ section_id }}.yml\n    key: scene\n    validators: [scene]',
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

// ── Subworkflow validation ────────────────────────────────────────

describe('validateStageDefinitions', () => {
  it('accepts valid stage with steps only', () => {
    expect(() => validateStageDefinitions({ test: { steps: ['capture', 'compare'] } })).not.toThrow();
  });

  it('accepts valid stage with workflow + each', () => {
    expect(() =>
      validateStageDefinitions({ verify: { steps: [], workflow: 'design-verify', each: 'scene' } }),
    ).not.toThrow();
  });

  it('rejects workflow + steps together', () => {
    expect(() =>
      validateStageDefinitions({ verify: { steps: ['capture'], workflow: 'design-verify', each: 'scene' } }),
    ).toThrow('mutually exclusive');
  });

  it('rejects workflow without each', () => {
    expect(() => validateStageDefinitions({ verify: { steps: [], workflow: 'design-verify' } })).toThrow(
      'requires "each"',
    );
  });
});

describe('resolveWorkflowFileById', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('finds workflow file by ID', () => {
    const wfDir = resolve(tmpDir, 'skills', 'designbook', 'design', 'workflows');
    mkdirSync(wfDir, { recursive: true });
    writeFileSync(resolve(wfDir, 'design-verify.md'), '---\ntitle: Test\n---\n');

    const result = resolveWorkflowFileById('design-verify', tmpDir);
    expect(result).toBe(resolve(wfDir, 'design-verify.md'));
  });

  it('returns null for non-existent workflow', () => {
    const result = resolveWorkflowFileById('nonexistent', tmpDir);
    expect(result).toBeNull();
  });
});
