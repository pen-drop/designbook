# Params Content Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the workflow engine resolve file-input params at instruction time — expand paths, check existence, read content, resolve schemas — so task body text never references filenames.

**Architecture:** New `buildSchemaBlock()` function in `workflow-resolve.ts` builds a unified `schema` object with `definitions`, `params`, and `result` sections. This replaces the current `merged_schema` field and is wired into both `workflow create` (via `step_resolved`) and `workflow instructions` (via `stage_loaded`). Schema composition retargets from `merged_schema` to `schema.definitions`. All ~25 task files are migrated to use wrapper format params, with body text cleanup.

**Tech Stack:** TypeScript, Vitest, YAML (js-yaml), Node.js fs

---

### Task 1: `buildSchemaBlock()` — Pure Function + Tests

**Files:**
- Create: `packages/storybook-addon-designbook/src/schema-block.ts`
- Create: `packages/storybook-addon-designbook/src/validators/__tests__/schema-block.test.ts`

This is the core new function. It takes a task's params and result declarations, resolves `$ref` values, reads file contents for `path:` params, and returns a unified schema block.

- [ ] **Step 1: Write the type definitions**

```typescript
// src/schema-block.ts
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { resolveSchemaRef } from './workflow-resolve.js';

export interface SchemaParamEntry {
  path?: string;
  exists?: boolean;
  content?: unknown;
  $ref?: string;
  type?: string;
  [key: string]: unknown;
}

export interface SchemaResultEntry {
  path?: string;
  $ref?: string;
  type?: string;
  [key: string]: unknown;
}

export interface SchemaBlock {
  definitions: Record<string, object>;
  params: Record<string, SchemaParamEntry>;
  result: Record<string, SchemaResultEntry>;
}
```

- [ ] **Step 2: Write the first failing test — resolves a param with `path:` on an existing YAML file**

```typescript
// src/validators/__tests__/schema-block.test.ts
import { describe, it, expect } from 'vitest';
import { buildSchemaBlock } from '../../schema-block.js';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const tmp = resolve(import.meta.dirname, 'fixtures', 'schema-block-tmp');

function setup() {
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
}

describe('buildSchemaBlock', () => {
  it('resolves param with path: on existing YAML file', () => {
    setup();
    const yamlPath = resolve(tmp, 'vision.yml');
    writeFileSync(yamlPath, 'product_name: Test\ndescription: A test product\n');

    const result = buildSchemaBlock({
      params: {
        type: 'object',
        properties: {
          vision: { path: yamlPath, type: 'object' },
        },
      },
      result: {},
      taskFilePath: resolve(tmp, 'task.md'),
      skillsRoot: tmp,
      envMap: {},
    });

    expect(result.params.vision).toEqual({
      path: yamlPath,
      exists: true,
      content: { product_name: 'Test', description: 'A test product' },
      type: 'object',
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /home/cw/projects/designbook && pnpm --filter storybook-addon-designbook exec vitest run src/validators/__tests__/schema-block.test.ts`
Expected: FAIL — `buildSchemaBlock` not found

- [ ] **Step 4: Implement `buildSchemaBlock()`**

```typescript
// src/schema-block.ts (add below the type definitions)

export interface BuildSchemaBlockInput {
  params: Record<string, unknown> | undefined;
  result: Record<string, unknown> | undefined;
  taskFilePath: string;
  skillsRoot: string;
  envMap: Record<string, string>;
}

export function buildSchemaBlock(input: BuildSchemaBlockInput): SchemaBlock {
  const definitions: Record<string, object> = {};
  const params: Record<string, SchemaParamEntry> = {};
  const result: Record<string, SchemaResultEntry> = {};

  // Process params
  const paramProps = (input.params?.properties ?? {}) as Record<string, Record<string, unknown>>;
  for (const [key, decl] of Object.entries(paramProps)) {
    const entry: SchemaParamEntry = {};

    // Copy type and other JSON Schema fields (except path, $ref, workflow)
    for (const [dk, dv] of Object.entries(decl)) {
      if (dk === 'path' || dk === '$ref' || dk === 'workflow') continue;
      entry[dk] = dv;
    }

    // Resolve path: expand env vars, check existence, read content
    if (typeof decl.path === 'string') {
      const resolved = expandEnvVars(decl.path, input.envMap);

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

    params[key] = entry;
  }

  // Process result
  const resultProps = (input.result?.properties ?? {}) as Record<string, Record<string, unknown>>;
  for (const [key, decl] of Object.entries(resultProps)) {
    const entry: SchemaResultEntry = {};

    // Copy all fields except $ref
    for (const [dk, dv] of Object.entries(decl)) {
      if (dk === '$ref') continue;
      entry[dk] = dv;
    }

    // Resolve $ref into definitions
    if (typeof decl.$ref === 'string') {
      const { typeName, schema } = resolveSchemaRef(decl.$ref, input.taskFilePath, input.skillsRoot);
      definitions[typeName] = schema;
      entry.$ref = `#/definitions/${typeName}`;
    }

    result[key] = entry;
  }

  return { definitions, params, result };
}

