# Task Schema JSON Schema Compliance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `params:` and `result:` as proper JSON Schema objects with `type: object`, `required:`, and `properties:`.

**Architecture:** Breaking change to task frontmatter format. Update TypeScript interfaces and resolver functions (TDD), then migrate all 30 task files, then update skill-creator documentation. `reads:` stays unchanged — separate follow-up.

**Tech Stack:** TypeScript, Vitest, YAML frontmatter in Markdown files

**Spec:** `docs/superpowers/specs/2026-04-16-task-schema-json-schema-compliance-design.md`

---

### Task 1: Update TypeScript interfaces

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts:54-78`

- [ ] **Step 1: Update `TaskFileFrontmatter` interface**

```typescript
interface TaskFileFrontmatter {
  when?: Record<string, unknown>;
  params?: {
    type?: string; // always 'object'
    required?: string[];
    properties?: Record<string, unknown>;
    $ref?: string;
    [key: string]: unknown;
  };
  files?: TaskFileDeclaration[];
  result?: {
    type?: string; // always 'object'
    required?: string[];
    properties?: Record<string, ResultDeclaration>;
    [key: string]: unknown;
  };
  each?: Record<string, unknown>;
  reads?: Array<{ path: string; workflow?: string; optional?: boolean }>;
}
```

Key changes:
- `params` — from `Record<string, unknown>` to structured object with `properties`, `required`, `$ref`
- `result` — from `Record<string, ResultDeclaration>` to structured object with `properties`, `required`
- `reads` — unchanged

- [ ] **Step 2: Run typecheck**

Run: `cd packages/storybook-addon-designbook && npx tsc --noEmit 2>&1 | head -60`

Expected: Type errors in functions that access `params` and `result` directly — these are the sites we need to update.

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-resolve.ts
git commit -m "refactor: update TaskFileFrontmatter interfaces for JSON Schema compliance"
```

---

### Task 2: Update params validation functions (TDD)

**Files:**
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts`
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts`

- [ ] **Step 1: Update `resolveParamsRef()` tests for new format**

Replace the existing `resolveParamsRef` test block. The new behavior merges full schema objects (`properties` maps merge, `required` arrays concatenate) instead of extracting `properties` from the target:

```typescript
describe('resolveParamsRef', () => {
  it('merges $ref schema with explicit properties and required', () => {
    // Target schema in schemas.yml is already a full object schema:
    // Check: { type: object, required: [story_id], properties: { story_id: { type: string }, breakpoint: { type: string } } }
    const params = {
      type: 'object',
      $ref: '../schemas.yml#/Check',
      required: ['scene_id'],
      properties: {
        scene_id: { type: 'string' },
      },
    };
    const resolved = resolveParamsRef(params, taskFilePath, skillsRoot);
    // properties merged: Check.properties + explicit
    expect(resolved.properties).toEqual({
      story_id: { type: 'string' },
      breakpoint: { type: 'string' },
      scene_id: { type: 'string' },
    });
    // required arrays concatenated
    expect(resolved.required).toEqual(['story_id', 'scene_id']);
  });

  it('explicit properties override $ref properties', () => {
    const params = {
      type: 'object',
      $ref: '../schemas.yml#/Check',
      properties: {
        breakpoint: { type: 'string', default: '1024' },
      },
    };
    const resolved = resolveParamsRef(params, taskFilePath, skillsRoot);
    expect((resolved.properties as any).breakpoint).toEqual({ type: 'string', default: '1024' });
  });

  it('throws if $ref target has no properties', () => {
    expect(() =>
      resolveParamsRef(
        { type: 'object', $ref: '../schemas.yml#/BareType' },
        taskFilePath,
        skillsRoot,
      ),
    ).toThrow(/without 'properties'/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/storybook-addon-designbook && npx vitest run --reporter=verbose -- resolveParamsRef 2>&1 | tail -20`

Expected: FAIL — `resolveParamsRef` still expects old flat format.

- [ ] **Step 3: Update `resolveParamsRef()` implementation**

