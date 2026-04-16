import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  deepMergeExtends,
  mergeProvides,
  mergeConstrains,
  computeMergedSchema,
  parseSchemaExtension,
} from '../../workflow-schema-merge.js';

// ── deepMergeExtends ─────────────────────────────────────────────────────────

describe('deepMergeExtends', () => {
  it('adds new properties to target', () => {
    const target: Record<string, unknown> = { type: 'object', properties: { name: { type: 'string' } } };
    deepMergeExtends(target, { properties: { age: { type: 'number' } } }, 'test.md');
    const props = target.properties as Record<string, unknown>;
    expect(props).toHaveProperty('age');
    expect(props.age).toEqual({ type: 'number' });
  });

  it('errors on duplicate property names', () => {
    const target = { type: 'object', properties: { name: { type: 'string' } } };
    expect(() => {
      deepMergeExtends(target, { properties: { name: { type: 'number' } } }, 'test.md');
    }).toThrow('already exists');
  });

  it('merges required arrays', () => {
    const target = { type: 'object', required: ['name'] };
    deepMergeExtends(target, { required: ['age'] }, 'test.md');
    expect(target.required).toEqual(['name', 'age']);
  });

  it('sets new top-level keys if not present', () => {
    const target = { type: 'object' } as Record<string, unknown>;
    deepMergeExtends(target, { description: 'Extended schema' }, 'test.md');
    expect(target.description).toBe('Extended schema');
  });

  it('recursively merges when both sides are structural schemas', () => {
    const target = {
      type: 'object',
      properties: {
        component: { type: 'object', properties: { container: { type: 'object' } } },
      },
    };
    deepMergeExtends(target, { properties: { component: { properties: { grid: { type: 'object' } } } } }, 'grid.md');
    const component = target.properties.component as Record<string, unknown>;
    const props = component.properties as Record<string, unknown>;
    expect(props).toHaveProperty('container');
    expect(props).toHaveProperty('grid');
  });

  it('merges required arrays during recursive merge', () => {
    const target = {
      type: 'object',
      properties: {
        component: { type: 'object', default: {} },
      },
    };
    deepMergeExtends(
      target,
      { properties: { component: { required: ['container'], properties: { container: { type: 'object' } } } } },
      'container.md',
    );
    deepMergeExtends(
      target,
      { properties: { component: { required: ['grid'], properties: { grid: { type: 'object' } } } } },
      'grid.md',
    );
    const component = target.properties.component as Record<string, unknown>;
    expect(component.required).toEqual(['container', 'grid']);
    const props = component.properties as Record<string, unknown>;
    expect(props).toHaveProperty('container');
    expect(props).toHaveProperty('grid');
  });

  it('still errors on duplicate leaf properties', () => {
    const target = { type: 'object', properties: { name: { type: 'string' } } };
    expect(() => {
      deepMergeExtends(target, { properties: { name: { type: 'number' } } }, 'test.md');
    }).toThrow('already exists');
  });
});

// ── mergeProvides ────────────────────────────────────────────────────────────

describe('mergeProvides', () => {
  it('sets defaults on existing properties', () => {
    const target = { type: 'object', properties: { name: { type: 'string' } } };
    mergeProvides(target, { properties: { name: { default: 'untitled' } } });
    expect(target.properties!.name).toEqual({ type: 'string', default: 'untitled' });
  });

  it('last writer wins for same property', () => {
    const target = { type: 'object', properties: { name: { type: 'string', default: 'first' } } };
    mergeProvides(target, { properties: { name: { default: 'second' } } });
    expect(target.properties!.name!.default).toBe('second');
  });

  it('creates property if not present', () => {
    const target: Record<string, unknown> = { type: 'object', properties: {} };
    mergeProvides(target, { properties: { new_field: { default: 42 } } });
    const props = target.properties as Record<string, unknown>;
    expect(props.new_field).toEqual({ default: 42 });
  });
});

// ── mergeConstrains ──────────────────────────────────────────────────────────

