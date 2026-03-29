/**
 * Workflow plan resolution engine.
 *
 * Resolves task files, file paths, dependencies, rules, and config
 * constraints at plan time — so subagents receive fully-resolved tasks.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import fm from 'front-matter';
import { globSync } from 'glob';
import { normalizeExtensions, getExtensionIds, getExtensionSkillIds, type DesignbookConfig } from './config.js';

// ── Types ──────────────────────────────────────────────────────────

export interface PlanItem {
  step: string;
  params?: Record<string, unknown>;
}

export interface ResolvedTask {
  id: string;
  title: string;
  type: string;
  step: string; // canonical step name (e.g. create-component) — was: stage
  stage: string; // parent stage name (execute, test, preview)
  params: Record<string, unknown>;
  task_file: string;
  rules: string[];
  config_rules: string[];
  config_instructions: string[];
  files: Array<{ path: string; key: string; validators: string[] }>;
}

export interface ResolvedPlan {
  params: Record<string, unknown>;
  steps: string[]; // ordered step names — was: stages
  tasks: ResolvedTask[];
}

export interface ResolvedFile {
  path: string;
  specificity: number;
  frontmatter: Record<string, unknown> | null;
}

export interface TaskFileDeclaration {
  file: string; // path template (supports $ENV and {{ param }})
  key: string; // stable identifier used by write-file --key
  validators?: string[]; // validator keys (e.g. ['tokens']); defaults to []
}

interface TaskFileFrontmatter {
  when?: Record<string, unknown>;
  params?: Record<string, unknown>;
  files?: TaskFileDeclaration[];
  reads?: Array<{ path: string; workflow?: string }>;
}

interface StageDefinitionFm {
  steps: string[];
  params?: Record<string, { type: string; prompt: string }>;
}

interface WorkflowFrontmatter {
  // New grouped format: stages map stage names to step lists
  title?: string;
  stages?: Record<string, StageDefinitionFm> | string[];
  engine?: string;
  // Legacy nested format: workflow.title, workflow.stages
  workflow?: {
    title?: string;
    stages?: string[];
  };
}

/**
 * Extract steps from workflow frontmatter.
 * Supports three formats:
 * - Grouped: stages: { execute: { steps: [...] }, test: { steps: [...] } }
 * - Flat: stages: [step1, step2, ...] (legacy)
 * - Nested: workflow.stages: [...] (legacy)
 */
function getWorkflowSteps(fm: WorkflowFrontmatter): string[] | undefined {
  const stages = fm.stages ?? fm.workflow?.stages;
  if (!stages) return undefined;
  if (Array.isArray(stages)) return stages;
  // Grouped format: flatten all steps from all stages in order
  const steps: string[] = [];
  for (const def of Object.values(stages)) {
    steps.push(...(def.steps ?? []));
  }
  return steps;
}

/** Extract grouped stage definitions from frontmatter (new format only). */
function getWorkflowStageDefinitions(fm: WorkflowFrontmatter): Record<string, StageDefinitionFm> | undefined {
  if (fm.stages && !Array.isArray(fm.stages)) return fm.stages;
  return undefined;
}

/** Extract title from workflow frontmatter (supports both flat and nested format). */
function getWorkflowTitle(fm: WorkflowFrontmatter): string {
  return fm.title ?? fm.workflow?.title ?? '';
}

// ── Frontmatter Parsing ────────────────────────────────────────────

/**
 * Extract YAML frontmatter from a markdown file.
 * Returns parsed YAML object, or null if no frontmatter found.
 */
export function parseFrontmatter(filePath: string): Record<string, unknown> | null {
  const content = readFileSync(filePath, 'utf-8');
  const result = fm<Record<string, unknown>>(content);
  if (!result.frontmatter) return null;
  return result.attributes ?? {};
}

// ── When Condition Matching ────────────────────────────────────────

