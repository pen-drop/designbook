/**
 * Planning catalogue composition.
 *
 * Combines source discovery (planning-sources) with schema resolution
 * (planning-schema, schema-block, workflow-schema-merge) into the per-step
 * catalogue the authoring agent reads. Saved workflow execution does not use
 * this module.
 */

import { resolve } from 'node:path';
import type { DesignbookConfig } from './config.js';
import type { SkillSource } from './skill-sources.js';
import { buildSchemaBlock, type SchemaBlock } from './schema-block.js';
import { computeMergedSchema } from './workflow-schema-merge.js';
import {
  buildEnvMap,
  matchBlueprintFiles,
  matchRuleFiles,
  parseFrontmatter,
  resolveConfigForStep,
  resolveTaskFilesRich,
} from './planning-sources.js';
import { resolveParamsRef, validateParamFormats } from './planning-schema.js';

export { buildEnvMap, parseFrontmatter } from './planning-sources.js';

// ── Types ──────────────────────────────────────────────────────────

interface StageDefinition {
  steps?: string[];
  domain?: string[];
}

interface WorkflowFrontmatter {
  title?: string;
  stages?: Record<string, StageDefinition>;
}

export interface ResolvedStep {
  task_file: string;
  rules: string[];
  blueprints: string[];
  config_rules: string[];
  config_instructions: string[];
  /** Unified schema block (params, result, definitions). Only present when the task declares params/result. */
  schema?: SchemaBlock;
}

export interface ResolvedSteps {
  stages: Record<string, StageDefinition>;
  step_resolved: Record<string, ResolvedStep | ResolvedStep[]>;
}

// ── Helpers ────────────────────────────────────────────────────────

function mergeSnapshot(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    const current = target[key];
    if (key === 'required' && Array.isArray(current) && Array.isArray(value))
      target[key] = [...new Set([...current, ...value])];
    else if (
      current &&
      value &&
      typeof current === 'object' &&
      typeof value === 'object' &&
      !Array.isArray(current) &&
      !Array.isArray(value)
    )
      mergeSnapshot(current as Record<string, unknown>, value as Record<string, unknown>);
    else target[key] = value;
  }
}

/**
 * Step names a rule or blueprint may declare for this step: the step itself plus
 * its workflow-qualified and bare variants.
 */
function stepNameVariants(step: string, workflowId?: string): string[] {
  const variants = [step];
  if (step.includes(':')) {
    const base = step.split(':').pop()!;
    if (base !== step) variants.push(base);
  } else if (workflowId) {
    variants.push(`${workflowId}:${step}`);
  }
  return variants;
}

/** Union of the domains declared by the step's task files and its stage. */
function effectiveDomainsFor(taskFilePaths: string[], stages: Record<string, StageDefinition>, step: string): string[] {
  const domains: string[] = [];
  const add = (value: unknown) => {
    for (const d of Array.isArray(value) ? value.map(String) : [String(value)]) {
      if (!domains.includes(d)) domains.push(d);
    }
  };
  for (const taskFile of taskFilePaths) {
    const taskFm = parseFrontmatter(taskFile);
    if (taskFm?.domain !== undefined) add(taskFm.domain);
  }
  for (const stage of Object.values(stages)) {
    if (stage.steps?.includes(step) && stage.domain) add(stage.domain);
  }
  return domains;
}

/**
 * Reject task files whose `params:` still use the pre-JSON-Schema flat map, so the
 * authoring agent fails at discovery instead of on an unvalidatable definition.
 */
function assertParamsAreJsonSchema(taskFilePaths: string[], skillsRoot: string, sources?: SkillSource[]): void {
  for (const taskFile of taskFilePaths) {
    let params = parseFrontmatter(taskFile)?.params as Record<string, unknown> | undefined;
    if (!params) continue;
    if ('$ref' in params) params = resolveParamsRef(params, taskFile, skillsRoot, sources);
    validateParamFormats(params, taskFile);
  }
}

// ── Step Resolution (all steps at once) ────────────────────────────

/**
 * Resolve every step of a workflow template into its effective planning blocks.
 */
