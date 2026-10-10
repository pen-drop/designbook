/**
 * Enforce sealed composition on task results: compile the expected mapping
 * expression and compare submitted scene/mapping/sample artifacts to params.
 */
import { existsSync, readFileSync } from 'node:fs';
import jsonata from 'jsonata';
import { load as parseYaml } from 'js-yaml';
import type { Plan, PlanTask } from './plan-document.js';

interface Binding {
  field: string;
  prop?: string;
  slot?: string;
  path?: string[];
  entity?: { entity_type: string; bundle: string; view_mode: string };
}

interface SampleRec {
  id: string;
  summary?: string;
  values?: Record<string, unknown>;
}

export function compilePlannedMapping(task: PlanTask, plan: Plan): string {
  const component = String(task.params.component ?? '');
  const bindings = (task.params.bindings as Binding[] | undefined) ?? [];
  if (!component) throw new Error('map-entity is missing component');
  const props: string[] = [];
  const slots: string[] = [];
  for (const binding of bindings) {
    const fieldExpr = fieldAccess(binding);
    if (binding.prop) {
      props.push(`${JSON.stringify(binding.prop)}: ${fieldExpr}`);
      continue;
    }
    if (binding.slot && binding.entity) {
      const index = indexById(plan, binding.entity.entity_type, binding.entity.bundle);
      const entity = `${binding.entity.entity_type}.${binding.entity.bundle}`;
      slots.push(
        `${JSON.stringify(binding.slot)}: $map(${fieldExpr}, function($id) { { "entity": ${JSON.stringify(entity)}, "view_mode": ${JSON.stringify(binding.entity.view_mode)}, "record": $lookup(${JSON.stringify(index)}, $string($id)) } })`,
      );
      continue;
    }
    if (binding.slot) {
      slots.push(`${JSON.stringify(binding.slot)}: ${fieldExpr}`);
      continue;
    }
    throw new Error(`unrepresentable mapping binding for field ${binding.field}`);
  }
  const propsBlock = props.length ? `,\n      "props": {\n        ${props.join(',\n        ')}\n      }` : '';
  const slotsBlock = slots.length ? `,\n      "slots": {\n        ${slots.join(',\n        ')}\n      }` : '';
  return `(
  $fields := $;
  [
    {
      "component": ${JSON.stringify(component)}${propsBlock}${slotsBlock}
    }
  ]
)
`;
}

export async function validateCompositionResult(
  plan: Plan,
  task: PlanTask,
  result: Record<string, unknown>,
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  if (task.name.includes('map-entity') && Array.isArray(task.params.bindings)) {
    await validateMapping(plan, task, result, errors);
  } else if (task.name === 'write-scene' && Array.isArray(task.params.items)) {
    validateScene(plan, task, result, errors);
  } else if (task.name === 'create-sample-data' && Array.isArray(task.params.records)) {
    validateSample(plan, task, result, errors);
  } else if (task.name === 'write-component' && isObj(task.params.component)) {
    validateComponent(task, result, errors);
  }
  return { ok: errors.length === 0, errors };
}

function fieldAccess(binding: Binding): string {
  return `$fields.${[binding.field, ...(binding.path ?? [])].join('.')}`;
}

function indexById(plan: Plan, entityType: string, bundle: string): Record<string, number> {
  const recs = recordsFor(plan, entityType, bundle);
  const out: Record<string, number> = {};
  recs.forEach((rec, i) => {
    out[String(rec.id)] = i;
  });
  return out;
}

function recordsFor(plan: Plan, entityType: string, bundle: string): SampleRec[] {
  for (const step of plan.steps) {
    for (const task of step.tasks) {
      const ident = task.params.bundle as { entity_type?: string; bundle?: string } | undefined;
      if (task.name === 'create-sample-data' && ident?.entity_type === entityType && ident.bundle === bundle) {
        return (task.params.records as SampleRec[] | undefined) ?? [];
      }
    }
  }
  return (
    plan.composition?.samples.find((sample) => sample.entity_type === entityType && sample.bundle === bundle)
      ?.records ?? []
  );
}

function normalizeAst(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(normalizeAst);
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === 'position') continue;
      out[key] = normalizeAst(value);
    }
    return out;
  }
  return node;
}

function astOf(source: string): unknown {
  return normalizeAst(jsonata(source).ast());
}