describe('mergeConstrains', () => {
  it('intersects enum values', () => {
    const target = { type: 'string', enum: ['a', 'b', 'c', 'd'] };
    mergeConstrains(target, { enum: ['b', 'c', 'e'] });
    expect(target.enum).toEqual(['b', 'c']);
  });

  it('sets enum if none existed', () => {
    const target = { type: 'string' } as { type: string; enum?: unknown[] };
    mergeConstrains(target, { enum: ['x', 'y'] });
    expect(target.enum).toEqual(['x', 'y']);
  });

  it('merges nested property constraints', () => {
    const target = {
      type: 'object',
      properties: {
        color: { type: 'string', enum: ['red', 'green', 'blue'] },
      },
    };
    mergeConstrains(target, {
      properties: {
        color: { enum: ['green', 'blue', 'yellow'] },
      },
    });
    expect(target.properties!.color!.enum).toEqual(['green', 'blue']);
  });

  it('sets pattern constraint', () => {
    const target = { type: 'string' } as Record<string, unknown>;
    mergeConstrains(target, { pattern: '^[A-Z]' });
    expect(target.pattern).toBe('^[A-Z]');
  });
});

// ── parseSchemaExtension ─────────────────────────────────────────────────────

describe('parseSchemaExtension', () => {
  let tmpDir: string;

  it('parses extends from frontmatter', () => {
    tmpDir = mkdtempSync(resolve(tmpdir(), 'schema-ext-'));
    const filePath = resolve(tmpDir, 'rule.md');
    writeFileSync(
      filePath,
      `---
when:
  steps: [create-tokens]
extends:
  design-tokens:
    properties:
      custom: { type: string }
---
# Rule content`,
    );

    const ext = parseSchemaExtension(filePath);
    expect(ext).not.toBeNull();
    expect(ext!.extends).toHaveProperty('design-tokens');
  });

  it('parses provides as object', () => {
    tmpDir = mkdtempSync(resolve(tmpdir(), 'schema-ext-'));
    const filePath = resolve(tmpDir, 'rule.md');
    writeFileSync(
      filePath,
      `---
when:
  steps: [create-data-model]
provides:
  data-model:
    properties:
      config: { default: {} }
---
# Rule content`,
    );

    const ext = parseSchemaExtension(filePath);
    expect(ext).not.toBeNull();
    expect(ext!.provides).toHaveProperty('data-model');
  });

  it('parses provides as string (AI signal)', () => {
    tmpDir = mkdtempSync(resolve(tmpdir(), 'schema-ext-'));
    const filePath = resolve(tmpDir, 'rule.md');
    writeFileSync(
      filePath,
      `---
provides: reference.url
when:
  steps: [design-verify:intake]
---
# Rule content`,
    );

    const ext = parseSchemaExtension(filePath);
    expect(ext).not.toBeNull();
    expect(ext!.provides).toBe('reference.url');
  });

  it('returns null for file without extensions', () => {
    tmpDir = mkdtempSync(resolve(tmpdir(), 'schema-ext-'));
    const filePath = resolve(tmpDir, 'rule.md');
    writeFileSync(
      filePath,
      `---
when:
  steps: [create-tokens]
---
# Rule content`,
    );

    const ext = parseSchemaExtension(filePath);
    expect(ext).toBeNull();
  });
});

// ── computeMergedSchema ──────────────────────────────────────────────────────