```typescript
export function resolveParamsRef(
  params: Record<string, unknown>,
  taskFilePath: string,
  skillsRoot: string,
): Record<string, unknown> {
  const ref = params['$ref'] as string;
  const { schema } = resolveSchemaRef(ref, taskFilePath, skillsRoot);

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/storybook-addon-designbook && npx vitest run --reporter=verbose -- resolveParamsRef 2>&1 | tail -20`

Expected: PASS

- [ ] **Step 5: Update `validateParamFormats()` for new structure**

The function now receives the full params object. It needs to iterate `params.properties` instead of the flat map:

```typescript
export function validateParamFormats(params: Record<string, unknown>, taskFile: string): void {
  const properties = params.properties as Record<string, unknown> | undefined;
  if (!properties) return; // No properties declared — nothing to validate

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

- [ ] **Step 6: Update `validateParamFormats` tests**

Update existing tests to pass params in the new `{ properties: { ... } }` structure:

```typescript
describe('validateParamFormats', () => {
  it('accepts params with valid JSON Schema properties', () => {
    expect(() =>
      validateParamFormats(
        { type: 'object', properties: { a: { type: 'string' }, b: { type: 'array', default: [] } } },
        'test.md',
      ),
    ).not.toThrow();
  });

  it('throws on non-JSON-Schema property', () => {
    expect(() =>
      validateParamFormats(
        { type: 'object', properties: { bad: null } },
        'test.md',
      ),
    ).toThrow(/Invalid param "bad"/);
  });

  it('accepts params with no properties', () => {
    expect(() =>
      validateParamFormats({ type: 'object' }, 'test.md'),
    ).not.toThrow();
  });
});
```

- [ ] **Step 7: Update `validateAndMergeParams()` for required array**

```typescript
export function validateAndMergeParams(
  itemParams: Record<string, unknown>,
  schemaParams: Record<string, unknown>,
  step: string,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...itemParams };
  const properties = (schemaParams.properties ?? {}) as Record<string, unknown>;
  const requiredKeys = new Set((schemaParams.required ?? []) as string[]);

  const missing: string[] = [];
  for (const [key, value] of Object.entries(properties)) {
    if (merged[key] !== undefined) continue;

    if (isJsonSchemaParam(value)) {
      const def = extractParamDefault(value);
      if (def.hasDefault) {
        merged[key] = def.default;
      } else if (requiredKeys.has(key)) {
        missing.push(key);
      }
      // Not required and no default → skip (optional, caller didn't provide)
    } else if (requiredKeys.has(key)) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const paramList = Object.entries(properties)
      .map(([k]) => {
        const isRequired = requiredKeys.has(k);
        return `${k} (${isRequired ? 'required' : 'optional'})`;
      })
      .join(', ');
    throw new Error(`Missing required param '${missing[0]}' for step '${step}'. Expected params: ${paramList}`);
  }

  return merged;
}
```

- [ ] **Step 8: Update `validateAndMergeParams` tests**

```typescript
describe('validateAndMergeParams', () => {
  it('merges item params with schema defaults', () => {
    const schema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        color: { type: 'string', default: 'blue' },
      },
    };
    const result = validateAndMergeParams({ name: 'foo' }, schema, 'test');
    expect(result).toEqual({ name: 'foo', color: 'blue' });
  });

  it('throws on missing required param', () => {
    const schema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
      },
    };
    expect(() => validateAndMergeParams({}, schema, 'test')).toThrow(/Missing required param 'name'/);
  });

  it('skips optional params without default when not provided', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    const result = validateAndMergeParams({}, schema, 'test');
    expect(result).toEqual({});
  });

  it('item params override schema defaults', () => {
    const schema = {
      type: 'object',
      properties: {
        color: { type: 'string', default: 'blue' },
      },
    };
    const result = validateAndMergeParams({ color: 'red' }, schema, 'test');
    expect(result).toEqual({ color: 'red' });
  });
});
```

- [ ] **Step 9: Run all params tests**

Run: `cd packages/storybook-addon-designbook && npx vitest run --reporter=verbose -- workflow-resolve 2>&1 | tail -30`

Expected: Params-related tests PASS. Other tests may fail (result changes pending).

- [ ] **Step 10: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-resolve.ts packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts
git commit -m "feat: update params validation for JSON Schema object format (TDD)"
```

