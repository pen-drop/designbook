/**
 * Scene Parser — parses *.scenes.yml files.
 *
 * Reads the YAML, validates structure, and returns items as SceneNode[].
 * Entries pass through unchanged; record selection is resolved later via
 * the `select:` predicate in entity-builder (JSONata).
 */

import type { SceneDef, SceneNode } from './types';

/**
 * Parse raw YAML object into a validated SceneDef.
 *
 * @throws Error if required fields are missing
 */
export function parseScene(raw: unknown): SceneDef {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Scene file must contain a YAML object');
  }

  const obj = raw as Record<string, unknown>;

  if (!obj.name || typeof obj.name !== 'string') {
    throw new Error('Scene file must have a "name" field');
  }

  const rawItems = obj.items;
  if (!Array.isArray(rawItems)) {
    throw new Error('Scene must have an "items" array');
  }

  return {
    name: obj.name as string,
    docs: typeof obj.docs === 'string' ? obj.docs : undefined,
    section: typeof obj.section === 'string' ? obj.section : undefined,
    group: typeof obj.group === 'string' ? obj.group : undefined,
    items: expandEntries(rawItems),
  };
}

/**
 * Expand entries in a scene items array.
 * - Entity, component, config, scene entries pass through as-is
 * - Record selection is a JSONata `select:` predicate resolved in entity-builder
 */
export function expandEntries(entries: unknown[]): SceneNode[] {
  const result: SceneNode[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    // Entity, component, config, scene entries — pass through as-is.
    // Record selection is a JSONata `select:` predicate resolved in entity-builder.
    result.push(entry as SceneNode);
  }

  return result;
}
