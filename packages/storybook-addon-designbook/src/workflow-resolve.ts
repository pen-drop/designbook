/**
 * Workflow plan resolution engine.
 *
 * Resolves task files, file paths, dependencies, rules, and config
 * constraints at plan time — so subagents receive fully-resolved tasks.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { DesignbookConfig } from './config.js';

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

interface TaskFileFrontmatter {
  when?: Record<string, unknown>;
  params?: Record<string, unknown>;
  files?: string[];
  reads?: Array<{ path: string; workflow?: string }>;
}

interface RuleFileFrontmatter {
  when?: Record<string, unknown>;
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
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    return (parseYaml(match[1]) as Record<string, unknown>) ?? {};
  } catch {
    return null;
  }
}

// ── Environment Variable Map ───────────────────────────────────────

/**
 * Build a map of DESIGNBOOK_* env vars from config for template expansion.
 */
export function buildEnvMap(config: DesignbookConfig): Record<string, string> {
  const env: Record<string, string> = {};
  env['DESIGNBOOK_DIST'] = config.dist;
  if (config.tmp) env['DESIGNBOOK_TMP'] = String(config.tmp);
  if (config['css.app']) env['DESIGNBOOK_CSS_APP'] = String(config['css.app']);
  if (config['drupal.theme']) env['DESIGNBOOK_DRUPAL_THEME'] = String(config['drupal.theme']);
  // Derived: SDC provider from drupal.theme basename with - → _
  if (config['drupal.theme']) {
    env['DESIGNBOOK_SDC_PROVIDER'] = basename(String(config['drupal.theme'])).replace(/-/g, '_');
  }
  return env;
}

// ── 2.1: Task File Resolution ──────────────────────────────────────