function expandEnvVars(template: string, envMap: Record<string, string>): string {
  let result = template;
  result = result.replace(/\$\{(\w+)\}/g, (match, varName) => envMap[varName] ?? match);
  result = result.replace(/\$([A-Z_][A-Z0-9_]*)/g, (match, varName) => envMap[varName] ?? match);
  return result;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /home/cw/projects/designbook && pnpm --filter storybook-addon-designbook exec vitest run src/validators/__tests__/schema-block.test.ts`
Expected: PASS

- [ ] **Step 6: Add remaining tests**

Add these test cases to the same test file:

```typescript
  it('returns exists: false and content: null for missing file', () => {
    const result = buildSchemaBlock({
      params: {
        type: 'object',
        properties: {
          data_model: { path: resolve(tmp, 'nonexistent.yml'), type: 'object' },
        },
      },
      result: {},
      taskFilePath: resolve(tmp, 'task.md'),
      skillsRoot: tmp,
      envMap: {},
    });

    expect(result.params.data_model).toEqual({
      path: resolve(tmp, 'nonexistent.yml'),
      exists: false,
      content: null,
      type: 'object',
    });
  });

  it('expands $ENV_VAR in path', () => {
    setup();
    const dataDir = resolve(tmp, 'designbook');
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(resolve(dataDir, 'vision.yml'), 'product_name: Env\n');

    const result = buildSchemaBlock({
      params: {
        type: 'object',
        properties: {
          vision: { path: '$DESIGNBOOK_DATA/vision.yml', type: 'object' },
        },
      },
      result: {},
      taskFilePath: resolve(tmp, 'task.md'),
      skillsRoot: tmp,
      envMap: { DESIGNBOOK_DATA: dataDir },
    });

    expect(result.params.vision!.path).toBe(resolve(dataDir, 'vision.yml'));
    expect(result.params.vision!.exists).toBe(true);
    expect(result.params.vision!.content).toEqual({ product_name: 'Env' });
  });

  it('resolves $ref into definitions for param', () => {
    setup();
    const schemaDir = resolve(tmp, 'vision');
    mkdirSync(schemaDir, { recursive: true });
    writeFileSync(resolve(schemaDir, 'schemas.yml'), 'Vision:\n  type: object\n  required: [product_name]\n  properties:\n    product_name: { type: string }\n');

    const taskFile = resolve(schemaDir, 'tasks', 'task.md');
    mkdirSync(dirname(taskFile), { recursive: true });
    writeFileSync(taskFile, '---\n---\n');

    const result = buildSchemaBlock({
      params: {
        type: 'object',
        properties: {
          vision: { path: resolve(tmp, 'vision.yml'), type: 'object', $ref: '../schemas.yml#/Vision' },
        },
      },
      result: {},
      taskFilePath: taskFile,
      skillsRoot: tmp,
      envMap: {},
    });

    expect(result.params.vision!.$ref).toBe('#/definitions/Vision');
    expect(result.definitions.Vision).toEqual({
      type: 'object',
      required: ['product_name'],
      properties: { product_name: { type: 'string' } },
    });
  });

  it('resolves $ref into definitions for result', () => {
    setup();
    const schemaDir = resolve(tmp, 'data-model');
    mkdirSync(schemaDir, { recursive: true });
    writeFileSync(resolve(schemaDir, 'schemas.yml'), 'DataModel:\n  type: object\n  required: [entities]\n  properties:\n    entities: { type: array }\n');

    const taskFile = resolve(schemaDir, 'tasks', 'task.md');
    mkdirSync(dirname(taskFile), { recursive: true });
    writeFileSync(taskFile, '---\n---\n');

    const result = buildSchemaBlock({
      params: {},
      result: {
        type: 'object',
        properties: {
          'data-model': { path: '$DESIGNBOOK_DATA/data-model.yml', $ref: '../schemas.yml#/DataModel' },
        },
      },
      taskFilePath: taskFile,
      skillsRoot: tmp,
      envMap: {},
    });

    expect(result.result['data-model']!.$ref).toBe('#/definitions/DataModel');
    expect(result.definitions.DataModel).toBeDefined();
  });

  it('deduplicates definitions when same schema used in param and result', () => {
    setup();
    const schemaDir = resolve(tmp, 'vision');
    mkdirSync(schemaDir, { recursive: true });
    writeFileSync(resolve(schemaDir, 'schemas.yml'), 'Vision:\n  type: object\n  properties:\n    name: { type: string }\n');

    const taskFile = resolve(schemaDir, 'tasks', 'task.md');
    mkdirSync(dirname(taskFile), { recursive: true });
    writeFileSync(taskFile, '---\n---\n');

    const result = buildSchemaBlock({
      params: {
        type: 'object',
        properties: {
          vision: { path: resolve(tmp, 'v.yml'), $ref: '../schemas.yml#/Vision', type: 'object' },
        },
      },
      result: {
        type: 'object',
        properties: {
          vision: { path: '$DATA/vision.yml', $ref: '../schemas.yml#/Vision' },
        },
      },
      taskFilePath: taskFile,
      skillsRoot: tmp,
      envMap: {},
    });

    expect(Object.keys(result.definitions)).toEqual(['Vision']);
    expect(result.params.vision!.$ref).toBe('#/definitions/Vision');
    expect(result.result.vision!.$ref).toBe('#/definitions/Vision');
  });

  it('handles directory params — exists check only, no content', () => {
    setup();
    const dir = resolve(tmp, 'sections');
    mkdirSync(dir, { recursive: true });

    const result = buildSchemaBlock({
      params: {
        type: 'object',
        properties: {
          sections_dir: { path: dir + '/', type: 'string' },
        },
      },
      result: {},
      taskFilePath: resolve(tmp, 'task.md'),
      skillsRoot: tmp,
      envMap: {},
    });

    expect(result.params.sections_dir!.exists).toBe(true);
    expect(result.params.sections_dir!.content).toBeUndefined();
  });

  it('passes through pattern paths without resolving', () => {
    const result = buildSchemaBlock({
      params: {
        type: 'object',
        properties: {
          section_scenes: { path: '$DATA/sections/[section-id]/[section-id].section.scenes.yml', type: 'object' },
        },
      },
      result: {},
      taskFilePath: resolve(tmp, 'task.md'),
      skillsRoot: tmp,
      envMap: { DATA: '/resolved' },
    });

    expect(result.params.section_scenes!.path).toBe('/resolved/sections/[section-id]/[section-id].section.scenes.yml');
    expect(result.params.section_scenes!.exists).toBeUndefined();
    expect(result.params.section_scenes!.content).toBeUndefined();
  });

  it('handles empty params and result', () => {
    const result = buildSchemaBlock({
      params: undefined,
      result: undefined,
      taskFilePath: resolve(tmp, 'task.md'),
      skillsRoot: tmp,
      envMap: {},
    });

    expect(result).toEqual({ definitions: {}, params: {}, result: {} });
  });

  it('handles CLI-only params (no path:) — passes through without file resolution', () => {
    const result = buildSchemaBlock({
      params: {
        type: 'object',
        properties: {
          scene_id: { type: 'string' },
          reference_dir: { type: 'string', default: '' },
        },
      },
      result: {},
      taskFilePath: resolve(tmp, 'task.md'),
      skillsRoot: tmp,
      envMap: {},
    });

    expect(result.params.scene_id).toEqual({ type: 'string' });
    expect(result.params.reference_dir).toEqual({ type: 'string', default: '' });
    expect(result.params.scene_id!.path).toBeUndefined();
    expect(result.params.scene_id!.exists).toBeUndefined();
  });
```

- [ ] **Step 7: Run all tests to verify they pass**

Run: `cd /home/cw/projects/designbook && pnpm --filter storybook-addon-designbook exec vitest run src/validators/__tests__/schema-block.test.ts`
Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add packages/storybook-addon-designbook/src/schema-block.ts packages/storybook-addon-designbook/src/validators/__tests__/schema-block.test.ts
git commit -m "feat: add buildSchemaBlock() for unified param/result schema resolution"
```

---

### Task 2: Wire `buildSchemaBlock()` into `resolveAllStages()`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts:1318-1532`
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts`

Replace `merged_schema` with the new `schema` field in `ResolvedStep` and call `buildSchemaBlock()` during step resolution.

- [ ] **Step 1: Update `ResolvedStep` interface**

In `workflow-resolve.ts`, replace the interface at line 1318:

```typescript
export interface ResolvedStep {
  task_file: string;
  rules: string[];
  blueprints: string[];
  config_rules: string[];
  config_instructions: string[];
  schema?: {
    definitions: Record<string, object>;
    params: Record<string, { path?: string; exists?: boolean; content?: unknown; $ref?: string; [key: string]: unknown }>;
    result: Record<string, { path?: string; $ref?: string; [key: string]: unknown }>;
  };
}
```

Remove the `merged_schema` field entirely.

- [ ] **Step 2: Import and call `buildSchemaBlock()` in `resolveAllStages()`**

Add import at top of `workflow-resolve.ts`:
```typescript
import { buildSchemaBlock } from './schema-block.js';
```

In `resolveAllStages()`, after the existing `computeMergedSchema()` call (around line 1454), add the `buildSchemaBlock()` call. The schema composition results need to be merged into the definitions. Replace the assembly block (lines 1464-1482):

```typescript
      // Build unified schema block
      const envMap = buildEnvMap(config);
      const schemaBlock = buildSchemaBlock({
        params: taskFmForSchema?.params as Record<string, unknown> | undefined,
        result: taskFmForSchema?.result as Record<string, unknown> | undefined,
        taskFilePath: tf.path,
        skillsRoot: resolve(agentsDir, 'skills'),
        envMap,
      });

      // Merge schema composition results into definitions
      if (mergedSchema) {
        for (const [resultKey, composedSchema] of Object.entries(mergedSchema)) {
          // Find if this result key has a $ref — if so, merge into that definition
          const resultEntry = schemaBlock.result[resultKey];
          if (resultEntry?.$ref) {
            const defName = resultEntry.$ref.replace('#/definitions/', '');
            if (schemaBlock.definitions[defName]) {
              schemaBlock.definitions[defName] = deepMergeSchema(
                schemaBlock.definitions[defName],
                composedSchema,
              );
            }
          } else {
            // No $ref — store composed schema directly in result entry
            Object.assign(resultEntry ?? {}, composedSchema);
          }
        }
      }

      const hasSchema = Object.keys(schemaBlock.definitions).length > 0
        || Object.keys(schemaBlock.params).length > 0
        || Object.keys(schemaBlock.result).length > 0;

      // Single task file
      stepResolved[step] = {
        task_file: tf.path,
        rules: ruleFiles,
        blueprints: blueprintFiles,
        config_rules: configResult.rules,
        config_instructions: configResult.instructions,
        ...(hasSchema ? { schema: schemaBlock } : {}),
      };
```

Note: `taskFmForSchema` should be the parsed frontmatter of the task file. Read it where the task file is already parsed in the loop. `deepMergeSchema` is a helper — use the existing deep merge from `workflow-schema-merge.ts` or write a thin wrapper.

- [ ] **Step 3: Update tests in `workflow-resolve.test.ts` and `workflow-result.test.ts`**

Find all assertions that check for `merged_schema` in `step_resolved` and update them to check `schema.definitions` / `schema.result` instead. This includes:
- `workflow-resolve.test.ts` — `step_resolved` assertions, `validateAndMergeParams` tests
- `workflow-result.test.ts` — result validation tests that reference `merged_schema`

Read each test file, find every `merged_schema` reference, and update to use the new `schema` structure.

- [ ] **Step 4: Run full test suite**

Run: `cd /home/cw/projects/designbook && pnpm check`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-resolve.ts packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts
git commit -m "feat: wire buildSchemaBlock into resolveAllStages, replace merged_schema with schema"
```

---

### Task 3: Wire `schema` into `stage_loaded` and `workflow instructions`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow.ts:1064-1074`
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts:247-328`

- [ ] **Step 1: Write `schema` into `stage_loaded`**

In `workflow.ts` at line 1066, add the `schema` field to the `stage_loaded` entry:

```typescript
        data.stage_loaded[stepName] = {
          task_file: loaded.task_file ?? '',
          rules: loaded.rules ?? [],
          blueprints: loaded.blueprints ?? [],
          config_rules: loaded.config_rules ?? [],
          config_instructions: loaded.config_instructions ?? [],
          ...(loaded.schema ? { schema: loaded.schema } : {}),
        };
```

- [ ] **Step 2: Update `workflow instructions` to output `schema`**

In `cli/workflow.ts`, replace the instructions command handler (lines 247-328). Key changes:
- Remove `expected_params` building from raw frontmatter (lines 300-307)
- Remove `merged_schema` extraction (line 310)
- Add `schema` from stage data

```typescript
    // Include schema if present (from buildSchemaBlock at resolution time)
    const schema = (stage as unknown as Record<string, unknown>).schema ?? undefined;

    const instructionsResult = {
      stage: opts.stage,
      task_file: taskFile,
      rules,
      blueprints,
      config_rules: stage.config_rules ?? [],
      config_instructions: stage.config_instructions ?? [],
      ...(schema ? { schema } : {}),
    };
```

Remove `expected_params` and `merged_schema` from the output entirely.

- [ ] **Step 3: Run full test suite**

Run: `cd /home/cw/projects/designbook && pnpm check`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow.ts packages/storybook-addon-designbook/src/cli/workflow.ts
git commit -m "feat: wire schema into stage_loaded and workflow instructions output"
```

---

### Task 4: Retarget Schema Composition to `schema.definitions`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-schema-merge.ts`
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts`

Schema composition (`extends:`, `provides:`, `constrains:`) currently produces a `merged_schema` map. After Task 2, the merge results are folded into `schema.definitions`. This task updates the tests to verify the new flow end-to-end.

- [ ] **Step 1: Update schema composition integration tests**

In `workflow-schema-composition.test.ts`, find the test `stores merged_schema in stage_loaded` (around line 372). Update it to assert `schema.definitions` instead:

```typescript
  it('stores schema with definitions in stage_loaded', async () => {
    // ... existing setup ...
    const step = created.stage_loaded!['create-thing'];
    const resolved = Array.isArray(step) ? step[0] : step;
    expect(resolved.schema).toBeDefined();
    expect(resolved.schema!.definitions).toBeDefined();
    // Check that composed schema extensions are in definitions
  });
```

Update all other tests that reference `merged_schema` to use the new `schema` structure.

- [ ] **Step 2: Run schema composition tests**

Run: `cd /home/cw/projects/designbook && pnpm --filter storybook-addon-designbook exec vitest run src/validators/__tests__/workflow-schema-composition.test.ts`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-schema-merge.ts packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts
git commit -m "test: retarget schema composition tests from merged_schema to schema.definitions"
```

---

### Task 5: Enforce Wrapper Format — Remove Flat Map Fallback

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts:1206-1226`
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts`

- [ ] **Step 1: Write failing test — flat map params rejected**

```typescript
  it('rejects flat map params without type: object and properties:', () => {
    expect(() =>
      validateParamFormats(
        { vision: { path: '$DATA/vision.yml', type: 'object' } } as Record<string, unknown>,
        'test.md',
      ),
    ).toThrow(/must use wrapper format/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/cw/projects/designbook && pnpm --filter storybook-addon-designbook exec vitest run src/validators/__tests__/workflow-resolve.test.ts -t "rejects flat map"`
Expected: FAIL — currently returns silently

- [ ] **Step 3: Update `validateParamFormats()` to reject missing `properties`**

```typescript
export function validateParamFormats(params: Record<string, unknown>, taskFile: string): void {
  const properties = params.properties as Record<string, unknown> | undefined;
  if (!properties) {
    // Check if this looks like a flat map (has keys that look like param names)
    const hasParamLikeKeys = Object.keys(params).some(
      (k) => k !== 'type' && k !== 'required' && k !== 'properties' && k !== '$ref',
    );
    if (hasParamLikeKeys) {
      throw new Error(
        `Params in ${taskFile} must use wrapper format: { type: object, properties: { ... } }. ` +
          `Found flat map keys: ${Object.keys(params).join(', ')}.`,
      );
    }
    return; // Empty params — OK
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
      `Invalid param "${key}" in ${taskFile}: expected JSON Schema object with "type" property, got ${got}. ` +
        `Migrate to inline JSON Schema (e.g. { type: string } or { type: array, default: [] }).`,
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/cw/projects/designbook && pnpm --filter storybook-addon-designbook exec vitest run src/validators/__tests__/workflow-resolve.test.ts -t "rejects flat map"`
Expected: PASS

- [ ] **Step 5: Run full test suite to verify no regressions**

Run: `cd /home/cw/projects/designbook && pnpm check`
Expected: All pass (existing task files already use wrapper format — except `create-vision.md` which was changed to flat map and must be reverted in Task 6)

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-resolve.ts packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts
git commit -m "fix: reject flat map params format, enforce wrapper format"
```

---

### Task 6: Migrate Task Files — Wrapper Format + Body Cleanup

**Files:**
- Modify: ~25 task files under `.agents/skills/designbook/*/tasks/` and `.agents/skills/designbook-drupal/*/tasks/`
- Modify: `.agents/skills/designbook/vision/tasks/create-vision.md` (revert flat map)

This is the bulk migration. For each task file:
1. Verify `params:` uses wrapper format (`type: object, properties: {}`)
2. Verify `result:` uses wrapper format
3. Add `$ref` to params/results that reference `schemas.yml` types where missing
4. Remove body text that references filenames already covered by params
5. Add missing static params (e.g., `design_scenes` where only in body)

- [ ] **Step 1: Revert `create-vision.md` to wrapper format**

The file was changed to flat map earlier in this conversation. Revert params and result to wrapper format:

```yaml
---
when:
  steps: [create-vision]
params:
  type: object
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      type: object
result:
  type: object
  required: [vision]
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      $ref: ../schemas.yml#/Vision
---
```

- [ ] **Step 2: Audit all task files for wrapper format compliance**

Run a search for all task files with `params:` and check format:
```bash
grep -rl "^params:" .agents/skills/designbook/*/tasks/*.md .agents/skills/designbook-drupal/*/tasks/*.md 2>/dev/null
```

For each file: read frontmatter, verify `params.type === 'object'` and `params.properties` exists. Fix any that use flat map.

- [ ] **Step 3: Clean up body text — remove filename references**

For each task file, remove lines from the markdown body that:
- Reference filenames already declared as params (e.g., "Read vision.yml")
- Describe file existence checks (e.g., "If data-model.yml exists")
- Describe output format (covered by result schema)

Keep: task purpose, step logic, user interaction instructions, runtime paths.

Specific files to clean (from the audit):
- `data-model/tasks/create-data-model.md` — remove "Read vision.yml for product context. If data-model.yml exists, extend it."
- `tokens/tasks/create-tokens.md` — remove "vision.yml" text references, keep extract.json (runtime)
- `import/tasks/intake--import.md` — remove repeated "vision.yml" references, keep step logic
- `design/tasks/extract-reference.md` — remove "vision.yml" references, keep extract.json (runtime)
- `design/tasks/compare-screenshots.md` — remove "design-tokens.yml" and "vision.yml" text refs
- `sections/tasks/intake--sections.md` — remove vision.yml text references
- `sections/tasks/create-section.md` — remove vision.yml text references

- [ ] **Step 4: Add missing static params**

Add `design_scenes` param to `intake--design-shell.md` if only referenced in body.

- [ ] **Step 5: Run full test suite**

Run: `cd /home/cw/projects/designbook && pnpm check`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/
git commit -m "refactor: migrate task files to wrapper format params, clean up body text"
```

---

### Task 7: Update `workflow-execution.md` Documentation

**Files:**
- Modify: `.agents/skills/designbook/resources/workflow-execution.md`

- [ ] **Step 1: Update Step 2a (Load Task Instructions)**

Replace the current section about loading task instructions and `merged_schema`. Add documentation for the new `schema` field:

```markdown
### 2a. Load Task Instructions

Read the `task_file` from the `step_resolved` entry for the current step. Also read any `rules` and `blueprints` listed. Alternatively use `workflow instructions`:

\`\`\`bash
_debo workflow instructions --workflow $WORKFLOW_NAME --stage <step-name>
\`\`\`

Read the `task_file` and all `rules`/`blueprints`. Rules are hard constraints — apply silently, never mention to the user.

If the response includes a `schema` field, it contains all inputs and outputs:

- `schema.definitions` — resolved schemas from `schemas.yml`, deduplicated
- `schema.params` — file inputs with `path` (resolved), `exists`, `content` (parsed YAML/JSON or null), and `$ref` to definitions
- `schema.result` — expected outputs with `path` template and `$ref` to definitions

The AI uses param content directly from the response. File names and paths are never mentioned in task body text. If a param has `exists: true`, its `content` is the parsed file. If `exists: false`, the file does not exist yet.
```

- [ ] **Step 2: Remove all `merged_schema` references**

Search for `merged_schema` in the file and remove/replace all occurrences.

- [ ] **Step 3: Update example JSON in Create Response section**

Update the `step_resolved` example to show `schema` instead of `merged_schema`.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/resources/workflow-execution.md
git commit -m "docs: update workflow-execution.md for schema-based param delivery"
```

---

### Task 8: Update Skill Creator + Add Validation Rule

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/resources/schemas.md`
- Create: `.agents/skills/designbook-skill-creator/rules/validate-params.md`

- [ ] **Step 1: Update `resources/schemas.md`**

Add a section documenting the file-input params pattern:

```markdown
### File-Input Params (with `path:`)

Params with `path:` are file inputs. The engine resolves them at instruction time:
- Expands environment variables (`$DESIGNBOOK_DATA` etc.)
- Checks file existence
- Parses file content (YAML/JSON)
- Resolves `$ref` schemas into `definitions`

The AI receives resolved content in the `schema.params` response. Task body text never references filenames.

\`\`\`yaml
params:
  type: object
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      workflow: vision
      $ref: ../schemas.yml#/Vision
      type: object
\`\`\`

Extension fields on params:

| Field | Purpose |
|-------|---------|
| `path:` | File/directory input path — engine resolves and reads |
| `workflow:` | Inter-workflow dependency tracking |
| `$ref:` | Schema reference — resolved into `schema.definitions` |
```

Remove any mention of body text referencing filenames.

- [ ] **Step 2: Create validation rule**

Create `.agents/skills/designbook-skill-creator/rules/validate-params.md`:

```markdown
---
when:
  steps: [validate]
priority: 10
---

# Validate Param Declarations

Check all task files for param/body consistency violations:

1. **Hardcoded paths in body** — Search markdown body (below frontmatter) for patterns: `$DESIGNBOOK_DATA`, `.yml` filename references, `Read ... .yml`, `If ... .yml exists`. Warn if a file reference is found that is not a runtime path (runtime paths contain `{{ }}`, `{var}`, or `$reference_dir`).

2. **Missing params** — If a file is referenced in the body but not declared in `params.properties`, report as error with suggested param declaration.

3. **Missing `$ref`** — If a result entry has `path:` but no `$ref:` to a schema, report as warning. Every file result should reference a schema.

4. **Redundant body references** — If a filename in the body matches the basename of an existing param's `path:`, report as warning. The param makes the body reference redundant.

5. **Flat map format** — If `params:` or `result:` lack `type: object` and `properties:`, report as error. Wrapper format is required.

Output findings as a numbered list with severity (error/warn) and suggested fix.
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-skill-creator/resources/schemas.md .agents/skills/designbook-skill-creator/rules/validate-params.md
git commit -m "docs: update skill-creator for param content delivery, add validation rule"
```

---

### Task 9: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full check**

```bash
cd /home/cw/projects/designbook && pnpm check
```

Expected: Typecheck passes, lint passes, all 638+ tests pass.

- [ ] **Step 2: Verify no remaining `merged_schema` references in source**

```bash
grep -r "merged_schema" packages/storybook-addon-designbook/src/ --include="*.ts" --include="*.tsx" -l
```

Expected: No files found (only allowed in test fixtures if any).

- [ ] **Step 3: Verify no remaining `vision.md` data-file references**

```bash
grep -r 'vision\.md' .agents/skills/ packages/storybook-addon-designbook/src/ --include="*.ts" --include="*.md" --include="*.yml" | grep -v 'workflows/vision.md' | grep -v 'intake--vision.md' | grep -v 'create-vision.md' | grep -v openspec/
```

Expected: No results (only workflow/task file names should remain, not data file references).

- [ ] **Step 4: Smoke test — create a vision workflow**

```bash
cd /home/cw/projects/designbook/workspaces/leando
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"
_debo workflow create --workflow vision
```

Verify that `step_resolved` contains a `schema` field with `definitions`, `params.vision` (with resolved path, exists, content), and `result.vision` (with $ref).
