/**
 * Planning schema references.
 *
 * Answers one question: what JSON Schema does a `$ref` in task frontmatter denote?
 * Loads `schemas.yml` files, resolves relative and skill-qualified refs across
 * project and plugin layouts, and hoists transitive local refs into a flat map
 * AJV can register. Knows nothing about steps, rules or blueprints.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import type { SkillSource } from './skill-sources.js';
import { pluginSources } from './planning-sources.js';

/** Result declaration entry in task frontmatter — file results have `path:`, data results don't. */
export interface ResultDeclaration {
  path?: string; // file result path template
  $ref?: string; // schema reference (e.g. ../schemas.yml#/Check)
  validators?: string[]; // semantic validator keys
  /** Who produces the content. `data` (default) = AI submits via --data; `direct` = task code writes the file. */
  submission?: 'data' | 'direct';
  /** Backend-neutral prepare step: run a command before AI submission and bind its output as `as`. */
  prepare?: { cmd: string; as: string };
  /** Backend-neutral generator: a JSONata expression file that produces the result value. */
  generator?: { jsonata: string };
  type?: string; // inline JSON Schema type
  items?: unknown; // inline JSON Schema items (for arrays)
  [key: string]: unknown; // additional JSON Schema properties
}

/**
 * Load a schemas.yml file and return a map of PascalCase type names to JSON Schema definitions.
 * Validates that all keys are PascalCase and all values are objects.
 */
