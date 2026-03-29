import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
  it('resolves named stage (skill:task format) directly', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillTaskFile(agentsDir, 'designbook-sections', 'create-section', 'params:\n  section_id: ~');

    const result = resolveTaskFiles('designbook-sections:create-section', baseConfig, agentsDir);
    expect(result).toEqual([resolve(agentsDir, 'skills/designbook-sections/tasks/create-section.md')]);
  });

  it('resolves generic stage by scanning skills', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillTaskFile(agentsDir, 'designbook-tokens', 'create-tokens', 'params:\n  colors: {}');

    const result = resolveTaskFiles('create-tokens', baseConfig, agentsDir);
    expect(result).toEqual([resolve(agentsDir, 'skills/designbook-tokens/tasks/create-tokens.md')]);
  });

  it('returns all matching task files for generic stage', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    // Generic fallback (no when)
    const genericPath = writeSkillTaskFile(agentsDir, 'generic-comp', 'create-component', 'params:\n  component: ~');
    // Specific match (when frameworks.component: sdc)
    const specificPath = writeSkillTaskFile(
      agentsDir,
      'sdc-comp',
      'create-component',
      'when:\n  frameworks.component: sdc\nparams:\n  component: ~',
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
      'params:\n  component: ~',
    );

    const result = resolveTaskFiles('create-component', baseConfig, agentsDir);
    expect(result).toContain(taskPath);
  });

  it('flat task structure still discovered after glob change', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const taskPath = writeSkillTaskFile(agentsDir, 'designbook-tokens', 'create-tokens', 'params:\n  colors: {}');

    const result = resolveTaskFiles('create-tokens', baseConfig, agentsDir);
    expect(result).toContain(taskPath);
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

  it('throws on missing required param', () => {
    expect(() => validateAndMergeParams({}, { component: null }, 'create-component')).toThrow(
      /Missing required param 'component'/,
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

  it('includes rule file with empty when (applies to all)', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    const rulePath = writeSkillRuleFile(agentsDir, 'designbook-workflow', 'global-rule', 'when: {}');

    const result = matchRuleFiles('any-stage', baseConfig, agentsDir);
    expect(result).toContain(rulePath);
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
      'workflow:\n  title: Test\n  stages: [designbook-components:intake, create-component, create-scene]',
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

    // Check steps (intake filtered out)
    expect(plan.steps).toEqual(['create-component', 'create-scene']);

    // Check tasks
    expect(plan.tasks).toHaveLength(3);

    // First two tasks: create-component (parallel within step)
    expect(plan.tasks[0]!.id).toBe('create-component-button');
    expect(plan.tasks[0]!.step).toBe('create-component');
    expect(plan.tasks[0]!.params.component).toBe('button');
    expect(plan.tasks[0]!.files).toEqual([
      { path: '/test/dist/components/button/button.yml', key: 'component', validators: ['component'] },
    ]);

    expect(plan.tasks[1]!.id).toBe('create-component-card');

    // Third task: create-scene (ordered by stage, no depends_on)
    expect(plan.tasks[2]!.id).toBe('create-scene-dashboard');
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
  it('generates ID from stage and first string param', () => {
    expect(generateTaskId('create-component', { component: 'button', slots: [] })).toBe('create-component-button');
  });

  it('strips skill prefix from named stages', () => {
    expect(generateTaskId('designbook-sections:create-section', { section_id: 'dashboard' })).toBe(
      'create-section-dashboard',
    );
  });

  it('falls back to stage name when no string params', () => {
    expect(generateTaskId('create-tokens', { colors: {} })).toBe('create-tokens');
  });

  it('uses first required schema param as key over arbitrary string params', () => {
    const params = { provider: 'test_integration_drupal', component: 'button', group: 'Shell' };
    const schema = { component: null, slots: [], props: [], group: null };
    expect(generateTaskId('create-component', params, schema)).toBe('create-component-button');
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

  it('includes unconditional files with specificity 0', () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeSkillRuleFile(agentsDir, 'designbook-workflow', 'global-rule', 'when: {}');

    const enrichedConfig = buildEnrichedConfig(baseConfig);
    const context = buildRuntimeContext();
    const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.specificity).toBe(0);
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
