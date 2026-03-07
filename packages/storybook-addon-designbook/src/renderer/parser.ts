/**
 * Screen Parser — parses *.screen.yml files.
 *
 * Reads the YAML, validates structure, and expands shorthand
 * (e.g. records: [0, 1, 2] → 3 separate entity entries).
 */

import type { ScreenDef, ScreenLayoutEntry, ScreenEntityEntry } from './types';

/**
 * Parse raw YAML object into a validated ScreenDef.
 *
 * @throws Error if required fields are missing
 */
export function parseScreen(raw: unknown): ScreenDef {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Screen file must contain a YAML object');
  }

  const obj = raw as Record<string, unknown>;

  if (!obj.name || typeof obj.name !== 'string') {
    throw new Error('Screen file must have a "name" field');
  }

  if (!obj.layout || typeof obj.layout !== 'object') {
    throw new Error('Screen file must have a "layout" object');
  }

  const layout: Record<string, ScreenLayoutEntry[]> = {};

  for (const [slotName, entries] of Object.entries(obj.layout as Record<string, unknown>)) {
    if (!Array.isArray(entries)) {
      throw new Error(`Layout slot "${slotName}" must be an array`);
    }

    layout[slotName] = expandEntries(entries);
  }

  return {
    name: obj.name as string,
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
function expandEntries(entries: unknown[]): ScreenLayoutEntry[] {
  const result: ScreenLayoutEntry[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const obj = entry as Record<string, unknown>;

    // Entity entry
    if ('entity' in obj && typeof obj.entity === 'string') {
      const entityEntry = obj as unknown as ScreenEntityEntry;

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
    // Component entry
    else if ('component' in obj && typeof obj.component === 'string') {
      result.push(obj as unknown as ScreenLayoutEntry);
    }
  }

  return result;
}
