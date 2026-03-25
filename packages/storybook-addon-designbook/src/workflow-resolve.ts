/**
 * Workflow plan resolution engine.
 *
 * Resolves task files, file paths, dependencies, rules, and config
 * constraints at plan time — so subagents receive fully-resolved tasks.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import fm from 'front-matter';
import { globSync } from 'glob';
import { normalizeExtensions, getExtensionIds, getExtensionSkillIds, type DesignbookConfig } from './config.js';

// ── Types ──────────────────────────────────────────────────────────

export interface PlanItem {
  stage: string;
  params?: Record<string, unknown>;
}

export interface ResolvedTask {
  id: string;
  title: string;
  type: string;
  stage: string;
  depends_on: string[];
  params: Record<string, unknown>;
  task_file: string;
  rules: string[];
  config_rules: string[];
  config_instructions: string[];
  files: string[];
}

export interface ResolvedPlan {
  params: Record<string, unknown>;
  stages: string[];
  tasks: ResolvedTask[];
}

export interface ResolvedFile {
  path: string;
  specificity: number;
  frontmatter: Record<string, unknown> | null;
}

interface TaskFileFrontmatter {
  when?: Record<string, unknown>;
  params?: Record<string, unknown>;
  files?: string[];
  reads?: Array<{ path: string; workflow?: string }>;
}

interface WorkflowFrontmatter {
  workflow?: {
    title?: string;
    stages?: string[];
  };
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
  return key.split('.').reduce(
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
 * Build runtime context for `when` evaluation (stage-specific, not config).
 */