---

### Task 3: Update result expansion (TDD)

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts:1030-1089`
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts`

- [ ] **Step 1: Update `expandResultDeclarations()` to read from `properties`**

```typescript
export function expandResultDeclarations(
  resultDecl: Record<string, unknown> | undefined,
  filesDecl: TaskFileDeclaration[] | undefined,
  params: Record<string, unknown>,
  envMap: Record<string, string>,
  validatorKeys?: Set<string>,
  lenient?: boolean,
): Record<string, { path?: string; schema?: object; validators?: string[] }> | undefined {
  if (resultDecl) {
    const properties = (resultDecl as Record<string, unknown>).properties as
      | Record<string, ResultDeclaration>
      | undefined;
    if (!properties) return undefined;

    const result: Record<string, { path?: string; schema?: object; validators?: string[] }> = {};
    for (const [key, decl] of Object.entries(properties)) {
      const validators = decl.validators ?? [];
      if (validatorKeys) {
        for (const v of validators) {
          if (v.startsWith('cmd:')) continue;
          if (!validatorKeys.has(v)) {
            throw new Error(
              `Unknown validator key '${v}' in result '${key}'. Available: ${[...validatorKeys].join(', ')}`,
            );
          }
        }
      }

      let schema: object | undefined;
      const { path: _path, validators: _validators, $ref: _ref, ...schemaProps } = decl;
      if (Object.keys(schemaProps).length > 0) {
        schema = schemaProps as object;
      }

      const entry: { path?: string; schema?: object; validators?: string[] } = {};
      if (decl.path) {
        entry.path = expandFilePath(decl.path, params, envMap, lenient);
      }
      if (schema) entry.schema = schema;
      if (validators.length > 0) entry.validators = validators;

      result[key] = entry;
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }

  if (filesDecl && filesDecl.length > 0) {
    const result: Record<string, { path?: string; schema?: object; validators?: string[] }> = {};
    const expanded = expandFileDeclarations(filesDecl, params, envMap, validatorKeys);
    for (const f of expanded) {
      result[f.key] = {
        path: f.path,
        ...(f.validators.length > 0 && { validators: f.validators }),
      };
    }
    return result;
  }

  return undefined;
}
```

- [ ] **Step 2: Run tests**

Run: `cd packages/storybook-addon-designbook && npx vitest run --reporter=verbose -- workflow-resolve 2>&1 | tail -30`