/**
 * Look up a key in context first, then config. Config supports dot-path traversal
 * as fallback (e.g. `frameworks.css` walks into `config.frameworks.css`).
 */
export function lookup(key: string, context: Record<string, unknown>, config: Record<string, unknown>): unknown {
  if (context[key] !== undefined) return context[key];
  if (config[key] !== undefined) return config[key];
  // Dot-path traversal into config (forward-compat for non-flattened configs)
  return key
    .split('.')
    .reduce(
      (obj, part) => (obj != null && typeof obj === 'object' ? (obj as Record<string, unknown>)[part] : undefined),
      config as unknown,
    );
}

/**
 * Check whether all `when` conditions match against context + config.
 *
 * Lookup order per key: context first, config fallback (with dot-path traversal).
 * Matching rules:
 * - Array value in `when` → looked-up value must be one of those values
 * - Array looked-up value → `when` value must be present in that array
 * - Scalar vs scalar → exact string match
 *
 * Returns specificity count (number of matched keys) on success, or `false` if any key fails.
 */
export function checkWhen(
  when: Record<string, unknown>,
  context: Record<string, unknown>,
  config: Record<string, unknown>,
): number | false {
  for (const [key, value] of Object.entries(when)) {
    const actual = lookup(key, context, config);
    if (Array.isArray(value)) {
      if (!value.map(String).includes(String(actual ?? ''))) return false;
    } else if (Array.isArray(actual)) {
      if (!actual.map(String).includes(String(value))) return false;
    } else {
      if (String(actual ?? '') !== String(value)) return false;
    }
  }
  return Object.keys(when).length;
}

/**
 * Build runtime context for `when` evaluation (step-specific, not config).
 * Sets both `steps` (new) and `stages` (legacy) keys for backwards compatibility
 * with existing rule files that use `when: stages:`.
 */
export function buildRuntimeContext(step?: string, extraConditions?: Record<string, string>): Record<string, unknown> {
  const context: Record<string, unknown> = {};
  if (step !== undefined) {
    context['steps'] = step;
    context['stages'] = step; // Legacy compat: rule files may use when: stages:
  }
  if (extraConditions) Object.assign(context, extraConditions);
  return context;
}

/**
 * Enrich config with derived DESIGNBOOK_* env vars and normalized extensions array.
 */
export function buildEnrichedConfig(config: DesignbookConfig): Record<string, unknown> {
  const enriched: Record<string, unknown> = { ...(config as Record<string, unknown>) };
  Object.assign(enriched, buildEnvMap(config));
  const extensions = normalizeExtensions(config['extensions']);
  enriched['extensions'] = getExtensionIds(extensions).split(',').filter(Boolean);
  return enriched;
}

// ── Environment Variable Map ───────────────────────────────────────

/**
 * Build a map of DESIGNBOOK_* env vars from config for template expansion.
 *
 * Emits:
 * - DESIGNBOOK_WORKSPACE from `workspace`
 * - DESIGNBOOK_HOME / DESIGNBOOK_DATA / DESIGNBOOK_URL / DESIGNBOOK_CMD from `designbook.*` keys
 * - DESIGNBOOK_DIRS_* from `dirs.*` keys
 * - All other scalar config values → DESIGNBOOK_<KEY>
 */
