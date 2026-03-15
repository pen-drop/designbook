/**
 * Scene Parser — parses *.scenes.yml files.
 *
 * Reads the YAML, validates structure, and expands shorthand
 * (e.g. records: [0, 1, 2] → 3 separate entity entries).
 */

import type { SceneDef, SceneLayoutEntry, SceneEntityEntry, SceneConfigEntry } from './types';

/**
 * Parse raw YAML object into a validated SceneDef.
 *
 * Supports both the new scenes[] format and legacy single-scene format.
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

  // Support both 'page' (new) and 'layout' (legacy) keys
  const layoutObj = obj.layout || obj.page;
  if (!layoutObj || typeof layoutObj !== 'object') {
    throw new Error('Scene file must have a "layout" object');
  }

  const layout: Record<string, SceneLayoutEntry[]> = {};

  for (const [slotName, entries] of Object.entries(layoutObj as Record<string, unknown>)) {
    if (!Array.isArray(entries)) {
      throw new Error(`Layout slot "${slotName}" must be an array`);
    }

    layout[slotName] = expandEntries(entries);
  }

  return {
    name: obj.name as string,
    docs: typeof obj.docs === 'string' ? obj.docs : undefined,
    section: typeof obj.section === 'string' ? obj.section : undefined,
    group: typeof obj.group === 'string' ? obj.group : undefined,
    layout,
  };
}

/**
 * Expand entries in a layout slot.
 * - Entity entries with `records: [0, 1, 2]` become 3 separate entries
 * - Component entries pass through as-is
 */
function expandEntries(entries: unknown[]): SceneLayoutEntry[] {
  const result: SceneLayoutEntry[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const obj = entry as Record<string, unknown>;

    // Entity entry
    if ('entity' in obj && typeof obj.entity === 'string') {
      const entityEntry = obj as unknown as SceneEntityEntry;

      // Expand records shorthand
      if (entityEntry.records && Array.isArray(entityEntry.records)) {
        for (const recordIdx of entityEntry.records) {
          result.push({
            entity: entityEntry.entity,
            view_mode: entityEntry.view_mode,
            record: recordIdx,
          });
        }
      } else {
        // Single record (default 0)
        result.push({
          entity: entityEntry.entity,
          view_mode: entityEntry.view_mode,
          record: entityEntry.record ?? 0,
        });
      }
    }
    // Config entry (e.g., list)
    else if ('config' in obj && typeof obj.config === 'string') {
      result.push({
        config: obj.config,
        view_mode: typeof obj.view_mode === 'string' ? obj.view_mode : undefined,
      } as SceneConfigEntry);
    }
    // Component entry
    else if ('component' in obj && typeof obj.component === 'string') {
      result.push(obj as unknown as SceneLayoutEntry);
    }
  }

  return result;
}