async function validateMapping(
  plan: Plan,
  task: PlanTask,
  result: Record<string, unknown>,
  errors: string[],
): Promise<void> {
  const source = readOutputText(task, result, 'entity-mapping', errors);
  if (source == null) return;
  let expected: string;
  try {
    expected = compilePlannedMapping(task, plan);
  } catch (err: unknown) {
    errors.push(err instanceof Error ? err.message : String(err));
    return;
  }
  try {
    if (JSON.stringify(astOf(source)) !== JSON.stringify(astOf(expected))) {
      errors.push('mapping AST does not match the declared bindings');
    }
  } catch (err: unknown) {
    errors.push(`invalid JSONata: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }
  const mapping = task.params.mapping as { entity_type?: string; bundle?: string } | undefined;
  if (!mapping?.entity_type || !mapping.bundle) return;
  let compiled;
  try {
    compiled = jsonata(source);
  } catch {
    return;
  }
  const bindings = (task.params.bindings as Binding[]) ?? [];
  for (const rec of recordsFor(plan, mapping.entity_type, mapping.bundle)) {
    const values: Record<string, unknown> = { id: rec.id, ...(rec.values ?? {}) };
    let out: unknown;
    try {
      out = await compiled.evaluate(values);
    } catch (err: unknown) {
      errors.push(`jsonata evaluation failed: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    const node = (Array.isArray(out) ? out[0] : out) as
      | { component?: string; props?: Record<string, unknown>; slots?: Record<string, unknown> }
      | undefined;
    if (node?.component !== task.params.component) {
      errors.push(
        `evaluated component ${JSON.stringify(node?.component)} does not match ${String(task.params.component)}`,
      );
    }
    for (const binding of bindings) {
      if (binding.prop) {
        const expectedValue = getPath(values, [binding.field, ...(binding.path ?? [])]);
        if (!sameValue(node?.props?.[binding.prop], expectedValue)) {
          errors.push(`evaluated prop ${binding.prop} does not come from ${binding.field}`);
        }
      }
      if (binding.slot && binding.entity) {
        const ids = getPath(values, [binding.field, ...(binding.path ?? [])]);
        const idList = Array.isArray(ids) ? ids : ids == null ? [] : [ids];
        const actual = node?.slots?.[binding.slot];
        const arr = Array.isArray(actual) ? actual : [];
        if (arr.length !== idList.length) {
          errors.push(`slot ${binding.slot} selected ${arr.length} records, expected ${idList.length}`);
        }
        const pool = recordsFor(plan, binding.entity.entity_type, binding.entity.bundle);
        const entity = `${binding.entity.entity_type}.${binding.entity.bundle}`;
        idList.forEach((id, i) => {
          const idx = pool.findIndex((row) => String(row.id) === String(id));
          const item = arr[i] as { entity?: string; view_mode?: string; record?: number } | undefined;
          if (item?.entity !== entity || item.view_mode !== binding.entity!.view_mode || item.record !== idx) {
            errors.push(`slot ${binding.slot}[${i}] expected ${entity} [${binding.entity!.view_mode}] record ${idx}`);
          }
        });
      }
    }
  }
}

function validateScene(plan: Plan, task: PlanTask, result: Record<string, unknown>, errors: string[]): void {
  const file = readOutputObject(task, result, 'scene-file', errors);
  if (!file) return;
  const name = String(task.params.scene_name ?? '');
  const scenes = Array.isArray(file.scenes) ? file.scenes : [];
  const selected = scenes.filter((scene) => isObj(scene) && scene.name === name);
  if (selected.length !== 1) {
    errors.push(`scene-file must contain exactly one scene named ${JSON.stringify(name)}`);
    return;
  }
  if (!equalIgnoreKeyOrder(selected[0]!.items, task.params.items)) {
    errors.push('write-scene items do not match the sealed params');
  }
  const baseline = plan.composition?.scenes.find((snap) => snap.path === task.params.scene_path);
  const baselineScenes = Array.isArray(baseline?.file?.scenes) ? (baseline!.file.scenes as unknown[]) : [];
  const expectedSiblings = baselineScenes.filter((scene) => isObj(scene) && scene.name !== name);
  const actualSiblings = scenes.filter((scene) => isObj(scene) && scene.name !== name);
  if (expectedSiblings.length && !equalIgnoreKeyOrder(actualSiblings, expectedSiblings)) {
    errors.push('sibling scenes do not match the frozen baseline');
  }
}

function validateSample(plan: Plan, task: PlanTask, result: Record<string, unknown>, errors: string[]): void {
  const output = readOutputValue(task, result, 'sample-data', errors);
  if (output == null) return;
  const written = Array.isArray(output) ? output : [];
  const declared = (task.params.records as SampleRec[]) ?? [];
  const bundle = task.params.bundle as { entity_type?: string; bundle?: string } | undefined;
  const baseline =
    bundle?.entity_type && bundle.bundle
      ? (plan.composition?.samples.find((s) => s.entity_type === bundle.entity_type && s.bundle === bundle.bundle)
          ?.records ?? [])
      : [];
  const declaredIds = new Set(declared.map((rec) => String(rec.id)));
  const preserved = baseline.filter((rec) => !declaredIds.has(String(rec.id)));
  const expectedIds = [...preserved.map((rec) => String(rec.id)), ...declared.map((rec) => String(rec.id))];
  const writtenIds = written.map((row) => (isObj(row) ? String(row.id) : ''));
  if (JSON.stringify(writtenIds) !== JSON.stringify(expectedIds)) {
    errors.push('sample ids/order do not match the sealed records');
  }
  for (const rec of declared) {
    const found = written.find((row) => isObj(row) && String(row.id) === String(rec.id));
    if (!found || !isObj(found)) {
      errors.push(`sample record ${rec.id} is missing`);
      continue;
    }
    for (const [key, value] of Object.entries(rec.values ?? {})) {
      if (!sameValue(found[key], value)) errors.push(`sample record ${rec.id} field ${key} does not match`);
    }
  }
}

function validateComponent(task: PlanTask, result: Record<string, unknown>, errors: string[]): void {
  const component = task.params.component as {
    props?: { properties?: Record<string, unknown> };
    slots?: Record<string, unknown>;
  };
  const propNames = Object.keys(component.props?.properties ?? {});
  const slotNames = Object.keys(component.slots ?? {});
  if (!propNames.length && !slotNames.length) return;
  const inspection = isObj(result.inspection) ? result.inspection : undefined;
  const inspectedProps = Array.isArray(inspection?.props) ? inspection.props.map(String) : [];
  const inspectedSlots = Array.isArray(inspection?.slots) ? inspection.slots.map(String) : [];
  const blobs = Object.values(result)
    .filter((value): value is string => typeof value === 'string')
    .join('\n');
  for (const name of propNames) {
    if (inspectedProps.includes(name) || blobs.includes(name)) continue;
    errors.push(`component prop "${name}" is not evidenced in the result`);
  }
  for (const name of slotNames) {
    if (inspectedSlots.includes(name) || blobs.includes(name)) continue;
    errors.push(`component slot "${name}" is not evidenced in the result`);
  }
}

function readOutputText(task: PlanTask, result: Record<string, unknown>, key: string, errors: string[]): string | null {
  const value = readOutputValue(task, result, key, errors);
  if (value == null) return null;
  if (typeof value === 'string') return value;
  errors.push(`${key} must be a string`);
  return null;
}

function readOutputObject(
  task: PlanTask,
  result: Record<string, unknown>,
  key: string,
  errors: string[],
): Record<string, unknown> | null {
  const value = readOutputValue(task, result, key, errors);
  if (value == null) return null;
  if (isObj(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseYaml(value);
    if (isObj(parsed)) return parsed;
  }
  errors.push(`${key} must be an object`);
  return null;
}

function readOutputValue(task: PlanTask, result: Record<string, unknown>, key: string, errors: string[]): unknown {
  const output = task.contract.outputs[key] ?? Object.values(task.contract.outputs)[0];
  if (!output) {
    errors.push(`missing output contract ${key}`);
    return null;
  }
  if (output.submission === 'direct') {
    if (!output.path || !existsSync(output.path)) {
      errors.push(`file not found: ${output.path ?? key}`);
      return null;
    }
    const raw = readFileSync(output.path, 'utf8');
    if (/\.ya?ml$/.test(output.path)) return parseYaml(raw);
    return raw;
  }
  if (!(key in result) && !(Object.keys(task.contract.outputs)[0]! in result)) {
    errors.push(`missing required output "${key}"`);
    return null;
  }
  return result[key] ?? result[Object.keys(task.contract.outputs)[0]!];
}

function getPath(obj: unknown, parts: string[]): unknown {
  let current = obj;
  for (const part of parts) {
    if (!isObj(current)) return undefined;
    current = current[part];
  }
  return current;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function equalIgnoreKeyOrder(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((value, i) => equalIgnoreKeyOrder(value, b[i]));
  }
  if (isObj(a) && isObj(b)) {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length || aKeys.some((key, i) => key !== bKeys[i])) return false;
    return aKeys.every((key) => equalIgnoreKeyOrder(a[key], b[key]));
  }
  return Object.is(a, b);
}

function isObj(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