export function buildEnvMap(config: DesignbookConfig): Record<string, string> {
  const env: Record<string, string> = {};

  // Dynamic: all scalar config values → DESIGNBOOK_<KEY> (dots become underscores, uppercased)
  // Skip internal properties and designbook.* keys (handled explicitly below)
  for (const [key, value] of Object.entries(config)) {
    if (value == null || typeof value === 'object') continue;
    if (key === 'data' || key === 'workspace') continue;
    if (key.startsWith('designbook.')) continue;
    env[`DESIGNBOOK_${key.replace(/\./g, '_').toUpperCase()}`] = String(value);
  }

  // Explicit: DESIGNBOOK_WORKSPACE, DESIGNBOOK_HOME, DESIGNBOOK_DATA, DESIGNBOOK_URL, DESIGNBOOK_CMD
  if (config.workspace) env['DESIGNBOOK_WORKSPACE'] = String(config.workspace);
  if (config['designbook.home']) env['DESIGNBOOK_HOME'] = String(config['designbook.home']);
  if (config['designbook.data']) env['DESIGNBOOK_DATA'] = String(config['designbook.data']);
  if (config['designbook.url']) env['DESIGNBOOK_URL'] = String(config['designbook.url']);
  if (config['designbook.cmd']) env['DESIGNBOOK_CMD'] = String(config['designbook.cmd']);

  // Derived: extensions as comma-sep IDs + skill IDs
  const extensions = normalizeExtensions(config['extensions']);
  env['DESIGNBOOK_EXTENSIONS'] = getExtensionIds(extensions);
  env['DESIGNBOOK_EXTENSION_SKILLS'] = getExtensionSkillIds(extensions);

  return env;
}

/**
 * Build a remapped env map for an isolated git WORKTREE.
 *
 * Swaps DESIGNBOOK_WORKSPACE to the worktree path. All DESIGNBOOK_DIRS_* vars are
 * re-derived by resolving their workspace-relative paths against the new workspace.
 * DESIGNBOOK_HOME and DESIGNBOOK_DATA are re-resolved the same way.
 *
 * This preserves directory structure so that `cp -r WORKTREE/* DESIGNBOOK_HOME/`
 * restores files to their correct locations.
 */
export function buildWorktreeEnvMap(
  envMap: Record<string, string>,
  worktreePath: string,
  rootDir: string,
): Record<string, string> {
  const remapped = { ...envMap };

  // Swap workspace anchor
  remapped['DESIGNBOOK_WORKSPACE'] = worktreePath;

  // Re-resolve DESIGNBOOK_DIRS_* relative to new workspace
  for (const [key, value] of Object.entries(envMap)) {
    if (!key.startsWith('DESIGNBOOK_DIRS_')) continue;
    const relPath = relative(rootDir, value);
    remapped[key] = resolve(worktreePath, relPath);
  }

  // Re-resolve DESIGNBOOK_HOME and DESIGNBOOK_DATA relative to new workspace
  if (envMap['DESIGNBOOK_HOME']) {
    remapped['DESIGNBOOK_HOME'] = resolve(worktreePath, relative(rootDir, envMap['DESIGNBOOK_HOME']));
  }
  if (envMap['DESIGNBOOK_DATA']) {
    remapped['DESIGNBOOK_DATA'] = resolve(worktreePath, relative(rootDir, envMap['DESIGNBOOK_DATA']));
  }

  return remapped;
}

// ── Unified File Resolution ─────────────────────────────────────────

/**
 * Find markdown files matching a glob pattern and filter by `when` frontmatter
 * conditions against context (runtime) and config (project).
 *
 * Returns all matches with their specificity (number of `when` keys matched).
 * Files without `when` (or empty `when`) match unconditionally with specificity 0.
 */
export function resolveFiles(
  globPattern: string,
  context: Record<string, unknown>,
  config: Record<string, unknown>,
  agentsDir: string,
): ResolvedFile[] {
  const results: ResolvedFile[] = [];
  const paths = globSync(globPattern, { cwd: agentsDir, absolute: true });

  for (const filePath of paths) {
    const frontmatter = parseFrontmatter(filePath);
    const when = frontmatter?.when as Record<string, unknown> | undefined;

    if (!when || Object.keys(when).length === 0) {
      results.push({ path: filePath, specificity: 0, frontmatter });
      continue;
    }

    const specificity = checkWhen(when, context, config);
    if (specificity !== false) {
      results.push({ path: filePath, specificity, frontmatter });
    }
  }

  return results;
}

// ── Task File Resolution ────────────────────────────────────────────

