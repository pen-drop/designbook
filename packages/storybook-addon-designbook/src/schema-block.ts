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
 * Pull a `$ref`'d type into `definitions`, recursively resolving the type's OWN
 * nested refs — both cross-file (`path#/Y`) and bare same-file (`#/Y`) — against
 * the file the type lives in. Without this, bare `#/Y` refs inside a
 * cross-file-pulled type dangle: the compiled AJV root has `#/definitions/Y`,
 * not `#/Y`, so validation throws "can't resolve reference". Cycle-safe.
 * Returns the registered type name.
 */
function pullType(
  ref: string,
  baseFilePath: string,
  baseFileSchemas: Record<string, object>,
  definitions: Record<string, object>,
  input: BuildSchemaBlockInput,
  visited: Set<string>,
): string {
  let typeName: string;
  let schema: object;
  let srcFile: string;
  let srcSchemas: Record<string, object>;

  if (ref.startsWith('#/')) {
    // Bare same-file ref — resolve against the file the containing type came from.
    typeName = ref.slice(2);
    const found = baseFileSchemas[typeName];
    if (!found) {
      throw new Error(`Type '${typeName}' not found in ${baseFilePath} (bare '#/' ref)`);
    }
    schema = found;
    srcFile = baseFilePath;
    srcSchemas = baseFileSchemas;
  } else {
    const r = resolveSchemaRef(ref, baseFilePath, input.skillsRoot);
    typeName = r.typeName;
    schema = r.schema;
    srcFile = r.schemaFilePath;
    srcSchemas = r.fileSchemas;
  }

  if (!visited.has(typeName)) {
    visited.add(typeName);
    const clone = structuredClone(schema) as Record<string, unknown>;
    resolveRefsIn(clone, srcFile, srcSchemas, definitions, input, visited);
    definitions[typeName] = clone;
  }
  return typeName;
}

/**
 * Walk a schema body and rewrite every nested `$ref` to a local
 * `#/definitions/TypeName`, pulling each referenced type (and its transitive
 * refs) into `definitions`. `baseFilePath` / `baseFileSchemas` describe the file
 * this body belongs to — used to resolve relative and bare refs. Already-local
 * `#/definitions/...` refs are left untouched.
 */
function resolveRefsIn(
  node: unknown,
  baseFilePath: string,
  baseFileSchemas: Record<string, object>,
  definitions: Record<string, object>,
  input: BuildSchemaBlockInput,
  visited: Set<string>,
): void {
  if (Array.isArray(node)) {
    for (const item of node) resolveRefsIn(item, baseFilePath, baseFileSchemas, definitions, input, visited);
    return;
  }
  if (!node || typeof node !== 'object') return;

  const obj = node as Record<string, unknown>;
  if (typeof obj.$ref === 'string' && obj.$ref.includes('#/') && !obj.$ref.startsWith('#/definitions/')) {
    const typeName = pullType(obj.$ref, baseFilePath, baseFileSchemas, definitions, input, visited);
    obj.$ref = `#/definitions/${typeName}`;
    return;
  }

  for (const value of Object.values(obj)) {
    resolveRefsIn(value, baseFilePath, baseFileSchemas, definitions, input, visited);
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

  const visited = new Set<string>();

  // Resolve top-level $ref into definitions (recursively pulling its own refs).
  if (typeof decl.$ref === 'string') {
    const typeName = pullType(decl.$ref, input.taskFilePath, {}, definitions, input, visited);
    entry.$ref = `#/definitions/${typeName}`;
  }

  // Resolve any nested $ref (e.g. items.$ref, properties.foo.$ref) so AJV can
  // resolve them against the inline definitions map at validation time. Nested
  // refs in the entry body are relative to the task file.
  resolveRefsIn(entry, input.taskFilePath, {}, definitions, input, visited);

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
