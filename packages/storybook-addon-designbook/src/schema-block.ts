/**
 * buildSchemaBlock() — Pure function that resolves param/result declarations
 * from task frontmatter into a SchemaBlock with definitions, params, and result.
 */

import { existsSync, readFileSync } from 'node:fs';
import { load as parseYaml } from 'js-yaml';
import { expandFilePath, resolveSchemaRef } from './workflow-resolve.js';

export interface SchemaEntry {
  path?: string;
  exists?: boolean;
  content?: unknown;
  $ref?: string;
  type?: string;
  [key: string]: unknown;
}

export interface SchemaBlock {
  definitions: Record<string, object>;
  params: Record<string, SchemaEntry>;
  result: Record<string, SchemaEntry>;
}

/** Fields copied from the declaration to the entry are everything except these reserved keys. */
const RESERVED_KEYS = new Set(['path', '$ref', 'workflow']);

export interface BuildSchemaBlockInput {
  params: Record<string, unknown> | undefined;
  result: Record<string, unknown> | undefined;
  taskFilePath: string;
  skillsRoot: string;
  envMap: Record<string, string>;
}

/**
 * Resolve a single property declaration into a SchemaEntry.
 * Used identically for both params and result entries.
 */
function resolveEntry(
  decl: Record<string, unknown>,
  definitions: Record<string, object>,
  input: BuildSchemaBlockInput,
): SchemaEntry {
  const entry: SchemaEntry = {};

  // Copy all fields except reserved keys
  for (const [dk, dv] of Object.entries(decl)) {
    if (RESERVED_KEYS.has(dk)) continue;
    entry[dk] = dv;
  }

  // Resolve path: expand env vars, check existence, read content
  if (typeof decl.path === 'string') {
    const resolved = expandFilePath(decl.path, {}, input.envMap, true);

    // Pattern paths (containing [placeholder]) — pass through unresolved
    if (/\[.+\]/.test(resolved)) {
      entry.path = resolved;
    } else {
      entry.path = resolved;
      entry.exists = existsSync(resolved);
      if (entry.exists && !resolved.endsWith('/')) {
        try {
          const raw = readFileSync(resolved, 'utf-8');
          entry.content = parseYaml(raw) as unknown;
        } catch {
          entry.content = null;
        }
      } else if (!resolved.endsWith('/')) {
        entry.content = null;
      }
    }
  }

  // Resolve $ref into definitions
  if (typeof decl.$ref === 'string') {
    const { typeName, schema } = resolveSchemaRef(decl.$ref, input.taskFilePath, input.skillsRoot);
    definitions[typeName] = schema;
    entry.$ref = `#/definitions/${typeName}`;
  }

  return entry;
}

export function buildSchemaBlock(input: BuildSchemaBlockInput): SchemaBlock {
  const definitions: Record<string, object> = {};
  const params: Record<string, SchemaEntry> = {};
  const result: Record<string, SchemaEntry> = {};

  const paramProps = (input.params?.properties ?? {}) as Record<string, Record<string, unknown>>;
  for (const [key, decl] of Object.entries(paramProps)) {
    if (decl == null || typeof decl !== 'object') continue; // skip invalid declarations (e.g. null, scalar)
    params[key] = resolveEntry(decl, definitions, input);
  }

  const resultProps = (input.result?.properties ?? {}) as Record<string, Record<string, unknown>>;
  for (const [key, decl] of Object.entries(resultProps)) {
    if (decl == null || typeof decl !== 'object') continue; // skip invalid declarations
    result[key] = resolveEntry(decl, definitions, input);
  }

  return { definitions, params, result };
}