/**
 * Resolve a stage name to task file paths.
 *
 * Named stages (skill:task format): first try direct skill-dir resolution, then
 * fall back to glob for workflow-qualified tasks (task--workflow-id.md pattern).
 * Named stages always return at most one result.
 *
 * Generic stages return ALL matching task files (multiple skills can contribute).
 * Returns empty array if no task files match (callers skip the step).
 */
export function resolveTaskFiles(
  stage: string,
  config: DesignbookConfig,
  agentsDir: string,
  workflowId?: string,
): string[] {
  // Named stage: skill-name:task-name — single result
  if (stage.includes(':')) {
    const parts = stage.split(':', 2);
    const skillName = parts[0] ?? '';
    const taskName = parts[1] ?? '';
    // Try direct skill-dir resolution first (e.g. designbook-drupal:create-component)
    const taskPath = resolve(agentsDir, 'skills', skillName, 'tasks', `${taskName}.md`);
    if (existsSync(taskPath)) {
      return [taskPath];
    }
    // Fall back to glob for workflow-qualified tasks within unified skill (e.g. design-screen:intake)
    const context = buildRuntimeContext();
    const enrichedConfig = buildEnrichedConfig(config);
    const matches = resolveFiles(`skills/**/tasks/${taskName}--${skillName}.md`, context, enrichedConfig, agentsDir);
    if (matches.length === 0) {
      return [];
    }
    matches.sort((a, b) => b.specificity - a.specificity);
    return [matches[0]!.path];
  }

  // Generic stage: resolve via glob + when matching — return ALL matches
  const context = buildRuntimeContext();
  const enrichedConfig = buildEnrichedConfig(config);
  const matches = resolveFiles(`skills/**/tasks/${stage}.md`, context, enrichedConfig, agentsDir);

  if (matches.length > 0) {
    return matches.map((m) => m.path);
  }

  // Fallback: try workflow-qualified task file (e.g. intake--vision.md)
  if (workflowId) {
    const qualifiedMatches = resolveFiles(
      `skills/**/tasks/${stage}--${workflowId}.md`,
      context,
      enrichedConfig,
      agentsDir,
    );
    if (qualifiedMatches.length > 0) {
      return qualifiedMatches.map((m) => m.path);
    }
  }

  return [];
}

// ── Rule File Matching ──────────────────────────────────────────────

/**
 * Scan all rule files and return paths matching the given stage and config.
 */
export function matchRuleFiles(
  stage: string,
  config: DesignbookConfig,
  agentsDir: string,
  extraConditions?: Record<string, string>,
): string[] {
  const context = buildRuntimeContext(stage, extraConditions);
  const enrichedConfig = buildEnrichedConfig(config);
  const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir);
  return matches.map((m) => m.path);
}

// ── File Path Expansion ─────────────────────────────────────────────

/**
 * Expand a file path template by substituting {{ param }} and ${ENV_VAR} placeholders.
 */
export function expandFilePath(
  template: string,
  params: Record<string, unknown>,
  envMap: Record<string, string>,
): string {
  let result = template;

  // Expand ${VAR} and $VAR patterns (env vars)
  result = result.replace(/\$\{(\w+)\}/g, (_match, varName) => {
    if (envMap[varName] !== undefined) return envMap[varName];
    throw new Error(`Unknown environment variable: \${${varName}} in path "${template}"`);
  });
  result = result.replace(/\$([A-Z_][A-Z0-9_]*)/g, (_match, varName) => {
    if (envMap[varName] !== undefined) return envMap[varName];
    throw new Error(`Unknown environment variable: $${varName} in path "${template}"`);
  });

  // Expand {{ param }} patterns (intake params)
  result = result.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, paramName) => {
    if (params[paramName] !== undefined) return String(params[paramName]);
    throw new Error(`Unknown param: {{ ${paramName} }} in path "${template}"`);
  });

  return result;
}

