/**
 * MD plan document: parser, serializer, and results-excluded digest.
 *
 * The plan IS the definition. It carries two plan-wide registries the steps draw
 * from by reference:
 *   - `## Schemas` — a `definitions:` block; task contracts reference it by `$ref`.
 *   - `## Context` — each rule/blueprint embedded once under a stable key; steps
 *     declare `Context: [key, …]` as references, never inlined copies.
 * Run state (checkbox status + Results blocks) lives in the plan; there is no sidecar.
 */

import { createHash } from 'node:crypto';
import Ajv from 'ajv';
import fm from 'front-matter';
import { load as parseYaml, dump as dumpYaml } from 'js-yaml';

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
  submission: 'data' | 'direct';
  path?: string;
  validators?: string[];
}
export interface PlanTask {
  name: string;
  title: string;
  done: boolean;
  params: Record<string, unknown>;
  contract: { outputs: Record<string, OutputContract> };
  results: Record<string, unknown> | null;
}
export interface PlanStep {
  name: string;
  context: string[];
  tasks: PlanTask[];
}
export interface Plan {
  workflow: string;
  digest: string;
  definitions: Record<string, unknown>;
  context: Record<string, ContextEntry>;
  steps: PlanStep[];
}

const FENCE = /^(\s*)(```|~~~)\s*\w*\s*$/;

/** Collect the body of a fenced block starting at `lines[start]` (the opening fence). */
function readFence(lines: string[], start: number): { body: string; next: number } {
  const open = lines[start]!.match(FENCE)!;
  const indent = open[1]!.length;
  const body: string[] = [];
  let i = start + 1;
  for (; i < lines.length; i++) {
    if (FENCE.test(lines[i]!)) {
      i++;
      break;
    }
    body.push(lines[i]!.slice(indent));
  }
  return { body: body.join('\n'), next: i };
}

/** Read indented plain lines until the next heading/fence/blank-terminated section. */
function readPlainBlock(lines: string[], start: number, stopRe: RegExp): { body: string; next: number } {
  const body: string[] = [];
  let i = start;
  for (; i < lines.length; i++) {
    if (stopRe.test(lines[i]!)) break;
    body.push(lines[i]!);
  }
  return { body: body.join('\n').trim(), next: i };
}

const CTX_HEADER = /^###\s+(\S+)\s+\((?:(rule|blueprint),\s*)?source:\s*(.+)\)\s*$/;
const TASK_LINE = /^\s*-\s+\[([ xX])\]\s+(\S+)(?:\s+—\s+(.*))?$/;

export function parsePlan(md: string): Plan {
  const lines = md.split('\n');
  const plan: Plan = { workflow: '', digest: '', definitions: {}, context: {}, steps: [] };

  const title = lines.find((l) => /^#\s+Plan:/.test(l));
  if (title) plan.workflow = title.replace(/^#\s+Plan:\s*/, '').trim();
  const digest = lines.find((l) => /^<!--\s*digest:/.test(l));
  if (digest) plan.digest = digest.replace(/^<!--\s*digest:\s*/, '').replace(/\s*-->\s*$/, '').trim();

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (/^##\s+Schemas\s*$/.test(line)) {
      i++;
      while (i < lines.length && !FENCE.test(lines[i]!) && !/^##\s/.test(lines[i]!)) i++;
      if (i < lines.length && FENCE.test(lines[i]!)) {
        const { body, next } = readFence(lines, i);
        const parsed = (parseYaml(body) as { definitions?: Record<string, unknown> } | null) ?? {};
        plan.definitions = parsed.definitions ?? {};
        i = next;
      }
      continue;
    }
    if (/^##\s+Context\s*$/.test(line)) {
      i++;
      while (i < lines.length && !/^##\s/.test(lines[i]!)) {
        const header = lines[i]!.match(CTX_HEADER);
        if (!header) {
          i++;
          continue;
        }
        const key = header[1]!;
        const source = header[3]!.trim();
        const kind: 'rule' | 'blueprint' = header[2]
          ? (header[2] as 'rule' | 'blueprint')
          : source.includes('/blueprints/')
            ? 'blueprint'
            : 'rule';
        const { body, next } = readPlainBlock(lines, i + 1, /^###\s|^##\s/);
        plan.context[key] = { key, kind, source, content: body };
        i = next;
      }
      continue;
    }
    if (/^##\s+Steps\s*$/.test(line)) {
      i++;
      continue;
    }
    const stepHeader = line.match(/^###\s+Step:\s+(.+?)\s*$/);
    if (stepHeader) {
      const step: PlanStep = { name: stepHeader[1]!.trim(), context: [], tasks: [] };
      i++;
      // Context: [..] reference line
      for (; i < lines.length; i++) {
        const ctxRef = lines[i]!.match(/^Context:\s*\[(.*)\]\s*$/);
        if (ctxRef) {
          step.context = ctxRef[1]!
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          i++;
          break;
        }
        if (TASK_LINE.test(lines[i]!) || /^###\s|^##\s/.test(lines[i]!)) break;
      }
      // Tasks
      while (i < lines.length && !/^###\s|^##\s/.test(lines[i]!)) {
        const taskMatch = lines[i]!.match(TASK_LINE);
        if (!taskMatch) {
          i++;
          continue;
        }
        const task: PlanTask = {
          name: taskMatch[2]!,
          title: (taskMatch[3] ?? '').trim(),
          done: taskMatch[1]!.toLowerCase() === 'x',
          params: {},
          contract: { outputs: {} },
          results: null,
        };
        i++;
        // Sub-sections until next task or heading
        while (i < lines.length && !TASK_LINE.test(lines[i]!) && !/^###\s|^##\s/.test(lines[i]!)) {
          const sub = lines[i]!.match(/^\s*####\s+(Params|Contract|Results)\s*$/);
          if (!sub) {
            i++;
            continue;
          }
          const kind = sub[1]!;
          i++;
          if (i < lines.length && FENCE.test(lines[i]!)) {
            const { body, next } = readFence(lines, i);
            i = next;
            const parsed = (parseYaml(body) as Record<string, unknown> | null) ?? {};
            if (kind === 'Contract') task.contract.outputs = (parsed.outputs ?? {}) as Record<string, OutputContract>;
            else if (kind === 'Params') task.params = parsed;
            else task.results = parsed;
          } else {
            const { body, next } = readPlainBlock(lines, i, /^\s*####\s|^\s*-\s+\[|^###\s|^##\s/);
            i = next;
            if (kind === 'Params') task.params = body ? ((parseYaml(body) as Record<string, unknown>) ?? {}) : {};
            else if (kind === 'Results')
              task.results = body && !/^<!--/.test(body) ? ((parseYaml(body) as Record<string, unknown>) ?? null) : null;
          }
        }
        step.tasks.push(task);
      }
      plan.steps.push(step);
      continue;
    }
    i++;
  }

  return plan;
}

function yaml(value: unknown): string {
  return dumpYaml(value, { lineWidth: -1 }).trimEnd();
}

function indent(text: string, spaces: string): string {
  return text
    .split('\n')
    .map((l) => (l.length ? spaces + l : l))
    .join('\n');
}

export function serializePlan(plan: Plan): string {
  const out: string[] = [];
  out.push(`# Plan: ${plan.workflow}`);
  out.push(`<!-- digest: ${plan.digest} -->`);
  out.push('');
  out.push('## Schemas');
  out.push('```yaml');
  out.push(yaml({ definitions: plan.definitions }));
  out.push('```');
  out.push('');
  out.push('## Context');
  for (const entry of Object.values(plan.context)) {
    out.push(`### ${entry.key} (${entry.kind}, source: ${entry.source})`);
    out.push(entry.content);
    out.push('');
  }
  out.push('## Steps');
  out.push('');
  for (const step of plan.steps) {
    out.push(`### Step: ${step.name}`);
    out.push(`Context: [${step.context.join(', ')}]`);
    out.push('');
    for (const task of step.tasks) {
      out.push(`- [${task.done ? 'x' : ' '}] ${task.name}${task.title ? ` — ${task.title}` : ''}`);
      out.push('');
      out.push('  #### Params');
      if (Object.keys(task.params).length) out.push(indent(yaml(task.params), '  '));
      out.push('');
      out.push('  #### Contract');
      out.push('  ```yaml');
      out.push(indent(yaml({ outputs: task.contract.outputs }), '  '));
      out.push('  ```');
      out.push('');
      out.push('  #### Results');
      out.push(task.results ? indent(yaml(task.results), '  ') : '  <!-- pending -->');
      out.push('');
    }
  }
  return out.join('\n') + '\n';
}