/**
 * Resolve a stage name to a task file path.
 *
 * Named stages (skill:task format) resolve directly.
 * Generic stages scan all skills for matching task files,
 * apply `when` condition filtering, and select the most specific match.
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

  // Generic stage: scan all skills
  const skillsDir = resolve(agentsDir, 'skills');
  if (!existsSync(skillsDir)) {
    throw new Error(`Skills directory not found: ${skillsDir}`);
  }

  const candidates: Array<{ path: string; specificity: number }> = [];

  for (const skillDir of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!skillDir.isDirectory()) continue;
    const taskPath = resolve(skillsDir, skillDir.name, 'tasks', `${stage}.md`);
    if (!existsSync(taskPath)) continue;

    const fm = parseFrontmatter(taskPath) as TaskFileFrontmatter | null;
    const when = fm?.when;

    if (!when || Object.keys(when).length === 0) {
      // No conditions — universal fallback (specificity 0)
      candidates.push({ path: taskPath, specificity: 0 });
      continue;
    }

    // Check all when conditions against config
    let allMatch = true;
    let matchCount = 0;
    for (const [key, value] of Object.entries(when)) {
      const configValue = config[key];
      if (String(configValue) !== String(value)) {
        allMatch = false;
        break;
      }
      matchCount++;
    }

    if (allMatch) {
      candidates.push({ path: taskPath, specificity: matchCount });
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      `No task file found for stage "${stage}". ` +
        `Checked .agents/skills/*/tasks/${stage}.md with config: ${JSON.stringify({
          backend: config.technology,
          'frameworks.component': config['frameworks.component'],
          'frameworks.css': config['frameworks.css'],
        })}`,
    );
  }

  // Pick most specific (highest specificity)
  candidates.sort((a, b) => b.specificity - a.specificity);
  return candidates[0].path;
}

// ── 2.2: File Path Expansion ───────────────────────────────────────

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

// ── 2.3: Rule File Matching ────────────────────────────────────────

/**
 * Scan all rule files and return paths matching the given stage and config.
 */
export function matchRuleFiles(stage: string, config: DesignbookConfig, agentsDir: string): string[] {
  const skillsDir = resolve(agentsDir, 'skills');
  if (!existsSync(skillsDir)) return [];

  const matched: string[] = [];

  for (const skillDir of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!skillDir.isDirectory()) continue;
    const rulesDir = resolve(skillsDir, skillDir.name, 'rules');
    if (!existsSync(rulesDir)) continue;

    for (const ruleFile of readdirSync(rulesDir, { withFileTypes: true })) {
      if (!ruleFile.isFile() || !ruleFile.name.endsWith('.md')) continue;
      const rulePath = resolve(rulesDir, ruleFile.name);

      const fm = parseFrontmatter(rulePath) as RuleFileFrontmatter | null;
      const when = fm?.when;

      // No when block or empty when → applies to all stages (check config conditions)
      if (!when || Object.keys(when).length === 0) {
        matched.push(rulePath);
        continue;
      }

      // Check stages constraint
      const stages = when.stages;
      if (stages !== undefined) {
        const stageList = Array.isArray(stages) ? stages : [stages];
        if (!stageList.includes(stage)) continue;
      }

      // Check all other when conditions against config
      let allMatch = true;
      for (const [key, value] of Object.entries(when)) {
        if (key === 'stages') continue; // already handled

        // Config conditions: check against flattened config
        const configValue = config[key];
        if (configValue === undefined || String(configValue) !== String(value)) {
          allMatch = false;
          break;
        }
      }

      if (allMatch) {
        matched.push(rulePath);
      }
    }
  }

  return matched;
}

// ── 2.4: Config Resolution ─────────────────────────────────────────

/**
 * Resolve workflow config rules and instructions for a stage.
 */
export function resolveConfigForStage(
  stage: string,
  rawConfig: Record<string, unknown>,
): { config_rules: string[]; config_instructions: string[] } {
  const workflow = rawConfig.workflow as Record<string, unknown> | undefined;
  if (!workflow) return { config_rules: [], config_instructions: [] };

  const rules = workflow.rules as Record<string, unknown> | undefined;
  const tasks = workflow.tasks as Record<string, unknown> | undefined;

  const configRules = rules?.[stage];
  const configInstructions = tasks?.[stage];

  return {
    config_rules: Array.isArray(configRules) ? configRules.map(String) : [],
    config_instructions: Array.isArray(configInstructions) ? configInstructions.map(String) : [],
  };
}

// ── 2.5: Depends-On Computation ────────────────────────────────────

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

// ── 2.6: Params Validation ─────────────────────────────────────────

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
    if (merged[key] !== undefined) continue; // provided by item

    if (defaultValue === null) {
      // Required param (declared as ~)
      throw new Error(`Missing required param '${key}' for stage '${stage}'`);
    }

    // Optional param — use default
    merged[key] = defaultValue;
  }

  return merged;
}

// ── 2.7: Task ID Generation ────────────────────────────────────────

/**
 * Generate a task ID from stage name and params.
 * Uses the first string-valued param as discriminator.
 * Example: create-component + {component: "button"} → "create-component-button"
 */
export function generateTaskId(stage: string, params: Record<string, unknown>): string {
  // Use stage base name (remove skill: prefix if present)
  const baseName = stage.includes(':') ? stage.split(':')[1] : stage;

  // Find first string param value as discriminator
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
 * Returns per-stage resolution (task_file, rules, config) to store in tasks.yml.
 * Both intake and execution stages are resolved — scanning happens once.
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

// ── 2.8: Main Resolution Function ─────────────────────────────────

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
export function generateTaskTitle(stage: string, params: Record<string, unknown>): string {
  const base = stage.includes(':') ? stage.split(':')[1] : stage;
  const words = base.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Find first string param for context
  for (const value of Object.values(params)) {
    if (typeof value === 'string' && value.length > 0) {
      return `${words}: ${value}`;
    }
  }

  return words;
}

/**
 * Resolve a full workflow plan from items + pre-resolved stage data.
 *
 * Two modes:
 * - With stageResolved: uses pre-resolved stage data from tasks.yml (preferred)
 * - Without: resolves stages on the fly from workflow file (legacy/fallback)
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
  // 1. Read workflow file frontmatter → stages array
  const wfFm = parseFrontmatter(workflowFilePath) as WorkflowFrontmatter | null;
  if (!wfFm?.workflow?.stages) {
    throw new Error(`No workflow.stages found in frontmatter of ${workflowFilePath}`);
  }

  // Filter out intake stages
  const allStages = wfFm.workflow.stages;
  const execStages = allStages.filter((s) => !s.endsWith(':intake'));

  // Validate items: all item stages must be in the workflow's stages list
  for (const item of items) {
    if (!execStages.includes(item.stage)) {
      throw new Error(`Item stage "${item.stage}" not found in workflow stages: [${execStages.join(', ')}]`);
    }
  }

  const envMap = buildEnvMap(config);

  // 2. Group items by stage (preserving order from workflow stages)
  const itemsByStage = new Map<string, PlanItem[]>();
  for (const stage of execStages) {
    itemsByStage.set(stage, []);
  }
  for (const item of items) {
    itemsByStage.get(item.stage)!.push(item);
  }

  // 3. Resolve each item into a task
  const tasks: ResolvedTask[] = [];
  const taskIdsByStage = new Map<string, string[]>();

  for (const stage of execStages) {
    const stageItems = itemsByStage.get(stage) ?? [];
    if (stageItems.length === 0) continue;

    taskIdsByStage.set(stage, []);

    // Use pre-resolved stage data if available, otherwise resolve on the fly
    const resolved = stageResolved?.[stage];
    const taskFilePath = resolved?.task_file ?? resolveTaskFile(stage, config, agentsDir);
    const taskFm = parseFrontmatter(taskFilePath) as TaskFileFrontmatter | null;
    const schemaParams = taskFm?.params ?? {};
    const fileTemplates = taskFm?.files ?? [];

    const ruleFiles = resolved?.rules ?? matchRuleFiles(stage, config, agentsDir);
    const configData = resolved
      ? { config_rules: resolved.config_rules, config_instructions: resolved.config_instructions }
      : resolveConfigForStage(stage, rawConfig);

    for (const item of stageItems) {
      const mergedParams = validateAndMergeParams(item.params ?? {}, schemaParams, stage);
      const taskId = generateTaskId(stage, mergedParams);
      const title = generateTaskTitle(stage, mergedParams);
      const type = inferTaskType(stage);
      const files = expandFilePaths(fileTemplates, mergedParams, envMap);

      tasks.push({
        id: taskId,
        title,
        type,
        stage,
        depends_on: [],
        params: mergedParams,
        task_file: taskFilePath,
        rules: ruleFiles,
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