Expected: Some result-related tests may fail — they still pass old-format result objects. These are fixed in Task 5.

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-resolve.ts
git commit -m "feat: update expandResultDeclarations for JSON Schema object format"
```

---

### Task 4: Migrate all 30 task files

**Files:**
- Modify: All `.md` files under `.agents/skills/designbook/*/tasks/`

The migration follows a mechanical pattern for each file. `reads:` stays unchanged.

**params migration:**
1. Wrap existing params in `properties:`
2. Add `type: object`
3. Add `required: [...]` for params that have no `default`

**result migration:**
1. Wrap existing result entries in `properties:`
2. Add `type: object`
3. Add `required: [...]` for all result keys (default: all required, unless semantically optional like `issues`)

**Example — create-data-model.md:**

Before:
```yaml
reads:
  - path: $DESIGNBOOK_DATA/data-model.yml
    optional: true
params:
  reference_dir: { type: string, default: "" }
result:
  data-model:
    path: $DESIGNBOOK_DATA/data-model.yml
    type: object
    required: [content]
    properties:
      content: { type: object, title: Content Entities }
      config: { type: object, title: Config Entities, default: {} }
```

After:
```yaml
reads:
  - path: $DESIGNBOOK_DATA/data-model.yml
    optional: true
params:
  type: object
  properties:
    reference_dir: { type: string, default: "" }
result:
  type: object
  required: [data-model]
  properties:
    data-model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
      required: [content]
      properties:
        content: { type: object, title: Content Entities }
        config: { type: object, title: Config Entities, default: {} }
```

- [ ] **Step 1: Migrate vision concern (1 file)**

File: `.agents/skills/designbook/vision/tasks/create-vision.md`

- [ ] **Step 2: Migrate data-model concern (1 file)**

File: `.agents/skills/designbook/data-model/tasks/create-data-model.md`

- [ ] **Step 3: Migrate tokens concern (1 file)**

File: `.agents/skills/designbook/tokens/tasks/create-tokens.md`

- [ ] **Step 4: Migrate sections concern (2 files)**

Files:
- `.agents/skills/designbook/sections/tasks/intake--sections.md`
- `.agents/skills/designbook/sections/tasks/create-section.md`

- [ ] **Step 5: Migrate design concern — intake tasks (5 files)**

Files:
- `.agents/skills/designbook/design/tasks/intake--design-component.md`
- `.agents/skills/designbook/design/tasks/intake--design-shell.md`
- `.agents/skills/designbook/design/tasks/intake--design-screen.md`
- `.agents/skills/designbook/design/tasks/intake--design-verify.md`
- `.agents/skills/designbook/design/tasks/extract-reference.md`

- [ ] **Step 6: Migrate design concern — scene tasks (2 files)**

Files:
- `.agents/skills/designbook/design/tasks/create-scene.md`
- `.agents/skills/designbook/design/tasks/configure-meta.md`

- [ ] **Step 7: Migrate design concern — verify/compare tasks (5 files)**

Files:
- `.agents/skills/designbook/design/tasks/setup-compare.md`
- `.agents/skills/designbook/design/tasks/compare-screenshots.md`
- `.agents/skills/designbook/design/tasks/capture-reference.md`
- `.agents/skills/designbook/design/tasks/capture-storybook.md`
- `.agents/skills/designbook/design/tasks/verify.md`

- [ ] **Step 8: Migrate design concern — triage/polish/outtake tasks (4 files)**

Files:
- `.agents/skills/designbook/design/tasks/triage.md`
- `.agents/skills/designbook/design/tasks/polish.md`
- `.agents/skills/designbook/design/tasks/outtake--design-verify.md`
- `.agents/skills/designbook/design/tasks/outtake--design.md`

- [ ] **Step 9: Migrate design concern — entity mapping (1 file)**

File: `.agents/skills/designbook/design/tasks/map-entity--design-screen.md`

- [ ] **Step 10: Migrate css-generate concern (4 files)**

Files:
- `.agents/skills/designbook/css-generate/tasks/intake--css-generate.md`
- `.agents/skills/designbook/css-generate/tasks/generate-jsonata.md`
- `.agents/skills/designbook/css-generate/tasks/generate-css.md`
- `.agents/skills/designbook/css-generate/tasks/generate-index.md`

- [ ] **Step 11: Migrate css-generate/fonts (1 file)**

File: `.agents/skills/designbook/css-generate/fonts/google/tasks/prepare-fonts.md`

- [ ] **Step 12: Migrate import concern (2 files)**

Files:
- `.agents/skills/designbook/import/tasks/intake--import.md`
- `.agents/skills/designbook/import/tasks/run-workflow.md`

- [ ] **Step 13: Migrate sample-data concern (1 file)**

File: `.agents/skills/designbook/sample-data/tasks/create-sample-data.md`

- [ ] **Step 14: Commit all migrated task files**

```bash
git add .agents/skills/designbook/
git commit -m "refactor: migrate all task files to JSON Schema object format

params: and result: wrapped in type/required/properties."
```

---

### Task 5: Update test fixtures to new format

**Files:**
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts`

- [ ] **Step 1: Find all test fixtures that use old params/result format**

Search the test file for `params:` and `result:` in test fixtures. Update each to the new `{ type: 'object', properties: { ... }, required: [...] }` structure.

Run: `grep -n 'params:' packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts | head -30`

- [ ] **Step 2: Update params fixtures in tests**

Every test that creates a params object like `{ scene_id: { type: 'string' } }` must wrap in `{ type: 'object', properties: { scene_id: { type: 'string' } } }`.

- [ ] **Step 3: Update result fixtures in tests**

Every test that creates a result object like `{ 'scene-file': { path: '...', validators: [...] } }` must wrap in `{ type: 'object', properties: { 'scene-file': { path: '...', validators: [...] } } }`.

- [ ] **Step 4: Run full test suite**

Run: `cd packages/storybook-addon-designbook && npx vitest run --reporter=verbose 2>&1 | tail -40`

Expected: ALL tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts
git commit -m "test: update all test fixtures to new JSON Schema object format"
```

---

### Task 6: Run full quality check

**Files:** None (verification only)

- [ ] **Step 1: Run pnpm check**

Run: `pnpm check`

Expected: typecheck → lint → test all pass.

- [ ] **Step 2: Fix any lint issues**

Run: `pnpm --filter storybook-addon-designbook lint:fix`

- [ ] **Step 3: Commit fixes if any**

```bash
git add -u
git commit -m "fix: lint and type fixes after schema migration"
```

---

### Task 7: Update skill-creator documentation

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/resources/schemas.md`
- Modify: `.agents/skills/designbook-skill-creator/resources/schema-composition.md`
- Modify: `.agents/skills/designbook-skill-creator/rules/principles.md`
- Modify: `.agents/skills/designbook-skill-creator/rules/structure.md`
- Modify: `.agents/skills/designbook-skill-creator/resources/validate.md`

- [ ] **Step 1: Update `schemas.md` — params section**

Replace the `params:` documentation section. The new format:

```yaml
params:
  type: object
  required: [scene_id]
  properties:
    scene_id: { type: string }
    reference_dir: { type: string, default: "" }
```

Update the `$ref` in params section:

```yaml
params:
  $ref: ../schemas.yml#/Check
  required: [scene_id]
  properties:
    scene_id: { type: string }
```

- [ ] **Step 2: Update `schemas.md` — result section**

Replace the `result:` documentation section with the new format:

```yaml
result:
  type: object
  required: [design-tokens]
  properties:
    design-tokens:
      path: $DESIGNBOOK_DATA/design-tokens.yml
      type: object
      required: [primitive, semantic]
      properties:
        primitive: { type: object }
        semantic: { type: object }
```

- [ ] **Step 3: Update `schema-composition.md` examples**

Update the "Full Merge" example to show the new result format with `type: object`, `required:`, `properties:` wrapper.

- [ ] **Step 4: Update `principles.md`**

Update the "Tasks Say WHAT" example (lines 13-21) to show new format:

```yaml
params:
  type: object
  required: [component]
  properties:
    component: { type: string }
result:
  type: object
  required: [component-yml]
  properties:
    component-yml:
      path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
      validators: [data]
```

Update "Results Declare Schema" section (lines 37-56) with new format examples.

Update "Stages Flush After Completion" section (lines 190-207) — example still uses `reads:` (unchanged) but update `result:` format.

- [ ] **Step 5: Update `structure.md`**

Verify no inline examples use old params/result format. Update if found.

- [ ] **Step 6: Update `validate.md`**

Update check `E02` description to reflect that tasks with outputs need `result:` with `properties:`.

- [ ] **Step 7: Commit documentation changes**

```bash
git add .agents/skills/designbook-skill-creator/
git commit -m "docs(skill-creator): update all references to new JSON Schema task format

params/result use type/required/properties wrappers."
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full quality check**

Run: `pnpm check`

Expected: All checks pass.

- [ ] **Step 2: Verify all task files have new format**

Run: `grep -rn '^params:' .agents/skills/designbook/*/tasks/*.md .agents/skills/designbook/*/*/tasks/*.md 2>/dev/null`

For each match, the next non-empty line should be `  type: object` — NOT a direct attribute like `  scene_id:`.

- [ ] **Step 3: Verify all result blocks have new format**

Run: `grep -rn '^result:' .agents/skills/designbook/*/tasks/*.md .agents/skills/designbook/*/*/tasks/*.md 2>/dev/null`

For each match, the next non-empty line should be `  type: object` — NOT a direct result key.