export function loadSchemaFile(schemaFilePath: string): Record<string, object> {
  if (!existsSync(schemaFilePath)) {
    throw new Error(`Schema file not found: ${schemaFilePath}`);
  }
  const raw = readFileSync(schemaFilePath, 'utf-8');
  const parsed = parseYaml(raw) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Schema file is not a valid YAML map: ${schemaFilePath}`);
  }
  const schemas: Record<string, object> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(key)) {
      throw new Error(`Schema key '${key}' in ${schemaFilePath} must be PascalCase`);
    }
    if (!value || typeof value !== 'object') {
      throw new Error(`Schema '${key}' in ${schemaFilePath} must be a JSON Schema object`);
    }
    schemas[key] = value as object;
  }
  return schemas;
}

/**
 * Re-anchor a relative `$ref` that crossed into a sibling plugin SkillSource.
 *
 * Cross-skill relative refs (e.g. `../../designbook/css-generate/schemas.yml`
 * authored in skill `designbook-css-tailwind`) are written for the *project*
 * `skills/` layout, where `../../` walks `tasks/ → <skill>/ → skills/` and the
 * next segment is a sibling skill name. In the **plugin-cache** layout each skill
 * sits under an extra `<hash>` segment (`<mp>/<skill>/<hash>/...`), so `../../`
 * lands one level short — inside the *current* skill dir instead of the
 * marketplace dir — producing a bogus path like
 * `<mp>/designbook-css-tailwind/designbook/css-generate/schemas.yml`.
 *
 * To recover, scan the bogus path for a segment that names a known env
 * SkillSource and re-anchor the remainder against that source's (hashed) content
 * root: `<source.root>/<rest-after-skill-name>`. The LAST matching segment wins
 * — it is the closest to the file and corresponds to the ref's intended target.
 *
 * Returns the re-anchored absolute path, or `undefined` when no env source name
 * appears in the path (so the caller keeps the original resolution).
 */
function reanchorRelativeRefToPluginSource(resolvedPath: string, sources?: SkillSource[]): string | undefined {
  const plugins = pluginSources(sources);
  if (plugins.length === 0) return undefined;
  const byName = new Map(plugins.map((s) => [s.name, s]));
  const segments = resolvedPath.replace(/\\/g, '/').split('/');
  for (let i = segments.length - 2; i >= 0; i--) {
    const source = byName.get(segments[i]!);
    if (!source) continue;
    const rest = segments.slice(i + 1).join('/');
    const candidate = resolve(source.root, rest);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Resolve a $ref path to a schema definition.
 * Supports two forms:
 *   - Relative: `../schemas.yml#/Check` — resolved from the task file's directory
 *   - Skill-qualified: `designbook/design/schemas.yml#/Check` — resolved from skills root
 */
export function resolveSchemaRef(
  ref: string,
  taskFilePath: string,
  skillsRoot: string,
  sources?: SkillSource[],
): { typeName: string; schema: object; schemaFilePath: string; fileSchemas: Record<string, object> } {
  const hashIdx = ref.indexOf('#/');
  if (hashIdx === -1) {
    throw new Error(`Invalid $ref '${ref}' — must contain '#/' fragment (e.g. ../schemas.yml#/TypeName)`);
  }
  const filePart = ref.slice(0, hashIdx);
  const typeName = ref.slice(hashIdx + 2);

  // Resolve file path: relative (starts with . or /) vs skill-qualified
  let schemaFilePath: string;
  if (filePart.startsWith('.') || filePart.startsWith('/')) {
    schemaFilePath = resolve(dirname(taskFilePath), filePart);
    // Plugin-cache layout: a relative ref that crosses into a sibling skill is
    // off-by-one (extra `<hash>` segment) and resolves to a non-existent path.
    // Re-anchor it via the plugin SkillSource that owns the target skill name.
    if (!existsSync(schemaFilePath)) {
      const reanchored = reanchorRelativeRefToPluginSource(schemaFilePath, sources);
      if (reanchored) schemaFilePath = reanchored;
    }
  } else {
    // Skill-qualified: `<skillName>/sub/schemas.yml`. When <skillName> matches a
    // plugin SkillSource, resolve against that source's content root; otherwise
    // resolve relative to the project skills root.
    const skillName = filePart.split('/')[0] ?? '';
    const pluginSource = pluginSources(sources).find((s) => s.name === skillName);
    if (pluginSource) {
      const rest = filePart.slice(skillName.length + 1); // strip `<skillName>/`
      schemaFilePath = resolve(pluginSource.root, rest);
    } else {
      schemaFilePath = resolve(skillsRoot, filePart);
    }
  }

  const fileSchemas = loadSchemaFile(schemaFilePath);
  if (!(typeName in fileSchemas)) {
    const available = Object.keys(fileSchemas).join(', ');
    throw new Error(`Type '${typeName}' not found in ${schemaFilePath}. Available: ${available}`);
  }
  return { typeName, schema: fileSchemas[typeName]!, schemaFilePath, fileSchemas };
}

/**
 * Walk a schema object and collect all local `#/TypeName` refs into the target
 * `schemas` map by resolving them from the schemas file they originated from.
 * Handles transitive references — if a resolved type itself references others.
 *
 * Example: Component's schema has `{ $ref: "#/DesignHint" }`. After hoisting
 * Component into the workflow's top-level schemas map, `DesignHint` also needs
 * to live there so AJV can resolve the ref.
 */
export function collectLocalRefsFromSchema(
  node: unknown,
  fileSchemas: Record<string, object>,
  schemas: Record<string, object>,
  visited: Set<string>,
  schemaFilePath: string,
  skillsRoot: string,
  sources?: SkillSource[],
): void {
  if (Array.isArray(node)) {
    for (const item of node)
      collectLocalRefsFromSchema(item, fileSchemas, schemas, visited, schemaFilePath, skillsRoot, sources);
    return;
  }
  if (!node || typeof node !== 'object') return;

  const obj = node as Record<string, unknown>;
  if (typeof obj.$ref === 'string') {
    const ref = obj.$ref;
    if (ref.startsWith('#/')) {
      const typeName = ref.slice(2);
      if (typeName && !(typeName in schemas) && typeName in fileSchemas && !visited.has(typeName)) {
        visited.add(typeName);
        schemas[typeName] = fileSchemas[typeName]!;
        collectLocalRefsFromSchema(
          fileSchemas[typeName],
          fileSchemas,
          schemas,
          visited,
          schemaFilePath,
          skillsRoot,
          sources,
        );
      }
    } else if (ref.includes('#/')) {
      // Cross-file ref nested inside a resolved schema — resolve relative to the
      // file the outer schema was loaded from, then rewrite to local AJV form.
      const resolved = resolveSchemaRef(ref, schemaFilePath, skillsRoot, sources);
      obj.$ref = `#/${resolved.typeName}`;
      if (!(resolved.typeName in schemas) && !visited.has(resolved.typeName)) {
        visited.add(resolved.typeName);
        schemas[resolved.typeName] = resolved.schema;
        collectLocalRefsFromSchema(
          resolved.schema,
          resolved.fileSchemas,
          schemas,
          visited,
          resolved.schemaFilePath,
          skillsRoot,
          sources,
        );
      }
    }
  }

  for (const value of Object.values(obj)) {
    collectLocalRefsFromSchema(value, fileSchemas, schemas, visited, schemaFilePath, skillsRoot, sources);
  }
}

// ── Params ──────────────────────────────────────────────────────────

/**
 * Resolve a `$ref` in a `params:` declaration.
 * Extracts `properties` from the referenced schema and merges with explicit entries (explicit wins).
 */
export function resolveParamsRef(
  params: Record<string, unknown>,
  taskFilePath: string,
  skillsRoot: string,
  sources?: SkillSource[],
): Record<string, unknown> {
  const ref = params['$ref'] as string;
  const { schema } = resolveSchemaRef(ref, taskFilePath, skillsRoot, sources);

  const schemaObj = schema as Record<string, unknown>;
  const schemaProps = schemaObj.properties as Record<string, unknown> | undefined;
  if (!schemaProps) {
    throw new Error(
      `$ref '${ref}' in params: resolved to a schema without 'properties'. ` +
        `params: $ref must point to an object schema with properties.`,
    );
  }

  // Merge properties: $ref first, explicit overrides
  const explicitProps = (params.properties ?? {}) as Record<string, unknown>;
  const mergedProperties: Record<string, unknown> = { ...schemaProps, ...explicitProps };

  // Concatenate required arrays
  const schemaRequired = (schemaObj.required ?? []) as string[];
  const explicitRequired = (params.required ?? []) as string[];
  const mergedRequired = [...schemaRequired, ...explicitRequired];

  // Build merged result: copy all non-special keys, then set merged values
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === '$ref' || key === 'properties' || key === 'required') continue;
    resolved[key] = value;
  }
  resolved.properties = mergedProperties;
  if (mergedRequired.length > 0) {
    resolved.required = mergedRequired;
  }

  return resolved;
}

