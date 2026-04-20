/**
 * buildSchemaBlock() — Pure function that resolves param/result declarations
 * from task frontmatter into a SchemaBlock with definitions, params, and result.
 */

import { existsSync, readFileSync } from 'node:fs';
import { load as parseYaml } from 'js-yaml';
import { resolveSchemaRef } from './workflow-resolve.js';
import { interpolate } from './template/interpolate.js';

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
 * Recursively resolve nested $ref entries into the definitions map and
 * rewrite them as local AJV-compatible refs (`#/definitions/TypeName`).
 * Skips already-local refs and the top-level $ref (handled separately so the
 * entry-level $ref stays mergeable with the other entry fields).
 */
function resolveNestedRefs(
  node: unknown,
  definitions: Record<string, object>,
  input: BuildSchemaBlockInput,
  depth: number,
): void {
  if (Array.isArray(node)) {
    for (const item of node) resolveNestedRefs(item, definitions, input, depth + 1);
    return;
  }
  if (!node || typeof node !== 'object') return;

  const obj = node as Record<string, unknown>;
  if (depth > 0 && typeof obj.$ref === 'string') {
    const ref = obj.$ref;
    if (ref.includes('#/') && !ref.startsWith('#/')) {
      const { typeName, schema } = resolveSchemaRef(ref, input.taskFilePath, input.skillsRoot);
      definitions[typeName] = schema;
      obj.$ref = `#/definitions/${typeName}`;
    }
  }

  for (const value of Object.values(obj)) {
    resolveNestedRefs(value, definitions, input, depth + 1);
  }
}

/**
 * Resolve a single property declaration into a SchemaEntry.
 * Used identically for both params and result entries.
 */
async function resolveEntry(
  decl: Record<string, unknown>,
  definitions: Record<string, object>,
  input: BuildSchemaBlockInput,
): Promise<SchemaEntry> {
  const entry: SchemaEntry = {};

  // Copy all fields except reserved keys
  for (const [dk, dv] of Object.entries(decl)) {
    if (RESERVED_KEYS.has(dk)) continue;
    entry[dk] = dv;
  }

  // Resolve path: expand env vars, check existence, read content
  if (typeof decl.path === 'string') {
    const resolved = await interpolate(decl.path, {}, { envMap: input.envMap, lenient: true });

    // Pattern paths (containing [placeholder] or unresolved {{ param }}) — pass through unresolved
    if (/\[.+\]/.test(resolved) || /\{\{\s*\w+\s*\}\}/.test(resolved)) {
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

  // Resolve top-level $ref into definitions
  if (typeof decl.$ref === 'string') {
    const { typeName, schema } = resolveSchemaRef(decl.$ref, input.taskFilePath, input.skillsRoot);
    definitions[typeName] = schema;
    entry.$ref = `#/definitions/${typeName}`;
  }

  // Resolve any nested $ref (e.g. items.$ref, properties.foo.$ref) so AJV can
  // resolve them against the inline definitions map at validation time.
  resolveNestedRefs(entry, definitions, input, 1);

  return entry;
}

export async function buildSchemaBlock(input: BuildSchemaBlockInput): Promise<SchemaBlock> {
  const definitions: Record<string, object> = {};
  const params: Record<string, SchemaEntry> = {};
  const result: Record<string, SchemaEntry> = {};

  const paramProps = (input.params?.properties ?? {}) as Record<string, Record<string, unknown>>;
  for (const [key, decl] of Object.entries(paramProps)) {
    if (decl == null || typeof decl !== 'object') continue; // skip invalid declarations (e.g. null, scalar)
    params[key] = await resolveEntry(decl, definitions, input);
  }

  const resultProps = (input.result?.properties ?? {}) as Record<string, Record<string, unknown>>;
  for (const [key, decl] of Object.entries(resultProps)) {
    if (decl == null || typeof decl !== 'object') continue; // skip invalid declarations
    result[key] = await resolveEntry(decl, definitions, input);
  }

  return { definitions, params, result };
}