/**
 * Expand all file declarations from a task file's frontmatter.
 * Expands the `file` path template, passes through `key` and `validators`.
 */
export function expandFileDeclarations(
  declarations: TaskFileDeclaration[],
  params: Record<string, unknown>,
  envMap: Record<string, string>,
  validatorKeys?: Set<string>,
): Array<{ path: string; key: string; validators: string[] }> {
  const keys = new Set<string>();
  return declarations.map((d) => {
    if (keys.has(d.key)) {
      throw new Error(`Duplicate key '${d.key}' in file declarations`);
    }
    keys.add(d.key);
    const validators = d.validators ?? [];
    if (validatorKeys) {
      for (const v of validators) {
        if (!validatorKeys.has(v)) {
          throw new Error(
            `Unknown validator key '${v}' in file '${d.key}'. Available: ${[...validatorKeys].join(', ')}`,
          );
        }
      }
    }
    return {
      path: expandFilePath(d.file, params, envMap),
      key: d.key,
      validators,
    };
  });
}

// ── Config Resolution ───────────────────────────────────────────────

/**
 * Resolve workflow config rules and instructions for a step.
 * Extension skills (from extensions[].skill in config) are injected into
 * config_instructions at lower priority than explicit step instructions.
 */
export function resolveConfigForStep(
  stage: string,
  rawConfig: Record<string, unknown>,
): { config_rules: string[]; config_instructions: string[] } {
  const workflow = rawConfig.workflow as Record<string, unknown> | undefined;

  const rules = workflow?.rules as Record<string, unknown> | undefined;
  const tasks = workflow?.tasks as Record<string, unknown> | undefined;

  const configRules = rules?.[stage];
  const configInstructions = tasks?.[stage];

  const explicitInstructions = Array.isArray(configInstructions) ? configInstructions.map(String) : [];

  const extensionSkills = getExtensionSkillIds(normalizeExtensions(rawConfig['extensions'])).split(',').filter(Boolean);

  return {
    config_rules: Array.isArray(configRules) ? configRules.map(String) : [],
    config_instructions: [...explicitInstructions, ...extensionSkills],
  };
}

// ── Params Validation ───────────────────────────────────────────────

/**
 * Validate and merge item params against task file's params schema.
 * Required params (value is null/~) must be provided.
 * Optional params (value is a default) are filled from schema if absent.
 */
export function validateAndMergeParams(
  itemParams: Record<string, unknown>,
  schemaParams: Record<string, unknown>,
  step: string,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...itemParams };

  for (const [key, defaultValue] of Object.entries(schemaParams)) {
    if (merged[key] !== undefined) continue;

    if (defaultValue === null) {
      throw new Error(`Missing required param '${key}' for step '${step}'`);
    }

    merged[key] = defaultValue;
  }

  return merged;
}

// ── Task ID Generation ──────────────────────────────────────────────

/**
 * Generate a task ID from stage name and params.
 */
export function generateTaskId(
  stage: string,
  params: Record<string, unknown>,
  schemaParams?: Record<string, unknown>,
): string {
  const baseName = stage.includes(':') ? stage.split(':')[1]! : stage;

  if (schemaParams) {
    for (const [key, defaultValue] of Object.entries(schemaParams)) {
      if (defaultValue === null && typeof params[key] === 'string' && (params[key] as string).length > 0) {
        return `${baseName}-${params[key]}`;
      }
    }
  }

  for (const value of Object.values(params)) {
    if (typeof value === 'string' && value.length > 0) {
      return `${baseName}-${value}`;
    }
  }

  return baseName;
}

/**
 * Ensure task IDs are unique within a plan. Appends suffix for duplicates.
 */
function deduplicateTaskIds(tasks: ResolvedTask[]): void {
  const seen = new Map<string, number>();
  for (const task of tasks) {
    const count = seen.get(task.id) ?? 0;
    if (count > 0) {
      task.id = `${task.id}-${count + 1}`;
    }
    seen.set(task.id.replace(/-\d+$/, ''), count + 1);
  }
}