export interface TaskValidation {
  ok: boolean;
  errors: string[];
}

/**
 * Validate a result against the task's frozen output contract only. `$ref`s resolve
 * against the plan-wide `definitions` registry (registered once in AJV) — never by
 * re-reading a skill file. Structural validation only; file-level (`direct`)
 * validators run in the execution CLI, which has the workspace config.
 */
export function validateTaskResult(
  task: PlanTask,
  result: Record<string, unknown>,
  definitions: Record<string, unknown>,
): TaskValidation {
  const ajv = new Ajv({ allErrors: true, strict: false });
  for (const [name, schema] of Object.entries(definitions)) ajv.addSchema(schema as object, `#/definitions/${name}`);
  const errors: string[] = [];
  for (const [key, output] of Object.entries(task.contract.outputs)) {
    if (!(key in result)) {
      if (output.required) errors.push(`missing required output "${key}"`);
      continue;
    }
    const validate = ajv.compile(output.schema as object);
    if (!validate(result[key])) errors.push(`output "${key}": ${ajv.errorsText(validate.errors)}`);
  }
  return { ok: errors.length === 0, errors };
}

export interface MissingObligation {
  source: string;
  obligation: string;
}
export interface CompletenessReport {
  ok: boolean;
  missing: MissingObligation[];
}