/**
 * Check whether a param value is a valid inline JSON Schema object.
 * Valid: object with a `type` or `$ref` property (e.g. `{ type: 'string' }`).
 * Invalid: null, bare array, bare object without `type`, scalar.
 */
function isJsonSchemaParam(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && ('type' in value || '$ref' in value);
}

/**
 * Validate that all params in a task file use the inline JSON Schema wrapper format.
 * Throws with a descriptive error naming the offending key.
 */
export function validateParamFormats(params: Record<string, unknown>, taskFile: string): void {
  const properties = params.properties as Record<string, unknown> | undefined;
  if (!properties) {
    // A flat map (param names at the top level) is the shape this rejects.
    const hasParamLikeKeys = Object.keys(params).some(
      (k) => k !== 'type' && k !== 'required' && k !== 'properties' && k !== '$ref',
    );
    if (hasParamLikeKeys) {
      throw new Error(
        `Params in ${taskFile} must use wrapper format: { type: object, properties: { ... } }. ` +
          `Found flat map keys: ${Object.keys(params).join(', ')}.`,
      );
    }
    return; // Truly empty params — OK
  }

  for (const [key, value] of Object.entries(properties)) {
    if (isJsonSchemaParam(value)) continue;

    const got =
      value === null
        ? 'null'
        : Array.isArray(value)
          ? 'array'
          : typeof value === 'object'
            ? 'object without "type"'
            : typeof value;
    throw new Error(
      `Invalid param "${key}" in ${taskFile}: expected JSON Schema object with "type" property, got ${got}.`,
    );
  }
}
