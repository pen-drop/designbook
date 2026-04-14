/**
 * Schema composition: merge base task result schemas with extends/provides/constrains
 * from rules and blueprints.
 *
 * Merge order:
 *   base schema → blueprint extends → rule extends → blueprint provides → rule provides → rule constrains
 */

import { existsSync, readFileSync } from 'node:fs';
import { load as parseYaml } from 'js-yaml';
import { resolveSchemaRef } from './workflow-resolve.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SchemaExtension {
  extends?: Record<string, unknown>;
  provides?: Record<string, unknown> | string;
  constrains?: Record<string, unknown>;
}

interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  default?: unknown;
  enum?: unknown[];
  [key: string]: unknown;
}

// ── Frontmatter Parsing ──────────────────────────────────────────────────────

/**
 * Parse extends/provides/constrains from a rule or blueprint frontmatter file.
 * Returns null if the file has none of these fields.
 */
export function parseSchemaExtension(filePath: string): SchemaExtension | null {
  if (!existsSync(filePath)) return null;

  const raw = readFileSync(filePath, 'utf-8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const fm = parseYaml(fmMatch[1]!) as Record<string, unknown> | null;
  if (!fm) return null;

  const ext: SchemaExtension = {};
  let hasAny = false;

  if (fm.extends && typeof fm.extends === 'object') {
    ext.extends = fm.extends as Record<string, unknown>;
    hasAny = true;
  }
  if (fm.provides !== undefined) {
    ext.provides = fm.provides as Record<string, unknown> | string;
    hasAny = true;
  }
  if (fm.constrains && typeof fm.constrains === 'object') {
    ext.constrains = fm.constrains as Record<string, unknown>;
    hasAny = true;
  }

  return hasAny ? ext : null;
}

// ── $ref Resolution ──────────────────────────────────────────────────────────

/**
 * Resolve $ref entries within an extends/provides/constrains object.
 * Modifies the object in place, replacing $ref with the resolved schema.
 */
export function resolveRefsInExtension(
  obj: Record<string, unknown>,
  sourceFilePath: string,
  skillsRoot: string,
  schemas: Record<string, object>,
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$ref' && typeof value === 'string') {
      const { typeName, schema } = resolveSchemaRef(value, sourceFilePath, skillsRoot);
      schemas[typeName] = schema;
      // Replace $ref with the resolved schema properties
      delete obj.$ref;
      Object.assign(obj, schema);
      return;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      resolveRefsInExtension(value as Record<string, unknown>, sourceFilePath, skillsRoot, schemas);
    }
  }
}

// ── Deep Merge ───────────────────────────────────────────────────────────────

/**
 * Deep-merge for extends: add new properties. Error on duplicate property names at any level.
 */
export function deepMergeExtends(target: JsonSchema, source: Record<string, unknown>, sourcePath: string): void {
  for (const [key, value] of Object.entries(source)) {
    if (key === 'properties' && typeof value === 'object' && value !== null) {
      target.properties = target.properties ?? {};
      for (const [propName, propSchema] of Object.entries(value as Record<string, unknown>)) {
        if (propName in target.properties) {
          throw new Error(
            `Schema extends conflict: property '${propName}' already exists in base schema. Source: ${sourcePath}`,
          );
        }
        target.properties[propName] = propSchema as JsonSchema;
      }
      continue;
    }
    if (key === 'required' && Array.isArray(value)) {
      target.required = [...(target.required ?? []), ...(value as string[])];
      continue;
    }
    // For non-properties keys, merge normally
    if (!(key in target)) {
      (target as Record<string, unknown>)[key] = value;
    }
  }
}

/**
 * Merge provides: set default values for properties. Last writer wins for same property.
 */
export function mergeProvides(target: JsonSchema, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    if (key === 'properties' && typeof value === 'object' && value !== null) {
      target.properties = target.properties ?? {};
      for (const [propName, propOverrides] of Object.entries(value as Record<string, unknown>)) {
        if (typeof propOverrides === 'object' && propOverrides !== null) {
          target.properties[propName] = {
            ...(target.properties[propName] ?? {}),
            ...(propOverrides as JsonSchema),
          };
        }
      }
      continue;
    }
    // Top-level provides values set defaults
    (target as Record<string, unknown>)[key] = value;
  }
}

/**
 * Merge constrains: intersect enum values across multiple sources.
 * Only enum intersection is supported.
 */
export function mergeConstrains(target: JsonSchema, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    if (key === 'properties' && typeof value === 'object' && value !== null) {
      target.properties = target.properties ?? {};
      for (const [propName, constraints] of Object.entries(value as Record<string, unknown>)) {
        if (typeof constraints === 'object' && constraints !== null) {
          const existing = target.properties[propName] ?? {};
          target.properties[propName] = existing;
          mergeConstrains(target.properties[propName]!, constraints as Record<string, unknown>);
        }
      }
      continue;
    }
    if (key === 'enum' && Array.isArray(value)) {
      const existing = target.enum;
      if (existing && Array.isArray(existing)) {
        // Intersect: keep only values present in both
        target.enum = existing.filter((v) => (value as unknown[]).includes(v));
      } else {
        target.enum = [...(value as unknown[])];
      }
      continue;
    }
    // Other constraint keys (like pattern) override
    (target as Record<string, unknown>)[key] = value;
  }
}

