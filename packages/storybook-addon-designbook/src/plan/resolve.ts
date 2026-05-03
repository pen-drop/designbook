import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import fm from 'front-matter';
import { load as parseYaml } from 'js-yaml';
import { loadConfig, findConfig } from '../config.js';
import { resolveAllStages, parseFrontmatter, buildEnvMap, type ResolvedStep } from '../workflow-resolve.js';
import { buildSchemaBlock } from '../schema-block.js';
import { classifyInputs, type InputSource, type PriorTaskOutput } from './sources.js';
import { extractExample, derivePlaceholderFromSchema } from './examples.js';
import { buildArtifactIndex } from './reverse-index.js';
import type { RenderContext } from './render.js';

interface FmPayload {
  attributes: Record<string, unknown>;
  body: string;
}

function readBody(filePath: string): string {
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = fm<Record<string, unknown>>(raw) as unknown as FmPayload;
  return parsed.body.trim();
}

function readTriggerSteps(filePath: string): string[] {
  const fmAttrs = parseFrontmatter(filePath) as Record<string, unknown> | null;
  const trigger = fmAttrs?.trigger as { steps?: string[] } | undefined;
  return trigger?.steps ?? [];
}

/**
 * Strip reserved SchemaEntry fields (path, exists, content) and return a plain
 * JSON Schema object suitable for rendering and placeholder derivation.
 */