describe('computeMergedSchema', () => {
  let tmpDir: string;

  function writeRule(name: string, content: string): string {
    const path = resolve(tmpDir, `rules/${name}.md`);
    mkdirSync(resolve(tmpDir, 'rules'), { recursive: true });
    writeFileSync(path, content);
    return path;
  }

  function writeBlueprint(name: string, content: string): string {
    const path = resolve(tmpDir, `blueprints/${name}.md`);
    mkdirSync(resolve(tmpDir, 'blueprints'), { recursive: true });
    writeFileSync(path, content);
    return path;
  }

  it('returns undefined when no extensions found', () => {
    tmpDir = mkdtempSync(resolve(tmpdir(), 'merge-'));
    const rulePath = writeRule('plain', '---\nwhen:\n  steps: [create-tokens]\n---\n# No extensions');

    const result = computeMergedSchema(
      { 'design-tokens': { schema: { type: 'object', properties: { color: { type: 'string' } } } } },
      { blueprintFiles: [], ruleFiles: [rulePath], skillsRoot: tmpDir, schemas: {} },
    );
    expect(result).toBeUndefined();
  });

  it('merges extends from a rule', () => {
    tmpDir = mkdtempSync(resolve(tmpdir(), 'merge-'));
    const rulePath = writeRule(
      'extend-tokens',
      `---
when:
  steps: [create-tokens]
extends:
  design-tokens:
    properties:
      custom_group: { type: object, title: Custom Group }
---
# Rule extends tokens`,
    );

    const result = computeMergedSchema(
      { 'design-tokens': { schema: { type: 'object', properties: { primitive: { type: 'object' } } } } },
      { blueprintFiles: [], ruleFiles: [rulePath], skillsRoot: tmpDir, schemas: {} },
    );

    expect(result).toBeDefined();
    expect(result!['design-tokens']).toBeDefined();
    const merged = result!['design-tokens'] as Record<string, unknown>;
    const props = merged.properties as Record<string, unknown>;
    expect(props).toHaveProperty('primitive');
    expect(props).toHaveProperty('custom_group');
  });

  it('errors when blueprint uses constrains', () => {
    tmpDir = mkdtempSync(resolve(tmpdir(), 'merge-'));
    const bpPath = writeBlueprint(
      'bad-bp',
      `---
constrains:
  tokens:
    properties:
      color: { enum: [red] }
---
# Bad blueprint`,
    );

    expect(() =>
      computeMergedSchema(
        { tokens: { schema: { type: 'object' } } },
        {
          blueprintFiles: [bpPath],
          ruleFiles: [],
          skillsRoot: tmpDir,
          schemas: {},
        },
      ),
    ).toThrow('only rules may constrain');
  });

  it('ignores string-valued provides in rules', () => {
    tmpDir = mkdtempSync(resolve(tmpdir(), 'merge-'));
    const rulePath = writeRule(
      'signal-only',
      `---
provides: reference.url
when:
  steps: [create-tokens]
---
# AI signal only`,
    );

    const result = computeMergedSchema(
      { 'design-tokens': { schema: { type: 'object', properties: { color: { type: 'string' } } } } },
      { blueprintFiles: [], ruleFiles: [rulePath], skillsRoot: tmpDir, schemas: {} },
    );

    // String provides are ignored — no merge happened
    expect(result).toBeUndefined();
  });

  it('applies constrains from rules', () => {
    tmpDir = mkdtempSync(resolve(tmpdir(), 'merge-'));
    const rulePath = writeRule(
      'constrain-tokens',
      `---
constrains:
  design-tokens:
    properties:
      semantic:
        properties:
          spacing:
            additionalProperties:
              properties:
                renderer: { pattern: "^(margin|padding|gap)" }
---
# Constrain renderer`,
    );

    const result = computeMergedSchema(
      {
        'design-tokens': {
          schema: {
            type: 'object',
            properties: {
              semantic: { type: 'object' },
            },
          },
        },
      },
      { blueprintFiles: [], ruleFiles: [rulePath], skillsRoot: tmpDir, schemas: {} },
    );

    expect(result).toBeDefined();
    const merged = result!['design-tokens'] as Record<string, unknown>;
    const props = merged.properties as Record<string, Record<string, unknown>>;
    expect(props.semantic!.properties).toBeDefined();
  });

  it('follows merge order: bp extends → rule extends → bp provides → rule provides → rule constrains', () => {
    tmpDir = mkdtempSync(resolve(tmpdir(), 'merge-'));
    const bpPath = writeBlueprint(
      'bp',
      `---
extends:
  tokens:
    properties:
      bp_field: { type: string }
provides:
  tokens:
    properties:
      color: { default: blue }
---
# Blueprint`,
    );
    const rulePath = writeRule(
      'rule',
      `---
extends:
  tokens:
    properties:
      rule_field: { type: number }
provides:
  tokens:
    properties:
      color: { default: green }
constrains:
  tokens:
    properties:
      color: { enum: [green, red] }
---
# Rule`,
    );

    const result = computeMergedSchema(
      { tokens: { schema: { type: 'object', properties: { color: { type: 'string' } } } } },
      { blueprintFiles: [bpPath], ruleFiles: [rulePath], skillsRoot: tmpDir, schemas: {} },
    );

    expect(result).toBeDefined();
    const merged = result!.tokens as Record<string, unknown>;
    const props = merged.properties as Record<string, Record<string, unknown>>;
    // Both extends applied
    expect(props.bp_field).toBeDefined();
    expect(props.rule_field).toBeDefined();
    // Rule provides wins (last writer)
    expect(props.color!.default).toBe('green');
    // Constrains applied
    expect(props.color!.enum).toEqual(['green', 'red']);
  });
});
