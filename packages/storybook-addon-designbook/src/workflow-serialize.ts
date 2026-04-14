/**
 * Schema-driven serialization for workflow results.
 *
 * Two serialization modes:
 * 1. Convention-based markdown flattening (flattenToMarkdown) — uses JSON Schema titles as headings
 * 2. Template rendering — Mustache-like syntax for custom output formats
 *
 * Extension-based dispatch:
 * - .md  → flattenToMarkdown (or template if declared)
 * - .yml/.yaml → yaml.dump
 * - .json → JSON.stringify with 2-space indent
 */

import { dump as yamlDump } from 'js-yaml';

export type { SchemaProperty };

// ── Types ────────────────────────────────────────────────────────────────────

interface SchemaProperty {
  type?: string;
  title?: string;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  default?: unknown;
  [key: string]: unknown;
}

// ── Markdown Flattening ──────────────────────────────────────────────────────

/**
 * Convert a data object to Markdown using its JSON Schema for structure.
 *
 * Convention:
 * - First required string property → h1
 * - Other string properties → h2 + body
 * - Array of strings → h2 + bullet list
 * - Array of objects → h2 + h3 sub-sections (using first string prop as h3 title)
 * - Nested objects → h2 + h3/h4 sub-keys
 * - null/undefined values are omitted
 */
export function flattenToMarkdown(schema: SchemaProperty, data: Record<string, unknown>): string {
  const lines: string[] = [];
  const props = schema.properties ?? {};
  const required = new Set(schema.required ?? []);

  let h1Emitted = false;

  for (const [key, propSchema] of Object.entries(props)) {
    const value = data[key];
    if (value === null || value === undefined) continue;

    const title = propSchema.title ?? keyToTitleCase(key);

    // First required string → h1
    if (!h1Emitted && propSchema.type === 'string' && required.has(key)) {
      lines.push(`# ${value as string}`, '');
      h1Emitted = true;
      continue;
    }

    if (propSchema.type === 'string') {
      lines.push(`## ${title}`, '', value as string);
    } else if (propSchema.type === 'array' && Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`## ${title}`, '');
      flattenArray(lines, propSchema, value);
    } else if (propSchema.type === 'object' && typeof value === 'object') {
      lines.push(`## ${title}`, '');
      flattenObject(lines, propSchema, value as Record<string, unknown>, 3);
    } else {
      // Primitive fallback
      lines.push(`## ${title}`, '', String(value));
    }

    lines.push('');
  }

  // Trim trailing blank lines
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n') + '\n';
}

function flattenArray(lines: string[], schema: SchemaProperty, items: unknown[]): void {
  const itemSchema = schema.items;

  if (!itemSchema || itemSchema.type === 'string') {
    // Array of strings → bullet list
    for (const item of items) {
      lines.push(`- ${item}`);
    }
    return;
  }

  if (itemSchema.type === 'object' && itemSchema.properties) {
    // Array of objects → h3 sub-sections
    for (const item of items) {
      if (typeof item !== 'object' || item === null) continue;
      const obj = item as Record<string, unknown>;
      const subProps = itemSchema.properties!;

      // Find first string property for h3 title
      let subTitle: string | undefined;
      let titleKey: string | undefined;
      for (const [k, s] of Object.entries(subProps)) {
        if (s.type === 'string' && obj[k]) {
          subTitle = obj[k] as string;
          titleKey = k;
          break;
        }
      }

      if (subTitle) {
        lines.push(`### ${subTitle}`);
      }

      // Emit remaining properties
      for (const [k, s] of Object.entries(subProps)) {
        if (k === titleKey) continue;
        const v = obj[k];
        if (v === null || v === undefined) continue;

        if (s.type === 'string') {
          lines.push('', v as string);
        } else if (s.type === 'array' && Array.isArray(v)) {
          for (const vi of v) {
            lines.push(`- ${vi}`);
          }
        } else {
          lines.push('', String(v));
        }
      }

      lines.push('');
    }
    return;
  }

  // Fallback: stringify items
  for (const item of items) {
    lines.push(`- ${typeof item === 'object' ? JSON.stringify(item) : item}`);
  }
}