export async function resolveAllStages(
  workflowFilePath: string,
  config: DesignbookConfig,
  rawConfig: Record<string, unknown>,
  agentsDir: string,
  sources?: SkillSource[],
): Promise<ResolvedSteps> {
  const wfFm = parseFrontmatter(workflowFilePath) as WorkflowFrontmatter | null;
  const stages = wfFm?.stages;
  if (!stages) throw new Error(`No stages found in frontmatter of ${workflowFilePath}`);

  // Workflow ID from file path (e.g. vision/workflows/vision.md → "vision")
  const workflowId = workflowFilePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.md$/, '');
  const skillsRoot = resolve(agentsDir, 'skills');
  const envMap = buildEnvMap(config);

  const stepResolved: Record<string, ResolvedStep | ResolvedStep[]> = {};
  const collectedSchemas: Record<string, object> = {};
  const allExtensionFiles: string[] = [];

  for (const step of Object.values(stages).flatMap((stage) => stage.steps ?? [])) {
    let resolvedTaskFiles = resolveTaskFilesRich(step, config, agentsDir, sources);
    // If the plain step didn't match, try the workflow-qualified name (e.g. "intake" → "design-shell:intake")
    if (resolvedTaskFiles.length === 0 && !step.includes(':') && workflowId) {
      resolvedTaskFiles = resolveTaskFilesRich(`${workflowId}:${step}`, config, agentsDir, sources);
    }
    if (resolvedTaskFiles.length === 0) {
      console.warn(`[Designbook] workflow: step "${step}" skipped — no matching task file`);
      continue;
    }
    const taskFilePaths = resolvedTaskFiles.map((r) => r.path);
    assertParamsAreJsonSchema(taskFilePaths, skillsRoot, sources);

    const domains = effectiveDomainsFor(taskFilePaths, stages, step);
    const effectiveDomains = domains.length > 0 ? domains : undefined;

    const ruleFiles: string[] = [];
    const blueprintFiles: string[] = [];
    for (const name of stepNameVariants(step, workflowId)) {
      for (const rule of matchRuleFiles(name, config, agentsDir, undefined, effectiveDomains, sources)) {
        if (!ruleFiles.includes(rule)) ruleFiles.push(rule);
      }
      for (const blueprint of matchBlueprintFiles(name, config, agentsDir, undefined, effectiveDomains, sources)) {
        if (!blueprintFiles.includes(blueprint)) blueprintFiles.push(blueprint);
      }
    }
    for (const file of [...blueprintFiles, ...ruleFiles]) {
      if (!allExtensionFiles.includes(file)) allExtensionFiles.push(file);
    }

    const { config_rules, config_instructions } = resolveConfigForStep(step, rawConfig);

    // The primary task file owns the step's params/result contract.
    const primaryTaskFile = taskFilePaths[0]!;
    const taskFm = parseFrontmatter(primaryTaskFile);
    const schemaBlock = await buildSchemaBlock({
      params: taskFm?.params as Record<string, unknown> | undefined,
      result: taskFm?.result as Record<string, unknown> | undefined,
      taskFilePath: primaryTaskFile,
      skillsRoot,
      envMap,
      sources,
    });

    // Schema composition: merge base result schemas with rule/blueprint extensions
    const resultProps = (taskFm?.result as Record<string, unknown> | undefined)?.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    let mergedSchema: Record<string, object> | undefined;
    if (resultProps && (ruleFiles.length > 0 || blueprintFiles.length > 0)) {
      const baseResult: Record<string, { schema?: object }> = {};
      const refMap: Record<string, string> = {};
      for (const [key, declaration] of Object.entries(resultProps)) {
        // Build the inline schema from the result declaration (excluding path/$ref/validators).
        // Always include the result key — even $ref-only entries need a merge target so a
        // blueprint's extends can contribute properties (e.g. component tokens).
        const { path: _path, $ref: ref, validators: _validators, ...schemaProps } = declaration;
        const definitionName = schemaBlock.result[key]?.$ref?.replace('#/definitions/', '');
        baseResult[key] = {
          schema: definitionName ? structuredClone(schemaBlock.definitions[definitionName] ?? {}) : schemaProps,
        };
        // Map result key → definition name for schema-name-based matching
        if (typeof ref === 'string') {
          const defName = ref.split('#/').pop()?.split('/').pop();
          if (defName) refMap[key] = defName;
        }
      }
      if (Object.keys(baseResult).length > 0) {
        mergedSchema = computeMergedSchema(baseResult, {
          blueprintFiles,
          ruleFiles,
          skillsRoot,
          schemas: collectedSchemas,
          refMap,
          sources,
        });
      }
    }

    // Merge schema composition results into schema block definitions
    for (const [resultKey, composedSchema] of Object.entries(mergedSchema ?? {})) {
      const resultEntry = schemaBlock.result[resultKey];
      if (resultEntry?.$ref) {
        // Result references a definition — merge into that definition
        const defName = resultEntry.$ref.replace('#/definitions/', '');
        if (schemaBlock.definitions[defName]) {
          mergeSnapshot(
            schemaBlock.definitions[defName] as Record<string, unknown>,
            composedSchema as Record<string, unknown>,
          );
        }
      } else {
        // Inline result — store composed schema in definitions keyed by result key
        schemaBlock.definitions[resultKey] = composedSchema;
        if (resultEntry) resultEntry.$ref = `#/definitions/${resultKey}`;
      }
    }

    const hasSchema =
      Object.keys(schemaBlock.definitions).length > 0 ||
      Object.keys(schemaBlock.params).length > 0 ||
      Object.keys(schemaBlock.result).length > 0;

    const block = (taskFile: string): ResolvedStep => ({
      task_file: taskFile,
      rules: ruleFiles,
      blueprints: blueprintFiles,
      config_rules,
      config_instructions,
      ...(hasSchema ? { schema: schemaBlock } : {}),
    });

    // Multiple tasks per step are ordered by priority (from deduplicateByNameAs).
    stepResolved[step] = taskFilePaths.length === 1 ? block(taskFilePaths[0]!) : taskFilePaths.map(block);
  }

  return { stages, step_resolved: stepResolved };
}
