/**
 * Scene Parser — parses *.scenes.yml files.
 *
 * Reads the YAML, validates structure, and expands shorthand
 * (e.g. records: [0, 1, 2] → 3 separate entity entries).
 *
 * Items are passed through as SceneNode[] (duck-typed YAML objects).
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
 * - Entity entries with `records: [0, 1, 2]` become 3 separate entries
 * - Component, config, scene entries pass through as-is
 */
export function expandEntries(entries: unknown[]): SceneNode[] {
  const result: SceneNode[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const obj = entry as Record<string, unknown>;

    // Entity entry with records shorthand — expand into individual entries
    if ('entity' in obj && typeof obj.entity === 'string' && Array.isArray(obj.records)) {
      for (const recordIdx of obj.records as number[]) {
        result.push({
          entity: obj.entity,
          view_mode: obj.view_mode,
          record: recordIdx,
        } as SceneNode);
      }
    }
    // Single entity entry — default record to 0
    else if ('entity' in obj && typeof obj.entity === 'string') {
      result.push({
        ...obj,
        record: obj.record ?? 0,
      } as SceneNode);
    }
    // Component, config, scene entries — pass through as-is
    else {
      result.push(obj as SceneNode);
    }
  }

  return result;
}