// ── Main Merge Function ──────────────────────────────────────────────────────

export interface MergeInput {
  blueprintFiles: string[];
  ruleFiles: string[];
  skillsRoot: string;
  schemas: Record<string, object>;
}

/**
 * Compute the merged schema for a task's result declarations.
 *
 * Takes the base result schema from the task and merges in extensions from
 * matched rules and blueprints, following the merge order:
 *   base → blueprint extends → rule extends → blueprint provides → rule provides → rule constrains
 *
 * @param baseResult - The task's result declarations (from frontmatter)
 * @param input - Blueprint/rule file paths and resolution context
 * @returns Merged schema map, keyed by result key. Only includes keys that were modified.
 */
export function computeMergedSchema(
  baseResult: Record<string, { schema?: object; [key: string]: unknown }>,
  input: MergeInput,
): Record<string, object> | undefined {
  // Parse extensions from all blueprints and rules
  const blueprintExts: Array<{ path: string; ext: SchemaExtension }> = [];
  const ruleExts: Array<{ path: string; ext: SchemaExtension }> = [];

  for (const bp of input.blueprintFiles) {
    const ext = parseSchemaExtension(bp);
    if (ext) {
      // 3.7: Blueprints must NOT use constrains
      if (ext.constrains) {
        throw new Error(`Blueprint '${bp}' uses constrains: — only rules may constrain schemas`);
      }
      // 3.5: Resolve $refs
      if (ext.extends) resolveRefsInExtension(ext.extends, bp, input.skillsRoot, input.schemas);
      if (ext.provides && typeof ext.provides === 'object') {
        resolveRefsInExtension(ext.provides, bp, input.skillsRoot, input.schemas);
      }
      blueprintExts.push({ path: bp, ext });
    }
  }

  for (const rule of input.ruleFiles) {
    const ext = parseSchemaExtension(rule);
    if (ext) {
      // 3.10: Ignore string-valued provides (AI signal only)
      if (typeof ext.provides === 'string') {
        ext.provides = undefined;
      }
      // 3.5: Resolve $refs
      if (ext.extends) resolveRefsInExtension(ext.extends, rule, input.skillsRoot, input.schemas);
      if (ext.provides && typeof ext.provides === 'object') {
        resolveRefsInExtension(ext.provides as Record<string, unknown>, rule, input.skillsRoot, input.schemas);
      }
      if (ext.constrains) resolveRefsInExtension(ext.constrains, rule, input.skillsRoot, input.schemas);
      ruleExts.push({ path: rule, ext });
    }
  }

  // If no extensions found, return undefined (no merged schema needed)
  if (blueprintExts.length === 0 && ruleExts.length === 0) {
    return undefined;
  }

  const merged: Record<string, object> = {};

  for (const [resultKey, resultDecl] of Object.entries(baseResult)) {
    // Start with a deep copy of the base schema
    const baseSchema = resultDecl.schema ? (structuredClone(resultDecl.schema) as JsonSchema) : ({} as JsonSchema);

    let wasModified = false;

    // Merge order: blueprint extends → rule extends → blueprint provides → rule provides → rule constrains

    // 1. Blueprint extends
    for (const { path, ext } of blueprintExts) {
      if (ext.extends?.[resultKey] && typeof ext.extends[resultKey] === 'object') {
        deepMergeExtends(baseSchema, ext.extends[resultKey] as Record<string, unknown>, path);
        wasModified = true;
      }
    }

    // 2. Rule extends
    for (const { path, ext } of ruleExts) {
      if (ext.extends?.[resultKey] && typeof ext.extends[resultKey] === 'object') {
        deepMergeExtends(baseSchema, ext.extends[resultKey] as Record<string, unknown>, path);
        wasModified = true;
      }
    }

    // 3. Blueprint provides
    for (const { ext } of blueprintExts) {
      if (ext.provides && typeof ext.provides === 'object') {
        const provides = ext.provides as Record<string, unknown>;
        if (provides[resultKey] && typeof provides[resultKey] === 'object') {
          mergeProvides(baseSchema, provides[resultKey] as Record<string, unknown>);
          wasModified = true;
        }
      }
    }

    // 4. Rule provides
    for (const { ext } of ruleExts) {
      if (ext.provides && typeof ext.provides === 'object') {
        const provides = ext.provides as Record<string, unknown>;
        if (provides[resultKey] && typeof provides[resultKey] === 'object') {
          mergeProvides(baseSchema, provides[resultKey] as Record<string, unknown>);
          wasModified = true;
        }
      }
    }

    // 5. Rule constrains
    for (const { ext } of ruleExts) {
      if (ext.constrains?.[resultKey] && typeof ext.constrains[resultKey] === 'object') {
        mergeConstrains(baseSchema, ext.constrains[resultKey] as Record<string, unknown>);
        wasModified = true;
      }
    }

    if (wasModified) {
      merged[resultKey] = baseSchema;
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}
