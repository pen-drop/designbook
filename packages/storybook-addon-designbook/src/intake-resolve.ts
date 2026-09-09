/**
 * Intake context resolution.
 *
 * For a workflow, resolves the planning context an intake skill needs before it
 * writes an MD plan: the rules/blueprints tagged `<wf>:intake` or `design.intake`,
 * the per-step task palette with frozen output contracts, the definitions those
 * contracts reference, and an ordered read list — all config-filtered.
 *
 * The canonical skill files remain the single maintained source; embedding here is
 * machine-derived, not a second maintained copy. The existing trigger/filter
 * matcher is reused verbatim; `<wf>:intake` is fed into it as a synthetic step.
 */

import { readFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { findConfig, loadConfig, resolveSkillsRoot, type DesignbookConfig } from './config.js';
import { resolveSkillSources } from './skill-resolver.js';
import type { SkillSource } from './skill-sources.js';
import { resolveWorkflowFile } from './cli/workflow-discovery.js';
import { matchBlueprintFiles, matchRuleFiles, parseFrontmatter, resolveTaskFilesRich } from './planning-sources.js';
import { buildEnvMap } from './planning-sources.js';
import { buildSchemaBlock, type SchemaEntry } from './schema-block.js';

export interface EmbeddedContent {
  source: string;
  content: string;
}
export interface ContextEntry extends EmbeddedContent {
  key: string;
  kind: 'rule' | 'blueprint';
}
export interface OutputContract {
  required: boolean;
  schema: unknown;
  submission: string;
  validators: string[];
  path?: string;
}
export interface TaskContract {
  name: string;
  step: string;
  outputs: Record<string, OutputContract>;
  source: string;
}
export interface IntakeStep {
  /** Execution step id, or the synthetic `<wf>:intake` planning step. */
  name: string;
  /** Keys into the shared context registry — per-step references, never copies. */
  context: string[];
  /** Ordered context keys to read before dependent decisions (rules → blueprints). */
  read_order: string[];
  /** Task-palette candidates for this step. */
  tasks: TaskContract[];
}
export interface OpenSelector {
  name: string;
  variants: string[];
  resolved: false;
}
export interface GatedGroup {
  selector: string;
  variant: string;
  context: ContextEntry[];
  tasks: TaskContract[];
}
export interface IntakeContext {
  workflow: string;
  config: Record<string, unknown>;
  /** Frozen `#/definitions/<Name>` pulled transitively from schemas.yml. */
  definitions: Record<string, unknown>;
  /** Shared registry, deduplicated by source; repetition is referenced, not copied. */
  context: Record<string, ContextEntry>;
  steps: IntakeStep[];
  open_selectors: OpenSelector[];
  gated: GatedGroup[];
}

export interface ResolveIntakeOptions {
  /** Workspace dir to load config + skills from (defaults to the walked-up config dir). */
  configDir?: string;
  /** Skills root (dir containing `skills/`). Overrides `configDir` resolution. */
  agentsDir?: string;
  /** Explicit config; when omitted it is loaded from `configDir`. */
  config?: DesignbookConfig;
  /** Plugin skill sources; when omitted they are resolved from `configDir`. */
  sources?: SkillSource[];
}

interface StageDef {
  steps?: string[];
  domain?: string[] | string;
}
interface OpenSelectorDecl {
  name: string;
  variants: string[];
  gates?: Record<string, { steps?: string[] }>;
}
interface WorkflowFrontmatter {
  stages?: Record<string, StageDef>;
  intake?: { open_selectors?: OpenSelectorDecl[] };
}

/** Strip binding/preparation keys, leaving the JSON Schema an output contract carries. */
function schemaOf(entry: SchemaEntry): unknown {
  const {
    path: _path,
    exists: _exists,
    content: _content,
    validators: _validators,
    submission: _submission,
    workflow: _workflow,
    resolve: _resolve,
    from: _from,
    prepare: _prepare,
    generator: _generator,
    ...schema
  } = entry;
  return schema;
}

/** Union of domains a step inherits from its task files and its stage. */
function effectiveDomainsFor(taskFiles: string[], stages: Record<string, StageDef>, step: string): string[] {
  const domains: string[] = [];
  const add = (value: unknown) => {
    for (const d of Array.isArray(value) ? value.map(String) : [String(value)]) {
      if (!domains.includes(d)) domains.push(d);
    }
  };
  for (const file of taskFiles) {
    const fm = parseFrontmatter(file);
    if (fm?.domain !== undefined) add(fm.domain);
  }
  for (const stage of Object.values(stages)) {
    if (stage.steps?.includes(step) && stage.domain) add(stage.domain);
  }
  return domains;
}

/** A stable, source-derived registry that embeds each file's canonical body once. */
class ContextRegistry {
  private readonly bySource = new Map<string, ContextEntry>();
  private readonly usedKeys = new Set<string>();

  embed(source: string, kind: 'rule' | 'blueprint'): string {
    const existing = this.bySource.get(source);
    if (existing) return existing.key;
    let key = `ctx:${basename(source).replace(/\.md$/, '')}`;
    if (this.usedKeys.has(key)) {
      let i = 2;
      while (this.usedKeys.has(`${key}-${i}`)) i++;
      key = `${key}-${i}`;
    }
    this.usedKeys.add(key);
    const entry: ContextEntry = { key, kind, source, content: readFileSync(source, 'utf8') };
    this.bySource.set(source, entry);
    return key;
  }

  toRecord(): Record<string, ContextEntry> {
    const out: Record<string, ContextEntry> = {};
    for (const entry of this.bySource.values()) out[entry.key] = entry;
    return out;
  }
}

export async function resolveIntakeContext(
  workflowId: string,
  opts: ResolveIntakeOptions = {},
): Promise<IntakeContext> {
  const configPath = findConfig();
  const configDir = opts.configDir ?? (configPath ? dirname(configPath) : process.cwd());
  const config = opts.config ?? loadConfig(opts.configDir);
  const agentsDir = opts.agentsDir ?? resolveSkillsRoot(configDir);
  const sources = opts.sources ?? resolveSkillSources(configDir, { config });

  const skillsRoot = `${agentsDir}/skills`;
  const envMap = buildEnvMap(config);

  const workflowFile = resolveWorkflowFile(workflowId, agentsDir, sources);
  const wfFm = parseFrontmatter(workflowFile) as WorkflowFrontmatter | null;
  const stages = wfFm?.stages ?? {};
  const executionSteps = Object.values(stages).flatMap((stage) => stage.steps ?? []);

  // Open selectors the intake must resolve before it can freeze the steps they gate.
  const selectorDecls = wfFm?.intake?.open_selectors ?? [];
  const openSelectors: OpenSelector[] = selectorDecls.map((s) => ({
    name: s.name,
    variants: s.variants,
    resolved: false,
  }));
  // Map each gated execution step → its (selector, variant) so it never lands flat.
  const gateOf = new Map<string, { selector: string; variant: string }>();
  for (const decl of selectorDecls) {
    for (const [variant, gate] of Object.entries(decl.gates ?? {})) {
      for (const step of gate.steps ?? []) gateOf.set(step, { selector: decl.name, variant });
    }
  }

  const registry = new ContextRegistry();
  const definitions: Record<string, unknown> = {};

  const freezeTask = async (step: string): Promise<TaskContract[]> => {
    let resolved = resolveTaskFilesRich(step, config, agentsDir, sources);
    if (resolved.length === 0 && !step.includes(':')) {
      resolved = resolveTaskFilesRich(`${workflowId}:${step}`, config, agentsDir, sources);
    }
    const contracts: TaskContract[] = [];
    for (const taskFile of resolved.map((r) => r.path)) {
      const fm = parseFrontmatter(taskFile);
      const block = await buildSchemaBlock({
        params: fm?.params as Record<string, unknown> | undefined,
        result: fm?.result as Record<string, unknown> | undefined,
        taskFilePath: taskFile,
        skillsRoot,
        envMap,
        sources,
      });
      Object.assign(definitions, block.definitions);
      const requiredList = ((fm?.result as { required?: string[] } | undefined)?.required ?? []) as string[];
      const outputs: Record<string, OutputContract> = {};
      for (const [key, entry] of Object.entries(block.result)) {
        outputs[key] = {
          required: requiredList.includes(key),
          schema: schemaOf(entry),
          submission: (entry.submission as string | undefined) ?? 'data',
          validators: (entry.validators as string[] | undefined) ?? [],
          ...(entry.path ? { path: entry.path as string } : {}),
        };
      }
      contracts.push({ name: basename(taskFile).replace(/\.md$/, ''), step, outputs, source: taskFile });
    }
    return contracts;
  };

  const matchFiles = (
    step: string,
    effectiveDomains?: string[],
  ): Array<{ source: string; kind: 'rule' | 'blueprint' }> => [
    ...matchRuleFiles(step, config, agentsDir, undefined, effectiveDomains, sources).map((source) => ({
      source,
      kind: 'rule' as const,
    })),
    ...matchBlueprintFiles(step, config, agentsDir, undefined, effectiveDomains, sources).map((source) => ({
      source,
      kind: 'blueprint' as const,
    })),
  ];

  const steps: IntakeStep[] = [];
  const gatedByGroup = new Map<string, GatedGroup>();

  // Synthetic intake planning step: resolves `<wf>:intake`-tagged and
  // `design.intake`-domain rules/blueprints that inform structural decisions.
  const intakeStep = `${workflowId}:intake`;
  const intakeContext = matchFiles(intakeStep, ['design.intake']).map((f) => registry.embed(f.source, f.kind));
  steps.push({ name: intakeStep, context: intakeContext, read_order: intakeContext, tasks: [] });

  // Execution steps carry the task palette plus their step-scoped context.
  for (const step of executionSteps) {
    const tasks = await freezeTask(step);
    const domains = effectiveDomainsFor(
      tasks.map((t) => t.source),
      stages,
      step,
    );
    const files = matchFiles(step, domains.length > 0 ? domains : undefined);

    const gate = gateOf.get(step);
    if (gate) {
      // Gated: hold the context/tasks under the selector variant, out of the flat set,
      // so an unresolved selector never yields a misleadingly complete rule set.
      const groupKey = `${gate.selector}::${gate.variant}`;
      const group =
        gatedByGroup.get(groupKey) ??
        (() => {
          const g: GatedGroup = { selector: gate.selector, variant: gate.variant, context: [], tasks: [] };
          gatedByGroup.set(groupKey, g);
          return g;
        })();
      for (const f of files) {
        group.context.push({
          key: `ctx:${basename(f.source).replace(/\.md$/, '')}`,
          kind: f.kind,
          source: f.source,
          content: readFileSync(f.source, 'utf8'),
        });
      }
      group.tasks.push(...tasks);
      continue;
    }

    const context = files.map((f) => registry.embed(f.source, f.kind));
    steps.push({ name: step, context, read_order: context, tasks });
  }

  return {
    workflow: workflowId,
    config: config as Record<string, unknown>,
    definitions,
    context: registry.toRecord(),
    steps,
    open_selectors: openSelectors,
    gated: Array.from(gatedByGroup.values()),
  };
}