/**
 * The autonomy check (AC-5): the plan must be executable without the intake skill.
 * Every obligation rule embedded in the plan (`intake_obligation` in its frontmatter,
 * optionally with `requires_task`) must have its required task frozen into the plan.
 * A missing obligation is reported with its source and text — a mere "read" flag does
 * not count as satisfaction.
 */
export function validatePlanCompleteness(plan: Plan): CompletenessReport {
  const taskNames = new Set(plan.steps.flatMap((s) => s.tasks.map((t) => t.name)));
  const missing: MissingObligation[] = [];
  for (const entry of Object.values(plan.context)) {
    const attrs = (fm<Record<string, unknown>>(entry.content).attributes ?? {}) as Record<string, unknown>;
    const obligation = attrs['intake_obligation'];
    if (typeof obligation !== 'string') continue;
    const requiresTask = typeof attrs['requires_task'] === 'string' ? (attrs['requires_task'] as string) : undefined;
    if (!requiresTask || !taskNames.has(requiresTask)) missing.push({ source: entry.source, obligation });
  }
  return { ok: missing.length === 0, missing };
}

/** SHA-256 over workflow + definitions + context + steps, with all results nulled. */
export function planDigest(plan: Omit<Plan, 'digest'>): string {
  const canonical = {
    workflow: plan.workflow,
    definitions: plan.definitions,
    context: plan.context,
    steps: plan.steps.map((step) => ({
      ...step,
      tasks: step.tasks.map((task) => ({ ...task, results: null })),
    })),
  };
  return createHash('sha256').update(dumpYaml(canonical, { sortKeys: true, lineWidth: -1 })).digest('hex');
}