// ── Step Resolution (all steps at once) ────────────────────────────

export interface ResolvedStep {
  task_file: string;
  rules: string[];
  config_rules: string[];
  config_instructions: string[];
}

export interface ResolvedSteps {
  title: string;
  steps: string[];
  stages?: Record<string, StageDefinitionFm>;
  engine?: string;
  step_resolved: Record<string, ResolvedStep | ResolvedStep[]>;
}

/**
 * Resolve ALL steps from a workflow file at create time.
 */
export function resolveAllStages(
  workflowFilePath: string,
  config: DesignbookConfig,
  rawConfig: Record<string, unknown>,
  agentsDir: string,
): ResolvedSteps {
  const wfFm = parseFrontmatter(workflowFilePath) as WorkflowFrontmatter | null;
  const allSteps = wfFm ? getWorkflowSteps(wfFm) : undefined;
  if (!allSteps) {
    throw new Error(`No steps found in frontmatter of ${workflowFilePath}`);
  }

  // Extract workflow ID from file path (e.g. vision/workflows/vision.md → "vision")
  const workflowId = workflowFilePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.md$/, '');

  const stepResolved: Record<string, ResolvedStep | ResolvedStep[]> = {};
  const resolvedSteps: string[] = [];

  for (const step of allSteps) {
    const taskFilePaths = resolveTaskFiles(step, config, agentsDir, workflowId);
    if (taskFilePaths.length === 0) {
      console.debug(`[Designbook] workflow: step "${step}" skipped — no matching task file`);
      continue;
    }
    const ruleFiles = matchRuleFiles(step, config, agentsDir);
    const { config_rules, config_instructions } = resolveConfigForStep(step, rawConfig);

    if (taskFilePaths.length === 1) {
      stepResolved[step] = {
        task_file: taskFilePaths[0]!,
        rules: ruleFiles,
        config_rules,
        config_instructions,
      };
    } else {
      stepResolved[step] = taskFilePaths.map((taskFile) => ({
        task_file: taskFile,
        rules: ruleFiles,
        config_rules,
        config_instructions,
      }));
    }
    resolvedSteps.push(step);
  }

  const stageDefs = wfFm ? getWorkflowStageDefinitions(wfFm) : undefined;

  return {
    title: wfFm ? getWorkflowTitle(wfFm) : '',
    steps: resolvedSteps,
    ...(stageDefs ? { stages: stageDefs } : {}),
    ...(wfFm?.engine ? { engine: wfFm.engine } : {}),
    step_resolved: stepResolved,
  };
}

// ── Main Resolution Function ────────────────────────────────────────

/**
 * Infer task type from the stage name.
 */
export function inferTaskType(stage: string): string {
  const base = stage.includes(':') ? stage.split(':')[1]! : stage;
  if (base.includes('component') || base.includes('shell')) return 'component';
  if (base.includes('scene')) return 'scene';
  if (base.includes('token')) return 'tokens';
  if (base.includes('css') || base.includes('generate')) return 'css';
  if (base.includes('data') || base.includes('model') || base.includes('sample')) return 'data';
  if (base.includes('entity') || base.includes('map') || base.includes('collect')) return 'view-mode';
  if (base.includes('validate')) return 'validation';
  if (base.includes('preview')) return 'prepare-environment';
  return 'data';
}

/**
 * Generate a human-readable task title from stage and params.
 */
export function generateTaskTitle(
  stage: string,
  params: Record<string, unknown>,
  schemaParams?: Record<string, unknown>,
): string {
  const base = stage.includes(':') ? stage.split(':')[1]! : stage;
  const words = base.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  if (schemaParams) {
    for (const [key, defaultValue] of Object.entries(schemaParams)) {
      if (defaultValue === null && typeof params[key] === 'string' && (params[key] as string).length > 0) {
        return `${words}: ${params[key]}`;
      }
    }
  }

  for (const value of Object.values(params)) {
    if (typeof value === 'string' && value.length > 0) {
      return `${words}: ${value}`;
    }
  }

  return words;
}

