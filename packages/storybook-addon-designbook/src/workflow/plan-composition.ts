/**
 * Derive a composition tree from a sealed (or draft) writing-design plan.
 * Task params plus the frozen snapshot are the only inputs — no workspace rediscovery.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { Plan, PlanTask } from './plan-document.js';

export const WRITING_DESIGN_WORKFLOWS = new Set(['design-entity', 'design-component', 'design-screen', 'design-shell']);

export interface CompositionComponentSnapshot {
  id: string;
  contract: Record<string, unknown>;
  source: string;
  hash: string;
}

export interface CompositionMappingSnapshot {
  identity: Record<string, unknown>;
  component: string;
  bindings: unknown[];
  source: string;
  hash: string;
}

export interface CompositionSampleSnapshot {
  entity_type: string;
  bundle: string;
  records: Array<{ id: string; summary?: string; values?: Record<string, unknown> }>;
}

export interface CompositionSceneSnapshot {
  path: string;
  file: Record<string, unknown>;
  hash?: string;
}

export interface CompositionInputs {
  components: CompositionComponentSnapshot[];
  mappings: CompositionMappingSnapshot[];
  samples: CompositionSampleSnapshot[];
  scenes: CompositionSceneSnapshot[];
  data_model: Record<string, unknown>;
}

export type CompositionStatus = 'neu' | 'geändert' | 'wiederverwendet';

export interface CompositionNode {
  kind: 'scene' | 'entity' | 'component' | 'prop' | 'slot' | 'image' | 'scene-ref';
  identity: string;
  children: CompositionNode[];
  status?: CompositionStatus;
  source?: string;
  target?: string;
  mode?: string;
  count?: number;
  path?: string;
  scope?: string;
  record?: number | string;
}

export interface CompositionTree {
  roots: CompositionNode[];
}

interface Binding {
  field: string;
  prop?: string;
  slot?: string;
  path?: string[];
  entity?: { entity_type: string; bundle: string; view_mode: string };
}

interface IndexedTask {
  step: string;
  task: PlanTask;
}

function allTasks(plan: Plan): IndexedTask[] {
  const out: IndexedTask[] = [];
  for (const step of plan.steps) for (const task of step.tasks) out.push({ step: step.name, task });
  return out;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function loc(step: string, task: PlanTask, path: string): string {
  const title = task.title ? ` [${task.title}]` : '';
  const prefix = step === 'map-entity' ? 'map-entity' : task.name.replace(/--.*$/, '');
  return path ? `${prefix}${title} ${path}` : `${prefix}${title}`.trim();
}

function getBundle(
  model: Record<string, unknown>,
  entityType: string,
  bundle: string,
): Record<string, unknown> | undefined {
  const from = (root: Record<string, unknown>): Record<string, unknown> | undefined => {
    const et = root[entityType];
    if (!isObj(et)) return undefined;
    const b = et[bundle];
    return isObj(b) ? b : undefined;
  };
  return from(model) ?? (isObj(model.content) ? from(model.content) : undefined);
}

function componentTreeFieldNames(bundle: Record<string, unknown>): string[] {
  return Object.entries(bundleFields(bundle))
    .filter(([, def]) => isObj(def) && def.type === 'component_tree')
    .map(([name]) => name);
}

export function componentTreeFields(model: Record<string, unknown>, entityType: string, bundle: string): string[] {
  const def = getBundle(model, entityType, bundle);
  return def ? componentTreeFieldNames(def) : [];
}

function bundleFields(bundle: Record<string, unknown>): Record<string, unknown> {
  return isObj(bundle.fields) ? bundle.fields : {};
}

function viewModes(bundle: Record<string, unknown>): Record<string, unknown> {
  return isObj(bundle.view_modes) ? bundle.view_modes : {};
}

function fieldSettings(field: Record<string, unknown>): Record<string, unknown> {
  return isObj(field.settings) ? field.settings : {};
}

function isRefType(type: unknown): boolean {
  return type === 'reference' || type === 'entity_reference';
}

function parseEntityId(entity: string): { entity_type: string; bundle: string } {
  const dot = entity.indexOf('.');
  if (dot < 0) return { entity_type: entity, bundle: '' };
  return { entity_type: entity.slice(0, dot), bundle: entity.slice(dot + 1) };
}

function sha256(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

export function verifyCompositionHashes(composition: CompositionInputs): string[] {
  const errors: string[] = [];
  const check = (kind: string, items: Array<{ source?: string; hash?: string }>) => {
    items.forEach((item, i) => {
      if (!item.source) return;
      if (!existsSync(item.source)) {
        errors.push(`composition.${kind}[${i}].source: missing file ${item.source}`);
        return;
      }
      if (!item.hash) return;
      const actual = sha256(readFileSync(item.source));
      if (actual !== item.hash) errors.push(`composition.${kind}[${i}].hash: mismatch`);
    });
  };
  check('components', composition.components);
  check('mappings', composition.mappings);
  return errors;
}

function qualify(name: string, known: Iterable<string>): string {
  if (name.includes(':')) return name;
  const ids = [...known];
  const hit = ids.find((id) => id === name || id.endsWith(`:${name}`));
  if (hit) return hit;
  const prefixes = [
    ...new Set(ids.map((id) => (id.includes(':') ? id.slice(0, id.indexOf(':')) : '')).filter(Boolean)),
  ];
  if (prefixes.length === 1) return `${prefixes[0]}:${name}`;
  return name;
}

function contractProps(contract: Record<string, unknown>): Record<string, unknown> {
  const props = contract.props;
  if (!isObj(props) || !isObj(props.properties)) return {};
  return props.properties;
}

function contractSlots(contract: Record<string, unknown>): Record<string, unknown> {
  return isObj(contract.slots) ? contract.slots : {};
}

function literalTypeOk(schema: unknown, value: unknown): boolean {
  if (!isObj(schema) || schema.type == null) return true;
  const t = schema.type;
  if (t === 'boolean') return typeof value === 'boolean';
  if (t === 'string') return typeof value === 'string';
  if (t === 'number' || t === 'integer') return typeof value === 'number';
  if (t === 'array') return Array.isArray(value);
  if (t === 'object') return isObj(value);
  return true;
}

interface SamplePool {
  entity_type: string;
  bundle: string;
  records: Array<{ id: string; values?: Record<string, unknown> }>;
}

interface MappingRec {
  task: PlanTask;
  step: string;
  entity_type: string;
  bundle: string;
  mode_kind: string;
  view_mode: string;
  form_mode: string;
  component: string;
  bindings: Binding[];
}

function mappingKey(m: {
  entity_type: string;
  bundle: string;
  mode_kind: string;
  view_mode: string;
  form_mode: string;
}): string {
  const mode = m.mode_kind === 'form' ? m.form_mode : m.view_mode;
  return `${m.entity_type}.${m.bundle}:${m.mode_kind}:${mode}`;
}

export function deriveComposition(plan: Plan): { tree: CompositionTree; errors: string[] } {
  const errors: string[] = [];
  const composition = plan.composition;
  if (!composition) {
    if (WRITING_DESIGN_WORKFLOWS.has(plan.workflow)) errors.push('composition snapshot is required');
    return { tree: { roots: [] }, errors };
  }

  const tasks = allTasks(plan);
  const model = composition.data_model ?? {};
  const knownIds = new Set<string>();
  for (const snap of composition.components) knownIds.add(snap.id);
  const collectQualifiedIds = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(collectQualifiedIds);
      return;
    }
    if (!isObj(value)) return;
    if (typeof value.component === 'string' && value.component.includes(':')) knownIds.add(value.component);
    for (const nested of Object.values(value)) collectQualifiedIds(nested);
  };
  for (const { task } of tasks) {
    if (typeof task.params.component === 'string' && task.params.component.includes(':'))
      knownIds.add(task.params.component);
    collectQualifiedIds(task.params);
  }

  const plannedWrites = new Map<string, { task: PlanTask; step: string; contract: Record<string, unknown> }>();
  const producerCount = new Map<string, string[]>();
  for (const { step, task } of tasks) {
    if (task.name !== 'write-component') continue;
    const c = task.params.component;
    if (!isObj(c)) continue;
    const bare = asString(c.component);
    const id = qualify(bare, knownIds);
    knownIds.add(id);
    const titles = producerCount.get(id) ?? [];
    titles.push(task.title || bare);
    producerCount.set(id, titles);
    plannedWrites.set(id, { task, step, contract: c });
  }
  for (const [id, titles] of producerCount) {
    if (titles.length > 1) errors.push(`write-component: duplicate producer for ${id}`);
  }

  const components = new Map<string, { contract: Record<string, unknown>; status: CompositionStatus }>();
  for (const snap of composition.components) {
    const status: CompositionStatus = plannedWrites.has(snap.id) ? 'geändert' : 'wiederverwendet';
    components.set(snap.id, { contract: snap.contract, status });
  }
  for (const [id, w] of plannedWrites) {
    if (!components.has(id)) components.set(id, { contract: w.contract, status: 'neu' });
    else components.set(id, { contract: w.contract, status: 'geändert' });
  }

  const samples = new Map<string, SamplePool>();
  for (const snap of composition.samples) {
    samples.set(`${snap.entity_type}.${snap.bundle}`, {
      entity_type: snap.entity_type,
      bundle: snap.bundle,
      records: snap.records,
    });
  }
  const sampleProducers = new Map<string, string[]>();
  for (const { task } of tasks) {
    if (task.name !== 'create-sample-data') continue;
    const bundle = isObj(task.params.bundle) ? task.params.bundle : {};
    const entity_type = asString(bundle.entity_type);
    const b = asString(bundle.bundle);
    const key = `${entity_type}.${b}`;
    const titles = sampleProducers.get(key) ?? [];
    titles.push(task.title || key);
    sampleProducers.set(key, titles);
    const records = Array.isArray(task.params.records) ? (task.params.records as SamplePool['records']) : [];
    samples.set(key, { entity_type, bundle: b, records });
  }
  for (const [key, titles] of sampleProducers) {
    if (titles.length > 1) errors.push(`create-sample-data: duplicate producer for ${key}`);
  }

  const mappings = new Map<string, MappingRec>();
  const mappingProducers = new Map<string, string[]>();
  for (const { step, task } of tasks) {
    if (task.name !== 'map-entity--design-screen' && !task.name.startsWith('map-entity')) continue;
    const mapping = isObj(task.params.mapping) ? task.params.mapping : {};
    const rec: MappingRec = {
      task,
      step,
      entity_type: asString(mapping.entity_type),
      bundle: asString(mapping.bundle),
      mode_kind: asString(mapping.mode_kind) || 'view',
      view_mode: asString(mapping.view_mode),
      form_mode: asString(mapping.form_mode),
      component: asString(task.params.component),
      bindings: Array.isArray(task.params.bindings) ? (task.params.bindings as Binding[]) : [],
    };
    const key = mappingKey(rec);
    const titles = mappingProducers.get(key) ?? [];
    titles.push(task.title || key);
    mappingProducers.set(key, titles);
    mappings.set(key, rec);
  }
  for (const [key, titles] of mappingProducers) {
    if (titles.length > 1) errors.push(`map-entity: duplicate producer for ${key}`);
  }

  for (const rec of mappings.values()) {
    const prefix = (path: string) => loc(rec.step, rec.task, path);
    const bundle = getBundle(model, rec.entity_type, rec.bundle);
    if (!bundle) {
      errors.push(`${prefix('mapping')}: unknown bundle ${rec.entity_type}.${rec.bundle}`);
      continue;
    }
    const mode = rec.mode_kind === 'form' ? rec.form_mode : rec.view_mode;
    if (rec.mode_kind !== 'form' && !(mode in viewModes(bundle))) {
      errors.push(`${prefix('mapping.view_mode')}: ${rec.entity_type}.${rec.bundle} has no view mode "${mode}"`);
    }
    const treeFields = componentTreeFieldNames(bundle);
    if (treeFields.length > 1) {
      errors.push(`${prefix('mapping')}: at most one component_tree field on ${rec.entity_type}.${rec.bundle}`);
    }
    if (treeFields.length) {
      if (rec.bindings.length) {
        errors.push(`${prefix('bindings')}: component_tree composition is the sample tree`);
      }
      const pool = samples.get(`${rec.entity_type}.${rec.bundle}`);
      if (!pool || pool.records.length === 0) {
        errors.push(`${prefix('mapping')}: empty required samples for ${rec.entity_type}.${rec.bundle}`);
      }
      continue;
    }
    const comp = components.get(rec.component);
    if (!comp) {
      errors.push(`${prefix('component')}: no contract for ${rec.component}`);
      continue;
    }
    const props = contractProps(comp.contract);
    const slots = contractSlots(comp.contract);
    const fields = bundleFields(bundle);
    const used = new Set<string>();
    rec.bindings.forEach((b, i) => {
      const p = `bindings[${i}]`;
      if (!(b.field in fields)) {
        errors.push(`${prefix(`${p}.field`)}: unknown field ${b.field}`);
      }
      if (b.prop && b.slot) errors.push(`${prefix(p)}: names both prop and slot`);
      if (b.prop) {
        const t = `prop:${b.prop}`;
        if (used.has(t)) errors.push(`${prefix(`${p}.prop`)}: duplicate target ${b.prop}`);
        used.add(t);
        if (!(b.prop in props)) errors.push(`${prefix(`${p}.prop`)}: unknown prop ${b.prop}`);
      }
      if (b.slot) {
        const t = `slot:${b.slot}`;
        if (used.has(t)) errors.push(`${prefix(`${p}.slot`)}: duplicate target ${b.slot}`);
        used.add(t);
        if (!(b.slot in slots)) errors.push(`${prefix(`${p}.slot`)}: unknown slot ${b.slot}`);
        if (b.entity) {
          const rawField = fields[b.field];
          const field = isObj(rawField) ? rawField : {};
          if (b.field in fields && !isRefType(field.type)) {
            errors.push(`${prefix(`${p}.entity`)}: ${b.field} is not a reference field`);
          }
          const settings = fieldSettings(field);
          const targetType = asString(settings.target_type);
          const targetBundle = asString(settings.target_bundle);
          if (
            (targetType && b.entity.entity_type !== targetType) ||
            (targetBundle && b.entity.bundle !== targetBundle)
          ) {
            errors.push(
              `${prefix(`${p}.entity`)}: ${b.entity.entity_type}.${b.entity.bundle} is not the declared target ${targetType}.${targetBundle}`,
            );
          }
          const child = getBundle(model, b.entity.entity_type, b.entity.bundle);
          if (!child) {
            errors.push(`${prefix(`${p}.entity`)}: unknown bundle ${b.entity.entity_type}.${b.entity.bundle}`);
          } else if (!(b.entity.view_mode in viewModes(child))) {
            errors.push(
              `${prefix(`${p}.entity.view_mode`)}: ${b.entity.entity_type}.${b.entity.bundle} has no view mode "${b.entity.view_mode}"`,
            );
          }
          const childKey = `${b.entity.entity_type}.${b.entity.bundle}:view:${b.entity.view_mode}`;
          if (!mappings.has(childKey)) {
            errors.push(`${prefix(`${p}.entity`)}: missing mapping ${childKey}`);
          }
          const pool = samples.get(`${b.entity.entity_type}.${b.entity.bundle}`);
          if (!pool || pool.records.length === 0) {
            errors.push(
              `${prefix(`${p}.entity`)}: empty required samples for ${b.entity.entity_type}.${b.entity.bundle}`,
            );
          }
        }
      }
    });
  }

  const sceneFiles = new Map<string, { path: string; file: Record<string, unknown> }>();
  for (const snap of composition.scenes) {
    const id = asString(snap.file.id) || snap.path;
    sceneFiles.set(id, { path: snap.path, file: snap.file });
  }
  const sceneTasks: IndexedTask[] = [];
  for (const it of tasks) {
    if (it.task.name === 'write-scene') sceneTasks.push(it);
  }

  const imageStyles = isObj(model.config) && isObj(model.config.image_style) ? model.config.image_style : {};

  function findScene(ref: string): { id: string; name: string; items: unknown[]; path: string } | undefined {
    const colon = ref.indexOf(':');
    const source = colon < 0 ? ref : ref.slice(0, colon);
    const name = colon < 0 ? ref : ref.slice(colon + 1);
    const snap = sceneFiles.get(source);
    if (!snap) return undefined;
    const scenes = Array.isArray(snap.file.scenes) ? snap.file.scenes : [];
    const def = scenes.find((s) => isObj(s) && s.name === name);
    if (!isObj(def)) return undefined;
    return { id: source, name, items: Array.isArray(def.items) ? def.items : [], path: snap.path };
  }

  function selectedCount(rec: MappingRec, binding: Binding, recordIndex: number | undefined): number | undefined {
    if (!binding.entity || !binding.slot) return undefined;
    const parentPool = samples.get(`${rec.entity_type}.${rec.bundle}`);
    if (!parentPool || recordIndex == null) {
      const childPool = samples.get(`${binding.entity.entity_type}.${binding.entity.bundle}`);
      return childPool?.records.length;
    }
    const record = parentPool.records[recordIndex];
    const values = record?.values ?? {};
    const raw = values[binding.field];
    const ids = Array.isArray(raw) ? raw.map((x) => String(x)) : raw != null ? [String(raw)] : [];
    const childPool = samples.get(`${binding.entity.entity_type}.${binding.entity.bundle}`);
    const have = new Set((childPool?.records ?? []).map((r) => r.id));
    const missing = ids.filter((id) => !have.has(id));
    if (missing.length) {
      errors.push(`${loc(rec.step, rec.task, `bindings`)}: missing child ids ${missing.join(', ')}`);
    }
    return ids.length;
  }

  function bindingNodes(rec: MappingRec, recordIndex?: number): CompositionNode[] {
    return rec.bindings.map((b) => {
      if (b.prop) {
        return { kind: 'prop' as const, identity: b.prop, target: b.prop, source: b.field, children: [] };
      }
      const node: CompositionNode = {
        kind: 'slot',
        identity: b.slot ?? '',
        target: b.slot,
        source: b.field,
        children: [],
      };
      if (b.entity) {
        node.count = selectedCount(rec, b, recordIndex);
        const childKey = `${b.entity.entity_type}.${b.entity.bundle}:view:${b.entity.view_mode}`;
        const child = mappings.get(childKey);
        const childComp = child ? components.get(child.component) : undefined;
        node.children.push({
          kind: 'entity',
          identity: `${b.entity.entity_type}.${b.entity.bundle}`,
          mode: b.entity.view_mode,
          target: child?.component,
          status: childComp?.status,
          children: child ? bindingNodes(child) : [],
        });
      }
      return node;
    });
  }

  function walkItems(items: unknown[], chain: string[], step: string, task: PlanTask, path: string): CompositionNode[] {
    const nodes: CompositionNode[] = [];
    items.forEach((item, i) => {
      if (!isObj(item)) return;
      const itemPath = `${path}[${i}]`;
      if (typeof item.entity === 'string') {
        const { entity_type, bundle } = parseEntityId(item.entity);
        const view_mode = asString(item.view_mode);
        if (!view_mode) errors.push(`${loc(step, task, `${itemPath}.view_mode`)}: view_mode is required`);
        const hasRecord = item.record !== undefined;
        const hasRecords = item.records !== undefined;
        if (hasRecord === hasRecords && !hasRecord) {
          // default record 0 is allowed by schema; treat missing as 0
        }
        if (hasRecord && hasRecords) {
          errors.push(`${loc(step, task, itemPath)}: exactly one of record or records`);
        }
        const pool = samples.get(`${entity_type}.${bundle}`);
        const indexes: number[] = hasRecords
          ? ((item.records as number[]) ?? [])
          : [typeof item.record === 'number' ? item.record : 0];
        for (const idx of indexes) {
          if (idx < 0 || (pool && idx >= pool.records.length)) {
            errors.push(`${loc(step, task, itemPath)}: record index ${idx} out of range`);
          }
        }
        const key = `${entity_type}.${bundle}:view:${view_mode}`;
        const rec = mappings.get(key);
        if (!rec) errors.push(`${loc(step, task, itemPath)}: missing mapping ${key}`);
        const recordIndex = indexes[0];
        const comp = rec ? components.get(rec.component) : undefined;
        nodes.push({
          kind: 'entity',
          identity: item.entity,
          mode: view_mode,
          record: recordIndex,
          target: rec?.component,
          status: comp?.status,
          children: [
            ...(rec ? bindingNodes(rec, recordIndex) : []),
            ...treeFieldNodes(entity_type, bundle, recordIndex, step, task),
          ],
        });
        return;
      }
      if (typeof item.component === 'string') {
        const id = qualify(item.component, knownIds);
        const comp = components.get(id);
        if (!comp) errors.push(`${loc(step, task, `${itemPath}.component`)}: no contract for ${id}`);
        const props = comp ? contractProps(comp.contract) : {};
        if (isObj(item.props)) {
          for (const [k, v] of Object.entries(item.props)) {
            if (!(k in props)) errors.push(`${loc(step, task, `${itemPath}.props.${k}`)}: unknown prop ${k}`);
            else if (!literalTypeOk(props[k], v))
              errors.push(`${loc(step, task, `${itemPath}.props.${k}`)}: ${k} type mismatch`);
          }
        }
        const childNodes: CompositionNode[] = [];
        if (isObj(item.slots)) {
          for (const [slot, val] of Object.entries(item.slots)) {
            const nested = Array.isArray(val) ? val : val != null ? [val] : [];
            childNodes.push({
              kind: 'slot',
              identity: slot,
              target: slot,
              children: walkItems(nested, chain, step, task, `${itemPath}.slots.${slot}`),
            });
          }
        }
        nodes.push({
          kind: 'component',
          identity: id,
          status: comp?.status,
          children: childNodes,
        });
        return;
      }
      if (typeof item.scene === 'string') {
        const sceneRef = item.scene;
        if (chain.includes(sceneRef)) {
          errors.push(`${loc(step, task, itemPath)}: cyclic scene reference ${[...chain, sceneRef].join(' → ')}`);
          nodes.push({ kind: 'scene-ref', identity: sceneRef, children: [] });
          return;
        }
        const found = findScene(sceneRef);
        const children = found ? walkItems(found.items, [...chain, sceneRef], step, task, `${itemPath}.scene`) : [];
        if (!found && !sceneTasks.some((s) => s.task.params.scene_name === sceneRef.split(':')[1])) {
          errors.push(`${loc(step, task, `${itemPath}.scene`)}: unknown scene ${sceneRef}`);
        }
        nodes.push({ kind: 'scene-ref', identity: sceneRef, children });
        return;
      }
      if (typeof item.image === 'string') {
        if (!(item.image in imageStyles)) {
          errors.push(`${loc(step, task, `${itemPath}.image`)}: unknown image style ${item.image}`);
        }
        nodes.push({ kind: 'image', identity: item.image, children: [] });
      }
    });
    return nodes;
  }

  function walkComponentTree(items: unknown[], step: string, task: PlanTask, path: string): CompositionNode[] {
    items.forEach((item, i) => {
      if (!isObj(item) || typeof item.component !== 'string') {
        errors.push(`${loc(step, task, `${path}[${i}]`)}: expected ComponentNode`);
      }
    });
    return walkItems(items, [], step, task, path);
  }

  function treeFieldNodes(
    entityType: string,
    bundle: string,
    recordIndex: number | undefined,
    fallbackStep: string,
    fallbackTask: PlanTask,
  ): CompositionNode[] {
    const def = getBundle(model, entityType, bundle);
    if (!def) return [];
    const fields = componentTreeFieldNames(def);
    if (!fields.length) return [];
    const sampleIt = tasks.find(({ task }) => {
      if (task.name !== 'create-sample-data') return false;
      const ident = isObj(task.params.bundle) ? task.params.bundle : {};
      return asString(ident.entity_type) === entityType && asString(ident.bundle) === bundle;
    });
    const step = sampleIt?.step ?? fallbackStep;
    const task = sampleIt?.task ?? fallbackTask;
    const pool = samples.get(`${entityType}.${bundle}`);
    const idx = recordIndex ?? 0;
    const values = pool?.records[idx]?.values ?? {};
    const nodes: CompositionNode[] = [];
    for (const field of fields) {
      const raw = values[field];
      if (!Array.isArray(raw)) {
        errors.push(`${loc(step, task, `records.values.${field}`)}: expected ComponentNode[]`);
        continue;
      }
      nodes.push(...walkComponentTree(raw, step, task, `records.values.${field}`));
    }
    return nodes;
  }

  const roots: CompositionNode[] = [];
  if (sceneTasks.length) {
    for (const { step, task } of sceneTasks) {
      const items = Array.isArray(task.params.items) ? task.params.items : [];
      roots.push({
        kind: 'scene',
        identity: asString(task.params.scene_name) || task.title,
        scope: asString(task.params.scene_scope),
        path: asString(task.params.scene_path),
        children: walkItems(items, [asString(task.params.scene_name)], step, task, 'items'),
      });
    }
  } else {
    const mappedBundles = new Set<string>();
    for (const rec of mappings.values()) {
      mappedBundles.add(`${rec.entity_type}.${rec.bundle}`);
      const comp = rec.component ? components.get(rec.component) : undefined;
      roots.push({
        kind: 'entity',
        identity: `${rec.entity_type}.${rec.bundle}`,
        mode: rec.mode_kind === 'form' ? rec.form_mode : rec.view_mode,
        target: rec.component || undefined,
        status: comp?.status,
        children: [...bindingNodes(rec), ...treeFieldNodes(rec.entity_type, rec.bundle, 0, rec.step, rec.task)],
      });
    }
    for (const key of samples.keys()) {
      if (mappedBundles.has(key)) continue;
      const dot = key.indexOf('.');
      if (dot < 0) continue;
      const entityType = key.slice(0, dot);
      const bundle = key.slice(dot + 1);
      const def = getBundle(model, entityType, bundle);
      if (!def || !componentTreeFieldNames(def).length) continue;
      const sampleIt = tasks.find(
        ({ task }) =>
          task.name === 'create-sample-data' &&
          asString((isObj(task.params.bundle) ? task.params.bundle : {}).entity_type) === entityType &&
          asString((isObj(task.params.bundle) ? task.params.bundle : {}).bundle) === bundle,
      );
      if (!sampleIt) continue;
      roots.push({
        kind: 'entity',
        identity: key,
        children: treeFieldNodes(entityType, bundle, 0, sampleIt.step, sampleIt.task),
      });
    }
    const used = new Set<string>();
    const collect = (nodes: CompositionNode[]) => {
      for (const node of nodes) {
        if (node.kind === 'component') used.add(node.identity);
        if (node.target) used.add(node.target);
        collect(node.children);
      }
    };
    collect(roots);
    for (const [id, c] of components) {
      if (used.has(id)) continue;
      if (c.status === 'wiederverwendet') continue;
      roots.push({ kind: 'component', identity: id, status: c.status, children: [] });
    }
  }

  return { tree: { roots }, errors };
}

function formatNode(node: CompositionNode): string {
  switch (node.kind) {
    case 'scene': {
      const scope = node.scope ? ` (${node.scope})` : '';
      const path = node.path ? ` ${node.path}` : '';
      return `Scene "${node.identity}"${scope}${path}`;
    }
    case 'entity': {
      let s = node.identity;
      if (node.mode) s += ` [${node.mode}]`;
      if (node.record !== undefined) s += ` record ${node.record}`;
      if (node.target) s += ` → ${node.target}`;
      if (node.status) s += ` (${node.status})`;
      return s;
    }
    case 'prop':
      return `prop ${node.target ?? node.identity} ← ${node.source ?? ''}`;
    case 'slot': {
      let s = `slot ${node.target ?? node.identity} ← ${node.source ?? ''}`;
      if (node.count !== undefined) s += ` (reference, ${node.count} selected records)`;
      return s;
    }
    case 'component':
      return `${node.identity}${node.status ? ` (${node.status})` : ''}`;
    case 'image':
      return `image ${node.identity}`;
    case 'scene-ref':
      return `scene ${node.identity}`;
    default:
      return node.identity;
  }
}

export function renderCompositionTree(tree: CompositionTree): string {
  const lines: string[] = [];
  const walk = (node: CompositionNode, prefix: string, isLast: boolean, isRoot: boolean) => {
    if (isRoot) lines.push(formatNode(node));
    else lines.push(prefix + (isLast ? '└─ ' : '├─ ') + formatNode(node));
    const childPrefix = isRoot ? '' : prefix + (isLast ? '   ' : '│  ');
    node.children.forEach((child, i) => {
      walk(child, childPrefix, i === node.children.length - 1, false);
    });
  };
  tree.roots.forEach((root, i) => walk(root, '', i === tree.roots.length - 1, true));
  return lines.join('\n');
}