export function buildRuntimeContext(
  stage?: string,
  extraConditions?: Record<string, string>,
): Record<string, unknown> {
  const context: Record<string, unknown> = {};
  if (stage !== undefined) context['stages'] = stage;
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
 */
export function buildEnvMap(config: DesignbookConfig): Record<string, string> {
  const env: Record<string, string> = {};

  // Dynamic: all scalar config values → DESIGNBOOK_<KEY> (dots become underscores, uppercased)
  for (const [key, value] of Object.entries(config)) {
    if (value == null || typeof value === 'object') continue;
    env[`DESIGNBOOK_${key.replace(/\./g, '_').toUpperCase()}`] = String(value);
  }

  // Derived: extensions as comma-sep IDs + skill IDs
  const extensions = normalizeExtensions(config['extensions']);
  env['DESIGNBOOK_EXTENSIONS'] = getExtensionIds(extensions);
  env['DESIGNBOOK_EXTENSION_SKILLS'] = getExtensionSkillIds(extensions);

  return env;
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
 * Resolve a stage name to a task file path.
 *
 * Named stages (skill:task format) resolve directly.
 * Generic stages use `resolveFiles` and pick the most specific match.
 */
export function resolveTaskFile(stage: string, config: DesignbookConfig, agentsDir: string): string {
  // Named stage: skill-name:task-name → direct resolution
  if (stage.includes(':')) {
    const [skillName, taskName] = stage.split(':', 2);
    const taskPath = resolve(agentsDir, 'skills', skillName, 'tasks', `${taskName}.md`);
    if (!existsSync(taskPath)) {
      throw new Error(`Task file not found for named stage "${stage}": ${taskPath}`);
    }
    return taskPath;
  }

  // Generic stage: resolve via glob + when matching
  const context = buildRuntimeContext();
  const enrichedConfig = buildEnrichedConfig(config);
  const matches = resolveFiles(`skills/**/tasks/${stage}.md`, context, enrichedConfig, agentsDir);

  if (matches.length === 0) {
    const configSummary = Object.fromEntries(
      Object.entries(config).filter(([, v]) => v != null && typeof v !== 'object'),
    );
    throw new Error(
      `No task file found for stage "${stage}". ` +
        `Checked .agents/skills/**/tasks/${stage}.md with config: ${JSON.stringify(configSummary)}`,
    );
  }

  matches.sort((a, b) => b.specificity - a.specificity);
  return matches[0].path;
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
 * Expand all file path templates from a task file's frontmatter.
 */
export function expandFilePaths(
  templates: string[],
  params: Record<string, unknown>,
  envMap: Record<string, string>,
): string[] {
  return templates.map((t) => expandFilePath(t, params, envMap));
}

// ── Config Resolution ───────────────────────────────────────────────

/**
 * Resolve workflow config rules and instructions for a stage.
 * Extension skills (from extensions[].skill in config) are injected into
 * config_instructions at lower priority than explicit stage instructions.
 */
export function resolveConfigForStage(
  stage: string,
  rawConfig: Record<string, unknown>,
): { config_rules: string[]; config_instructions: string[] } {
  const workflow = rawConfig.workflow as Record<string, unknown> | undefined;

  const rules = workflow?.rules as Record<string, unknown> | undefined;
  const tasks = workflow?.tasks as Record<string, unknown> | undefined;

  const configRules = rules?.[stage];
  const configInstructions = tasks?.[stage];

  const explicitInstructions = Array.isArray(configInstructions) ? configInstructions.map(String) : [];

  const extensionSkills = getExtensionSkillIds(normalizeExtensions(rawConfig['extensions']))
    .split(',')
    .filter(Boolean);

  return {
    config_rules: Array.isArray(configRules) ? configRules.map(String) : [],
    config_instructions: [...explicitInstructions, ...extensionSkills],
  };
}


// ── Depends-On Computation ──────────────────────────────────────────

/**
 * Compute depends_on arrays from stage ordering.
 * All tasks in stage N depend on all task IDs in stage N-1.
 */
export function computeDependsOn(stages: string[], tasksByStage: Map<string, string[]>): Map<string, string[]> {
  const result = new Map<string, string[]>();

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const taskIds = tasksByStage.get(stage) ?? [];
    const prevStage = i > 0 ? stages[i - 1] : null;
    const deps = prevStage ? (tasksByStage.get(prevStage) ?? []) : [];

    for (const taskId of taskIds) {
      result.set(taskId, deps);
    }
  }

  return result;
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
  stage: string,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...itemParams };

  for (const [key, defaultValue] of Object.entries(schemaParams)) {
    if (merged[key] !== undefined) continue;

    if (defaultValue === null) {
      throw new Error(`Missing required param '${key}' for stage '${stage}'`);
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
  const baseName = stage.includes(':') ? stage.split(':')[1] : stage;

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

// ── Stage Resolution (all stages at once) ───────────────────────────

export interface ResolvedStage {
  task_file: string;
  rules: string[];
  config_rules: string[];
  config_instructions: string[];
}

export interface ResolvedStages {
  title: string;
  stages: string[];
  stage_resolved: Record<string, ResolvedStage>;
}

/**
 * Resolve ALL stages from a workflow file at create time.
 */
export function resolveAllStages(
  workflowFilePath: string,
  config: DesignbookConfig,
  rawConfig: Record<string, unknown>,
  agentsDir: string,
): ResolvedStages {
  const wfFm = parseFrontmatter(workflowFilePath) as WorkflowFrontmatter | null;
  if (!wfFm?.workflow?.stages) {
    throw new Error(`No workflow.stages found in frontmatter of ${workflowFilePath}`);
  }

  const allStages = wfFm.workflow.stages;
  const stageResolved: Record<string, ResolvedStage> = {};

  for (const stage of allStages) {
    const taskFilePath = resolveTaskFile(stage, config, agentsDir);
    const ruleFiles = matchRuleFiles(stage, config, agentsDir);
    const { config_rules, config_instructions } = resolveConfigForStage(stage, rawConfig);

    stageResolved[stage] = {
      task_file: taskFilePath,
      rules: ruleFiles,
      config_rules,
      config_instructions,
    };
  }

  return {
    title: wfFm.workflow.title ?? '',
    stages: allStages,
    stage_resolved: stageResolved,
  };
}

// ── Main Resolution Function ────────────────────────────────────────

/**
 * Infer task type from the stage name.
 */
export function inferTaskType(stage: string): string {
  const base = stage.includes(':') ? stage.split(':')[1] : stage;
  if (base.includes('component') || base.includes('shell')) return 'component';
  if (base.includes('scene')) return 'scene';
  if (base.includes('token')) return 'tokens';
  if (base.includes('css') || base.includes('generate')) return 'css';
  if (base.includes('data') || base.includes('model') || base.includes('sample')) return 'data';
  if (base.includes('entity') || base.includes('map') || base.includes('collect')) return 'view-mode';
  if (base.includes('validate')) return 'validation';
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
  const base = stage.includes(':') ? stage.split(':')[1] : stage;
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
 * Resolve a full workflow plan from items + pre-resolved stage data.
 */
export function resolveWorkflowPlan(
  workflowFilePath: string,
  globalParams: Record<string, unknown>,
  items: PlanItem[],
  config: DesignbookConfig,
  rawConfig: Record<string, unknown>,
  agentsDir: string,
  stageResolved?: Record<string, ResolvedStage>,
): ResolvedPlan {
  const wfFm = parseFrontmatter(workflowFilePath) as WorkflowFrontmatter | null;
  if (!wfFm?.workflow?.stages) {
    throw new Error(`No workflow.stages found in frontmatter of ${workflowFilePath}`);
  }

  const allStages = wfFm.workflow.stages;
  const execStages = allStages.filter((s) => !s.endsWith(':intake'));

  for (const item of items) {
    if (!execStages.includes(item.stage)) {
      throw new Error(`Item stage "${item.stage}" not found in workflow stages: [${execStages.join(', ')}]`);
    }
  }

  const envMap = buildEnvMap(config);

  const itemsByStage = new Map<string, PlanItem[]>();
  for (const stage of execStages) {
    itemsByStage.set(stage, []);
  }
  for (const item of items) {
    itemsByStage.get(item.stage)!.push(item);
  }

  const tasks: ResolvedTask[] = [];
  const taskIdsByStage = new Map<string, string[]>();

  for (const stage of execStages) {
    const stageItems = itemsByStage.get(stage) ?? [];
    if (stageItems.length === 0) continue;

    taskIdsByStage.set(stage, []);

    const resolved = stageResolved?.[stage];
    const taskFilePath = resolved?.task_file ?? resolveTaskFile(stage, config, agentsDir);
    const taskFm = parseFrontmatter(taskFilePath) as TaskFileFrontmatter | null;
    const schemaParams = taskFm?.params ?? {};
    const fileTemplates = taskFm?.files ?? [];

    const sharedRuleFiles = resolved?.rules ?? matchRuleFiles(stage, config, agentsDir);

    const configData = resolved
      ? { config_rules: resolved.config_rules, config_instructions: resolved.config_instructions }
      : resolveConfigForStage(stage, rawConfig);

    for (const item of stageItems) {
      const mergedParams = validateAndMergeParams(item.params ?? {}, schemaParams, stage);
      const taskId = generateTaskId(stage, mergedParams, schemaParams);
      const title = generateTaskTitle(stage, mergedParams, schemaParams);
      const type = inferTaskType(stage);
      const files = expandFilePaths(fileTemplates, mergedParams, envMap);
      const itemRuleFiles = sharedRuleFiles;

      tasks.push({
        id: taskId,
        title,
        type,
        stage,
        depends_on: [],
        params: mergedParams,
        task_file: taskFilePath,
        rules: itemRuleFiles,
        config_rules: configData.config_rules,
        config_instructions: configData.config_instructions,
        files,
      });

      taskIdsByStage.get(stage)!.push(taskId);
    }
  }

  deduplicateTaskIds(tasks);

  taskIdsByStage.clear();
  for (const task of tasks) {
    if (!taskIdsByStage.has(task.stage)) {
      taskIdsByStage.set(task.stage, []);
    }
    taskIdsByStage.get(task.stage)!.push(task.id);
  }

  const depsMap = computeDependsOn(execStages, taskIdsByStage);
  for (const task of tasks) {
    task.depends_on = depsMap.get(task.id) ?? [];
  }

  return {
    params: globalParams,
    stages: execStages,
    tasks,
  };
}