/**
 * Resolve a full workflow plan from items + pre-resolved step data.
 */
export function resolveWorkflowPlan(
  workflowFilePath: string,
  globalParams: Record<string, unknown>,
  items: PlanItem[],
  config: DesignbookConfig,
  rawConfig: Record<string, unknown>,
  agentsDir: string,
  stepResolved?: Record<string, ResolvedStep>,
): ResolvedPlan {
  const wfFm = parseFrontmatter(workflowFilePath) as WorkflowFrontmatter | null;
  const allSteps = wfFm ? getWorkflowSteps(wfFm) : undefined;
  if (!allSteps) {
    throw new Error(`No steps found in frontmatter of ${workflowFilePath}`);
  }

  const stageDefs = wfFm ? getWorkflowStageDefinitions(wfFm) : undefined;

  // Build step → parent stage mapping
  const stepToStage = new Map<string, string>();
  if (stageDefs) {
    for (const [stageName, def] of Object.entries(stageDefs)) {
      for (const step of def.steps) {
        stepToStage.set(step, stageName);
      }
    }
  }

  const execSteps = allSteps.filter((s) => !s.endsWith(':intake'));

  for (const item of items) {
    if (!execSteps.includes(item.step)) {
      throw new Error(`Item step "${item.step}" not found in workflow steps: [${execSteps.join(', ')}]`);
    }
  }

  const envMap = buildEnvMap(config);

  const itemsByStep = new Map<string, PlanItem[]>();
  for (const step of execSteps) {
    itemsByStep.set(step, []);
  }
  for (const item of items) {
    itemsByStep.get(item.step)!.push(item);
  }

  const tasks: ResolvedTask[] = [];

  for (const step of execSteps) {
    const stepItems = itemsByStep.get(step) ?? [];
    if (stepItems.length === 0) continue;

    // Resolve task files for this step — may be pre-resolved or freshly resolved
    const preResolved = stepResolved?.[step];
    const resolvedEntries: ResolvedStep[] = preResolved
      ? Array.isArray(preResolved)
        ? preResolved
        : [preResolved]
      : resolveTaskFiles(step, config, agentsDir).map((taskFile) => ({
          task_file: taskFile,
          rules: matchRuleFiles(step, config, agentsDir),
          ...resolveConfigForStep(step, rawConfig),
        }));

    if (resolvedEntries.length === 0) {
      console.debug(`[Designbook] workflow plan: step "${step}" skipped — no matching task file`);
      continue;
    }

    for (const resolved of resolvedEntries) {
      const taskFm = parseFrontmatter(resolved.task_file) as TaskFileFrontmatter | null;
      const schemaParams = taskFm?.params ?? {};
      const fileDeclarations = taskFm?.files ?? [];

      for (const item of stepItems) {
        const mergedParams = validateAndMergeParams(item.params ?? {}, schemaParams, step);
        const taskId = generateTaskId(step, mergedParams, schemaParams);
        const title = generateTaskTitle(step, mergedParams, schemaParams);
        const type = inferTaskType(step);
        const files = expandFileDeclarations(fileDeclarations, mergedParams, envMap);

        tasks.push({
          id: taskId,
          title,
          type,
          step,
          stage: stepToStage.get(step) ?? 'execute',
          params: mergedParams,
          task_file: resolved.task_file,
          rules: resolved.rules,
          config_rules: resolved.config_rules,
          config_instructions: resolved.config_instructions,
          files,
        });
      }
    }
  }

  deduplicateTaskIds(tasks);

  return {
    params: globalParams,
    steps: execSteps,
    tasks,
  };
}
