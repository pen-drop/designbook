/**
 * Build an MD plan from an agent-authored task list.
 *
 * The agent passes only the decisions — the complete list of tasks with their
 * step, template, title and params. The CLI resolves the full intake context
 * itself (reading rule/blueprint/task bodies from disk), validates each task's
 * params against its `params_schema` and that every required step is covered,
 * embeds each rule/blueprint/task body once in a shared registry, freezes the
 * output contracts and definitions, computes the digest, and writes the plan.
 * The agent never handles the ~200 KB of embedded context.
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import Ajv from 'ajv';
import { resolveIntakeContext, type ResolveIntakeOptions, type TaskContract } from './intake-resolve.js';
import { interpolate } from './template/interpolate.js';
import {
  parsePlan,
  serializePlan,
  planDigest,
  type ContextEntry,
  type Plan,
  type PlanStep,
  type PlanTask,
} from './plan-document.js';

export interface TaskDecision {
  /** Execution step this task belongs to. */
  step: string;
  /** Task-template name from the palette to instantiate (may repeat, e.g. write-component). */
  task: string;
  title?: string;
  params?: Record<string, unknown>;
}
export interface TaskList {
  workflow: string;
  selectors?: Record<string, string>;
  tasks: TaskDecision[];
}
export interface BuildResult {
  plan: Plan | null;
  /** Canonical path the plan should be written to (`<DESIGNBOOK_DATA>/plans/<workflow>.plan.md`). */
  plan_path: string;
  errors: string[];
}

export async function buildPlan(taskList: TaskList, opts: ResolveIntakeOptions = {}): Promise<BuildResult> {
  const intake = await resolveIntakeContext(taskList.workflow, opts);
  const errors: string[] = [];

  const ajv = new Ajv({ allErrors: true, strict: false });
  for (const [name, schema] of Object.entries(intake.definitions))
    ajv.addSchema(schema as object, `#/definitions/${name}`);

  // The palette is every task the intake advertises — the step tasks AND the gated
  // (open-selector) tasks. The agent decides which come along; the build imposes no
  // fixed set. Gated tasks also carry the context to embed for their step.
  const palette = new Map<string, TaskContract>();
  for (const s of intake.steps) for (const t of s.tasks) palette.set(`${t.step}::${t.name}`, t);
  const gatedContextByStep = new Map<string, ContextEntry[]>();
  for (const g of intake.gated) {
    for (const t of g.tasks) {
      palette.set(`${t.step}::${t.name}`, t);
      const arr = gatedContextByStep.get(t.step) ?? [];
      arr.push(...g.context);
      gatedContextByStep.set(t.step, arr);
    }
  }

  // Shared registry: rule/blueprint bodies (from intake.context) + task bodies, each once.
  const registry: Record<string, ContextEntry> = {};
  const instrKeyBySource = new Map<string, string>();
  const usedKeys = new Set<string>();
  const embedTask = (source: string): string => {
    const existing = instrKeyBySource.get(source);
    if (existing) return existing;
    let key = `task:${basename(source).replace(/\.md$/, '')}`;
    if (usedKeys.has(key)) {
      let i = 2;
      while (usedKeys.has(`${key}-${i}`)) i++;
      key = `${key}-${i}`;
    }
    usedKeys.add(key);
    registry[key] = { key, kind: 'task', source, content: readFileSync(source, 'utf8') };
    instrKeyBySource.set(source, key);
    return key;
  };

  const byStep = new Map<string, PlanTask[]>();
  for (const d of taskList.tasks) {
    const contract = palette.get(`${d.step}::${d.task}`);
    if (!contract) {
      errors.push(`unknown task "${d.task}" for step "${d.step}"`);
      continue;
    }
    const params = d.params ?? {};
    const validate = ajv.compile({ ...contract.params_schema, definitions: intake.definitions });
    if (!validate(params))
      errors.push(`task "${d.task}" (${d.title ?? ''}) params: ${ajv.errorsText(validate.errors)}`);
    // Resolve `{{ param }}` templates in each output path against this task's params,
    // so the frozen contract carries the concrete file path — not an unrendered template.
    const outputs: Record<string, PlanTask['contract']['outputs'][string]> = {};
    for (const [key, out] of Object.entries(contract.outputs)) {
      outputs[key] = out.path ? { ...out, path: await interpolate(out.path, params, { lenient: true }) } : out;
    }
    const planTask: PlanTask = {
      name: d.task,
      title: d.title ?? '',
      done: false,
      instruction: embedTask(contract.source),
      params,
      contract: { outputs },
      results: null,
    };
    if (!byStep.has(d.step)) byStep.set(d.step, []);
    byStep.get(d.step)!.push(planTask);
  }

  // No fixed-set completeness gate — the agent decides which tasks come along.
  // Hard requirements are enforced by `plan validate` (obligation rules), not here.
  if (errors.length > 0) return { plan: null, plan_path: intake.plan_path, errors };

  // Assemble steps in the order the agent listed them (first-seen). Each step embeds
  // its intake-step context keys, or its gated context entries for a selector step.
  const intakeStepMap = new Map(intake.steps.map((s) => [s.name, s]));
  const stepOrder: string[] = [];
  const seenStep = new Set<string>();
  for (const d of taskList.tasks) {
    if (!seenStep.has(d.step)) {
      seenStep.add(d.step);
      stepOrder.push(d.step);
    }
  }
  const steps: PlanStep[] = [];
  for (const stepName of stepOrder) {
    const tasks = byStep.get(stepName);
    if (!tasks || tasks.length === 0) continue;
    const contextKeys = new Set<string>();
    for (const key of intakeStepMap.get(stepName)?.context ?? []) {
      if (intake.context[key]) {
        registry[key] = intake.context[key]!;
        contextKeys.add(key);
      }
    }
    for (const entry of gatedContextByStep.get(stepName) ?? []) {
      registry[entry.key] = entry;
      contextKeys.add(entry.key);
    }
    steps.push({ name: stepName, context: [...contextKeys], tasks });
  }

  const draft: Plan = {
    workflow: taskList.workflow,
    digest: '',
    definitions: intake.definitions,
    context: registry,
    steps,
  };
  // Seal on the canonical parsed form: parsePlan trims embedded bodies, so the
  // digest must be computed over what execution will re-parse — not the raw
  // in-memory plan — or `plan done` would report a digest mismatch.
  const plan = parsePlan(serializePlan(draft));
  plan.digest = planDigest(plan);
  return { plan, plan_path: intake.plan_path, errors: [] };
}