function cleanSchemaEntry(entry: Record<string, unknown>): Record<string, unknown> {
  const STRIP = new Set(['path', 'exists', 'content']);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(entry)) {
    if (STRIP.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Convert a SchemaBlock.result map into a JSON Schema object:
 * { type: 'object', properties: { <key>: <cleaned-entry>, ... } }
 */
function buildResultSchemaObject(resultMap: Record<string, Record<string, unknown>>): object {
  const props: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(resultMap)) {
    props[key] = cleanSchemaEntry(entry);
  }
  return { type: 'object', properties: props };
}

/**
 * Walk a schema and collect all `#/definitions/<name>` ref targets used in it.
 * Used to know which definitions a given task actually references.
 */
function collectRefNamesFromSchema(schema: unknown): Set<string> {
  const out = new Set<string>();
  walk(schema);
  return out;

  function walk(node: unknown): void {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    if (typeof obj.$ref === 'string') {
      const m = obj.$ref.match(/^#\/definitions\/(.+)$/);
      if (m) out.add(m[1]!);
    }
    Object.values(obj).forEach(walk);
  }
}

export async function buildRenderContext(workflowFilePath: string, agentsDir: string): Promise<RenderContext> {
  const config = loadConfig();
  const configPath = findConfig();
  const rawConfig = configPath ? ((parseYaml(readFileSync(configPath, 'utf-8')) as Record<string, unknown>) ?? {}) : {};
  const skillsRoot = resolvePath(agentsDir, 'skills');
  const envMap = buildEnvMap(config);

  const resolved = await resolveAllStages(workflowFilePath, config, rawConfig, agentsDir);
  const wfFm = (parseFrontmatter(workflowFilePath) as Record<string, unknown> | null) ?? {};
  const workflowId = workflowFilePath.split('/').pop()!.replace(/\.md$/, '');

  // Per-step state collectors
  const taskBodies = new Map<string, string>();
  const ruleBodies = new Map<string, string>();
  const blueprintBodies = new Map<string, string>();
  const taskFrontmatter = new Map<
    string,
    { result?: { properties?: Record<string, unknown> }; each?: Record<string, { expr?: string }> }
  >();
  const inputs = new Map<string, InputSource[]>();
  const outputSchemas = new Map<string, object>();
  const outputExamples = new Map<string, string>();
  const ruleTriggerSteps = new Map<string, string[]>();
  const blueprintTriggerSteps = new Map<string, string[]>();
  const schemaDefinitions: Record<string, object> = {};
  const schemaIndex: Record<string, Array<{ stage: string; task: string }>> = {};

  const stagesObj = (resolved.stages ?? {}) as Record<string, { steps?: string[]; each?: string }>;
  const stagesEntries = Object.entries(stagesObj);
  const priorOutputs: PriorTaskOutput[] = [];

  for (const [stageName, stageDef] of stagesEntries) {
    for (const step of stageDef.steps ?? []) {
      const raw = resolved.step_resolved[step];
      if (!raw) {
        throw new Error(
          `Step "${step}" in stage "${stageName}" has no matching task file — resolveAllStages skipped it.`,
        );
      }
      const list: ResolvedStep[] = Array.isArray(raw) ? raw : [raw];
      const rs = list[0]!;

      // Task body + frontmatter
      if (!taskBodies.has(rs.task_file)) {
        taskBodies.set(rs.task_file, readBody(rs.task_file));
      }
      const taskFm = (parseFrontmatter(rs.task_file) as Record<string, unknown> | null) ?? {};
      const paramsFm = (taskFm.params ?? {}) as Record<string, unknown>;
      const paramProps = ((paramsFm as { properties?: Record<string, unknown> }).properties ?? {}) as Record<
        string,
        unknown
      >;
      const each = (taskFm.each ?? {}) as Record<string, { expr?: string }>;
      const resultFm = taskFm.result as { properties?: Record<string, unknown> } | undefined;
      taskFrontmatter.set(rs.task_file, { result: resultFm, each });

      // Classify inputs for this step
      inputs.set(step, classifyInputs(paramProps, each, priorOutputs));

      // Output schema + example — only when result: has at least one property
      const resultProps = resultFm?.properties ?? {};
      if (Object.keys(resultProps).length > 0) {
        const schemaBlock = await buildSchemaBlock({
          params: paramsFm,
          result: resultFm as Record<string, unknown> | undefined,
          taskFilePath: rs.task_file,
          skillsRoot,
          envMap,
        });

        const schemaObj = buildResultSchemaObject(schemaBlock.result as Record<string, Record<string, unknown>>);
        outputSchemas.set(step, schemaObj);

        const body = taskBodies.get(rs.task_file)!;
        const example = extractExample(body) ?? derivePlaceholderFromSchema(schemaObj, schemaBlock.definitions);
        outputExamples.set(step, example);

        // Aggregate schema definitions + build per-schema reverse index
        const refsForThisTask = collectRefNamesFromSchema(schemaObj);
        for (const [defName, defSchema] of Object.entries(schemaBlock.definitions)) {
          if (!schemaDefinitions[defName]) {
            schemaDefinitions[defName] = defSchema;
          }
          if (refsForThisTask.has(defName)) {
            if (!schemaIndex[defName]) schemaIndex[defName] = [];
            schemaIndex[defName]!.push({ stage: stageName, task: step });
          }
        }

        priorOutputs.push({ stage: stageName, task: step, properties: resultProps });
      }

      // Rule + blueprint bodies and trigger steps
      for (const rulePath of rs.rules) {
        if (!ruleBodies.has(rulePath)) {
          ruleBodies.set(rulePath, readBody(rulePath));
          ruleTriggerSteps.set(rulePath, readTriggerSteps(rulePath));
        }
      }
      for (const bpPath of rs.blueprints) {
        if (!blueprintBodies.has(bpPath)) {
          blueprintBodies.set(bpPath, readBody(bpPath));
          blueprintTriggerSteps.set(bpPath, readTriggerSteps(bpPath));
        }
      }
    }
  }

  const ruleIndex = buildArtifactIndex(resolved.step_resolved, stagesObj, 'rule');
  const blueprintIndex = buildArtifactIndex(resolved.step_resolved, stagesObj, 'blueprint');

  return {
    workflowId,
    workflowFrontmatter: {
      title: wfFm.title as string | undefined,
      description: wfFm.description as string | undefined,
      params: wfFm.params as Record<string, { type?: string; default?: unknown }> | undefined,
      stages: stagesObj,
    },
    taskBodies,
    ruleBodies,
    blueprintBodies,
    taskFrontmatter,
    stepResolved: resolved.step_resolved,
    inputs,
    outputSchemas,
    outputExamples,
    ruleIndex,
    blueprintIndex,
    ruleTriggerSteps,
    blueprintTriggerSteps,
    schemaDefinitions,
    schemaIndex,
  };
}