function flattenObject(
  lines: string[],
  schema: SchemaProperty,
  data: Record<string, unknown>,
  headingLevel: number,
): void {
  const props = schema.properties ?? {};
  const prefix = '#'.repeat(Math.min(headingLevel, 6));

  for (const [key, propSchema] of Object.entries(props)) {
    const value = data[key];
    if (value === null || value === undefined) continue;

    const title = propSchema.title ?? keyToTitleCase(key);

    if (propSchema.type === 'string') {
      lines.push(`${prefix} ${title}`, '', value as string);
    } else if (propSchema.type === 'array' && Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${prefix} ${title}`, '');
      flattenArray(lines, propSchema, value);
    } else if (propSchema.type === 'object' && typeof value === 'object') {
      lines.push(`${prefix} ${title}`, '');
      flattenObject(lines, propSchema, value as Record<string, unknown>, headingLevel + 1);
    } else {
      lines.push(`${prefix} ${title}`, '', String(value));
    }

    lines.push('');
  }
}

// ── Template Rendering ───────────────────────────────────────────────────────

/**
 * Render a Mustache-like template with data.
 *
 * Supported syntax:
 * - {{ prop }}         — interpolate a value
 * - {{ . }}            — current item in an each block
 * - {{#each array}}...{{/each}}  — iterate over an array
 * - {{#if prop}}...{{/if}}       — conditional block (omit if null/undefined/false/empty array)
 */
export function renderTemplate(template: string, data: Record<string, unknown>): string {
  return renderBlock(template, data);
}

function renderBlock(template: string, context: Record<string, unknown>, currentItem?: unknown): string {
  let result = template;

  // Process {{#each key}}...{{/each}} blocks
  result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match, key: string, body: string) => {
    const arr = context[key];
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return renderBlock(body, { ...context, ...item }, item);
        }
        return renderBlock(body, context, item);
      })
      .join('');
  });

  // Process {{#if key}}...{{/if}} blocks
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, key: string, body: string) => {
    const val = context[key];
    if (val === null || val === undefined || val === false || (Array.isArray(val) && val.length === 0)) return '';
    return renderBlock(body, context, currentItem);
  });

  // Interpolate {{ . }} (current item)
  result = result.replace(/\{\{\s*\.\s*\}\}/g, () => {
    return currentItem !== undefined ? String(currentItem) : '';
  });

  // Interpolate {{ prop }}
  result = result.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const val = context[key];
    if (val === null || val === undefined) return '';
    return String(val);
  });

  return result;
}

// ── Extension-Based Dispatch ─────────────────────────────────────────────────

/**
 * Serialize data for writing to a file, based on file extension and optional schema/template.
 *
 * @param path - Target file path (used to determine extension)
 * @param data - The data to serialize
 * @param schema - JSON Schema for markdown flattening (optional)
 * @param template - Template string for custom rendering (optional, overrides flattenToMarkdown)
 * @returns Serialized string content
 */
export function serializeForPath(path: string, data: unknown, schema?: SchemaProperty, template?: string): string {
  const ext = extname(path);

  switch (ext) {
    case '.md': {
      if (template) {
        const ctx = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : { value: data };
        return renderTemplate(template, ctx);
      }
      if (schema && typeof data === 'object' && data !== null) {
        return flattenToMarkdown(schema, data as Record<string, unknown>);
      }
      // Fallback: stringify
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    }
    case '.yml':
    case '.yaml':
      return yamlDump(data, { lineWidth: -1, noRefs: true });
    case '.json':
      return JSON.stringify(data, null, 2) + '\n';
    default:
      // Unknown extension: try YAML for objects, string for primitives
      if (typeof data === 'object' && data !== null) {
        return yamlDump(data, { lineWidth: -1, noRefs: true });
      }
      return String(data);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extname(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(dot);
}

/** Convert a snake_case or camelCase key to Title Case. */
export function keyToTitleCase(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
