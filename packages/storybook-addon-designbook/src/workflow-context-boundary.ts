import { load } from 'js-yaml';
import type { EmbeddedContent, WorkflowDefinition } from './workflow-document.js';

/** Authored work orders are bounded; exact catalogue instructions retain their full bodies. */
export const MAX_AUTHORED_TASK_BYTES = 64 * 1024;

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Identify payload structure, independent of registry IDs, input names and source filenames. */
export function detectReferencePayload(value: unknown, seen = new WeakSet<object>()): string | undefined {
  if (value && typeof value === 'object') {
    if (seen.has(value)) return undefined;
    seen.add(value);
  }
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = detectReferencePayload(child, seen);
      if (found) return found;
    }
  } else if (record(value)) {
    if (Array.isArray(value.child_ids) && record(value.bbox) && record(value.source)) return 'captured PropertyNode';
    if (Array.isArray(value.subjects) && record(value.dependencies) && record(value.provenance))
      return 'resolved reference package';
    if (Array.isArray(value.subjects) && Array.isArray(value.parents) && Array.isArray(value.images))
      return 'full reference extract';
    if (Array.isArray(value.images) && Array.isArray(value.fonts)) return 'unscoped reference asset inventory';
    if (
      (typeof value.tag === 'string' || typeof value.tagName === 'string') &&
      (record(value.rect) || record(value.boundingBox) || record(value.boundingClientRect)) &&
      (record(value.style) || record(value.styles) || record(value.computedStyle))
    )
      return 'observed DOM measurements';
    if (record(value.observations) && ('component' in value || 'composition' in value || 'breakpoint' in value))
      return 'raw reference sample observations';
    for (const child of Object.values(value)) {
      const found = detectReferencePayload(child, seen);
      if (found) return found;
    }
  } else if (typeof value === 'string') {
    const candidates = [
      value,
      ...[...value.matchAll(/```(?:json|ya?ml)?\s*\n([\s\S]*?)```/g)].map((match) => match[1]!),
    ];
    for (const candidate of candidates) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(candidate);
      } catch {
        try {
          parsed = load(candidate);
        } catch {
          continue;
        }
      }
      if (parsed === candidate) continue;
      if (record(parsed) || Array.isArray(parsed) || (typeof parsed === 'string' && parsed !== value)) {
        const found = detectReferencePayload(parsed, seen);
        if (found) return found;
      }
    }
  }
  return undefined;
}

/** Planning gate: reference evidence travels through typed task.reference packages only. */
export function validateAuthoredContext(definition: WorkflowDefinition, catalogueMaterial: EmbeddedContent[]): void {
  const catalogue = (entry: EmbeddedContent) =>
    catalogueMaterial.some(
      (expected) =>
        entry.content === expected.content && [entry.source, ...(entry.sources ?? [])].includes(expected.source),
    );
  const authored = new Map(Object.entries(definition.context).filter(([, entry]) => !catalogue(entry)));
  const check = (value: unknown, label: string) => {
    const kind = detectReferencePayload(value);
    if (kind)
      throw new Error(
        `${label} embeds ${kind}; use a scoped task.reference query instead of copying reference payloads into context or params`,
      );
  };
  check(definition.inputs, 'Workflow inputs');
  for (const [id, entry] of authored) {
    if (Buffer.byteLength(entry.content, 'utf8') > MAX_AUTHORED_TASK_BYTES)
      throw new Error(
        `Authored context ${id} exceeds ${MAX_AUTHORED_TASK_BYTES} bytes; split precise work orders or use scoped reference packages, never truncate instructions`,
      );
    check(entry.content, `Authored context ${id}`);
  }
  for (const task of definition.tasks) {
    const refs = [...new Set([task.instructions, ...task.context])];
    const bytes =
      Buffer.byteLength(JSON.stringify(task.params), 'utf8') +
      refs.reduce((sum, id) => sum + Buffer.byteLength(authored.get(id)?.content ?? '', 'utf8'), 0);
    if (bytes > MAX_AUTHORED_TASK_BYTES)
      throw new Error(
        `Task ${task.id} authored context and params total ${bytes} bytes, exceeding ${MAX_AUTHORED_TASK_BYTES}; split precise work orders or use scoped reference packages, never truncate instructions`,
      );
    check(task.params, `Task ${task.id} params`);
  }
}
