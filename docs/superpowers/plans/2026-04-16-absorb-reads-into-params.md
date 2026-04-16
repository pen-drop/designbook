# Absorb `reads:` into `params:` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Absorb all `reads:` entries into `params:` as file-input properties with `path:` extension field, making the task I/O model symmetric.

**Architecture:** Each `reads:` entry becomes a `params.properties` entry with a `path:` extension field. The engine skips params with `path:` during CLI param validation. `reads:` is removed from the `TaskFileFrontmatter` interface.

**Tech Stack:** TypeScript (vitest), YAML frontmatter in Markdown skill files

**Spec:** `docs/superpowers/specs/2026-04-16-absorb-reads-into-params-design.md`

---

## Transformation Rules (Reference)

These rules apply to every task file migration. Each `reads:` entry becomes a param property:

| reads field | params property field |
|------------|----------------------|
| `path:` | `path:` (preserved as-is) |
| `workflow:` | `workflow:` (preserved as-is) |
| `optional: true` | NOT in `required:` array |
| no `optional:` | IN `required:` array |
| `description:` | `description:` (preserved as-is) |

**Param naming convention:**

| reads path | param name | type |
|------------|-----------|------|
| `$DESIGNBOOK_DATA/vision.md` | `vision` | `object` |
| `$DESIGNBOOK_DATA/design-system/design-tokens.yml` | `design_tokens` | `object` |
| `$DESIGNBOOK_DATA/data-model.yml` | `data_model` | `object` |
| `$DESIGNBOOK_DATA/sections/` or `$DESIGNBOOK_DATA/sections` | `sections_dir` | `string` |
| `$DESIGNBOOK_DIRS_COMPONENTS` | `components_dir` | `string` |
| `$DESIGNBOOK_DATA/design-system/design-system.scenes.yml` | `design_scenes` | `object` |
| `$DESIGNBOOK_DATA/sections/[section-id]/[section-id].section.scenes.yml` | `section_scenes` | `object` |

**File-input params are placed AFTER CLI params** in `properties:` for readability.

---

### Task 1: Runtime code — skip file-input params in validateAndMergeParams (TDD)

**Files:**
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts:391-437`
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts:88,1240-1277`

- [ ] **Step 1: Write failing test — file-input param with `path:` skipped during validation**

Add this test inside the existing `describe('validateAndMergeParams', ...)` block at `workflow-resolve.test.ts:437` (after the last existing test):

```typescript
  it('skips file-input params (with path:) during validation', () => {
    const schema = {
      type: 'object',
      required: ['name', 'vision'],
      properties: {
        name: { type: 'string' },
        vision: { type: 'object', path: '$DESIGNBOOK_DATA/vision.md' },
      },
    };
    // Only provide 'name' — 'vision' has path: so it should be skipped
    const result = validateAndMergeParams({ name: 'foo' }, schema, 'test');
    expect(result).toEqual({ name: 'foo' });
  });

  it('skips file-input params with path: and workflow: during validation', () => {
    const schema = {
      type: 'object',
      required: ['design_tokens'],
      properties: {
        design_tokens: { type: 'object', path: '$DESIGNBOOK_DATA/design-tokens.yml', workflow: 'tokens' },
      },
    };
    const result = validateAndMergeParams({}, schema, 'test');
    expect(result).toEqual({});
  });

  it('still validates CLI params without path:', () => {
    const schema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        vision: { type: 'object', path: '$DESIGNBOOK_DATA/vision.md' },
      },
    };
    expect(() => validateAndMergeParams({}, schema, 'test')).toThrow(/Missing required param 'name'/);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/validators/__tests__/workflow-resolve.test.ts -t "skips file-input params"`
Expected: FAIL — `validateAndMergeParams` treats `vision` as missing required param

- [ ] **Step 3: Implement — skip params with `path:` in validateAndMergeParams**

In `packages/storybook-addon-designbook/src/workflow-resolve.ts`, modify the loop in `validateAndMergeParams()` (line ~1250). Add an early-continue for file-input params:

```typescript
  for (const [key, value] of Object.entries(properties)) {
    if (merged[key] !== undefined) continue;

    // Skip file-input params — they're read from disk by the AI, not provided via CLI
    if (isJsonSchemaParam(value) && 'path' in value) continue;

    if (isJsonSchemaParam(value)) {
```

Insert the `if (isJsonSchemaParam(value) && 'path' in value) continue;` line right after the `if (merged[key] !== undefined) continue;` line and before the existing `if (isJsonSchemaParam(value))` check.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/validators/__tests__/workflow-resolve.test.ts -t "validateAndMergeParams"`
Expected: ALL PASS (both new and existing tests)

- [ ] **Step 5: Also skip file-input params in the error message's param list**

In the same function, the error message block (line ~1267) lists all params. File-input params should be excluded from this list since they're not CLI params:

```typescript
  if (missing.length > 0) {
    const paramList = Object.entries(properties)
      .filter(([, v]) => !(isJsonSchemaParam(v as Record<string, unknown>) && 'path' in (v as Record<string, unknown>)))
      .map(([k]) => {
        const isRequired = requiredKeys.has(k);
        return `${k} (${isRequired ? 'required' : 'optional'})`;
      })
      .join(', ');
```

- [ ] **Step 6: Remove `reads?` from TaskFileFrontmatter interface**

In `packages/storybook-addon-designbook/src/workflow-resolve.ts:88`, delete the line:

```typescript
  reads?: Array<{ path: string; workflow?: string; optional?: boolean }>;
```

- [ ] **Step 7: Update existing test — rename reads: reference**

In `workflow-resolve.test.ts:836`, update the test name and comments:

```typescript
  it('files: paths using remapped env differ from file-input param paths using original env', () => {
    const rootDir = '/home/user/project';
    const envMap = {
      DESIGNBOOK_WORKSPACE: rootDir,
      DESIGNBOOK_HOME: '/home/user/project/designbook',
    };
    const worktreePath = '/tmp/wt-123';
    const remappedEnvMap = buildWorktreeEnvMap(envMap, worktreePath, rootDir);

    // files: path (uses remapped env) → WORKTREE
    const fileTemplate = '$DESIGNBOOK_HOME/data-model.yml';
    const filesPath = expandFilePath(fileTemplate, {}, remappedEnvMap);
    expect(filesPath).toBe('/tmp/wt-123/designbook/data-model.yml');

    // file-input param path (uses original env) → real path
    const paramPath = expandFilePath(fileTemplate, {}, envMap);
    expect(paramPath).toBe('/home/user/project/designbook/data-model.yml');
  });
```

- [ ] **Step 8: Run full test suite**

Run: `cd packages/storybook-addon-designbook && npx vitest run`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-resolve.ts packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts
git commit -m "feat: skip file-input params (with path:) in validateAndMergeParams

File-input params declare files the AI reads from disk — they are not
CLI params. The engine now skips them during param validation and
excludes them from missing-param error messages.

Also removes reads? from TaskFileFrontmatter interface."
```

---

### Task 2: Migrate vision, data-model, tokens, sections tasks (6 files)

**Files:**
- Modify: `.agents/skills/designbook/vision/tasks/create-vision.md`
- Modify: `.agents/skills/designbook/data-model/tasks/create-data-model.md`
- Modify: `.agents/skills/designbook/tokens/tasks/create-tokens.md`
- Modify: `.agents/skills/designbook/sections/tasks/intake--sections.md`
- Modify: `.agents/skills/designbook/sections/tasks/create-section.md`
- Modify: `.agents/skills/designbook/sample-data/tasks/create-sample-data.md`

For each file: read it, apply the transformation (delete `reads:`, merge into `params:`), write back.

- [ ] **Step 1: Migrate create-vision.md**

File has `reads:` but no `params:`. Create new `params:` block. The one read is optional.

Delete `reads:` block and add before `result:`:
```yaml
params:
  type: object
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      type: object
```

(No `required:` — the read was `optional: true`)

- [ ] **Step 2: Migrate create-data-model.md**

File has `reads:` but no `params:`. The one read is optional.

Delete `reads:` block and add before `result:`:
```yaml
params:
  type: object
  properties:
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
```

- [ ] **Step 3: Migrate create-tokens.md**

File has both `reads:` and `params:`. Two reads: vision (required, workflow) and design-tokens (optional).

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  required: [reference_dir, vision]
  properties:
    reference_dir: { type: string }
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      workflow: /debo-vision
      type: object
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
```

- [ ] **Step 4: Migrate intake--sections.md**

File has `reads:` but no `params:`. Two reads: vision (required, workflow) and sections dir (optional).

Delete `reads:` block. Add before `result:`:
```yaml
params:
  type: object
  required: [vision]
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      workflow: /debo-vision
      type: object
    sections_dir:
      path: $DESIGNBOOK_DATA/sections
      type: string
```

- [ ] **Step 5: Migrate create-section.md**

File has both `reads:` and `params:`. Two reads: vision (required, workflow) and sections dir (optional).

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  required: [section_id, section_title, description, order, vision]
  properties:
    section_id: { type: string, title: Section ID }
    section_title: { type: string, title: Section Title }
    description: { type: string, title: Description }
    order: { type: integer, title: Order }
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      workflow: /debo-vision
      type: object
    sections_dir:
      path: $DESIGNBOOK_DATA/sections/
      type: string
```

- [ ] **Step 6: Migrate create-sample-data.md**

File has both `reads:` and `params:`. Three reads: data-model (required, workflow), sections dir (optional), components dir (required, with description).

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  required: [section_id, data_model, components_dir]
  properties:
    section_id: { type: string }
    entities: { type: array, default: [] }
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      workflow: /debo-data-model
      type: object
    sections_dir:
      path: $DESIGNBOOK_DATA/sections/
      type: string
    components_dir:
      path: $DESIGNBOOK_DIRS_COMPONENTS
      type: string
      description: Available components — required for canvas bundle generation (rule canvas.md)
```

- [ ] **Step 7: Run test suite**

Run: `cd packages/storybook-addon-designbook && npx vitest run`
Expected: ALL PASS (task files are declarative — no runtime impact)

- [ ] **Step 8: Commit**

```bash
git add .agents/skills/designbook/vision/tasks/create-vision.md .agents/skills/designbook/data-model/tasks/create-data-model.md .agents/skills/designbook/tokens/tasks/create-tokens.md .agents/skills/designbook/sections/tasks/intake--sections.md .agents/skills/designbook/sections/tasks/create-section.md .agents/skills/designbook/sample-data/tasks/create-sample-data.md
git commit -m "refactor: absorb reads into params — vision, data-model, tokens, sections tasks"
```

---

### Task 3: Migrate design concern tasks (13 files)

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/intake--design-shell.md`
- Modify: `.agents/skills/designbook/design/tasks/intake--design-screen.md`
- Modify: `.agents/skills/designbook/design/tasks/intake--design-component.md`
- Modify: `.agents/skills/designbook/design/tasks/intake--design-verify.md`
- Modify: `.agents/skills/designbook/design/tasks/extract-reference.md`
- Modify: `.agents/skills/designbook/design/tasks/capture-reference.md`
- Modify: `.agents/skills/designbook/design/tasks/capture-storybook.md`
- Modify: `.agents/skills/designbook/design/tasks/setup-compare.md`
- Modify: `.agents/skills/designbook/design/tasks/compare-screenshots.md`
- Modify: `.agents/skills/designbook/design/tasks/verify.md`
- Modify: `.agents/skills/designbook/design/tasks/polish.md`
- Modify: `.agents/skills/designbook/design/tasks/configure-meta.md`
- Modify: `.agents/skills/designbook/design/tasks/create-scene.md`
- Modify: `.agents/skills/designbook/design/tasks/map-entity--design-screen.md`

- [ ] **Step 1: Migrate intake--design-shell.md**

Two required reads: vision and design-tokens. Both required (no `optional:`).

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  required: [vision, design_tokens]
  properties:
    reference_dir: { type: string, default: "" }
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      type: object
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
```

- [ ] **Step 2: Migrate intake--design-screen.md**

Four reads: data-model (required), design-scenes (required), vision (required), section-scenes (required, workflow).

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  required: [data_model, design_scenes, vision, section_scenes]
  properties:
    reference_dir: { type: string, default: "" }
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
    design_scenes:
      path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
      type: object
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      type: object
    section_scenes:
      path: $DESIGNBOOK_DATA/sections/[section-id]/[section-id].section.scenes.yml
      workflow: debo-shape-section
      type: object
```

- [ ] **Step 3: Migrate intake--design-component.md**

Empty reads (`reads: []`). Just delete the `reads: []` line. No params changes.

- [ ] **Step 4: Migrate intake--design-verify.md**

Empty reads (`reads: []`). Just delete the `reads: []` line. No params changes.

- [ ] **Step 5: Migrate extract-reference.md**

One required read: vision.

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  required: [vision]
  properties:
    story_id: { type: string, default: "" }
    reference_folder: { type: string, default: "" }
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      type: object
```

- [ ] **Step 6: Migrate capture-reference.md**

One optional read: design-tokens.

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  $ref: ../schemas.yml#/Check
  required: [scene_id, reference_folder, breakpoints]
  properties:
    scene_id: { type: string }
    reference_folder: { type: string }
    breakpoints: { type: string }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
```

- [ ] **Step 7: Migrate capture-storybook.md**

One optional read: design-tokens.

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  required: [scene_id, story_id, breakpoint, region]
  properties:
    scene_id: { type: string }
    story_id: { type: string }
    breakpoint: { type: string }
    region: { type: string }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
```

- [ ] **Step 8: Migrate setup-compare.md**

One optional read: design-tokens.

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  required: [story_id, breakpoints]
  properties:
    story_id: { type: string }
    reference: { type: array, default: [] }
    breakpoints: { type: array }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
```

- [ ] **Step 9: Migrate compare-screenshots.md**

One optional read: design-tokens.

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  $ref: ../schemas.yml#/Check
  required: [scene_id, reference_folder]
  properties:
    scene_id: { type: string }
    reference_folder: { type: string }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
```

- [ ] **Step 10: Migrate verify.md**

One optional read: design-tokens.

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  required: [scene_id, story_id, breakpoint, region, reference_folder]
  properties:
    scene_id: { type: string }
    story_id: { type: string }
    breakpoint: { type: string }
    region: { type: string }
    reference_folder: { type: string }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
```

- [ ] **Step 11: Migrate polish.md**

One optional read: design-tokens.

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  $ref: ../schemas.yml#/Issue
  properties:
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
```

(Note: polish.md has `$ref` in params but no explicit `required:` or `properties:`. Add `properties:` for the file-input param.)

- [ ] **Step 12: Migrate configure-meta.md**

One optional read: design-tokens.

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  required: [story_id]
  properties:
    story_id: { type: string }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
```

- [ ] **Step 13: Migrate create-scene.md**

Three reads: components dir (required, with description), design-scenes (optional), data-model (optional).

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  required: [output_path, scene_id, section_id, section_title, components_dir]
  properties:
    output_path: { type: string }
    scene_id: { type: string }
    section_id: { type: string }
    section_title: { type: string }
    reference: { type: array, default: [] }
    reference_dir: { type: string, default: "" }
    components_dir:
      path: $DESIGNBOOK_DIRS_COMPONENTS
      type: string
      description: Components -- location resolved by the active framework skill
    design_scenes:
      path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
      type: object
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
```

- [ ] **Step 14: Migrate map-entity--design-screen.md**

One required read: data-model (with workflow).

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  $ref: ../schemas.yml#/EntityMapping
  required: [data_model]
  properties:
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      workflow: debo-data-model
      type: object
```

(Note: existing params has `$ref` only. Add `required:` and `properties:` alongside.)

- [ ] **Step 15: Run test suite**

Run: `cd packages/storybook-addon-designbook && npx vitest run`
Expected: ALL PASS

- [ ] **Step 16: Commit**

```bash
git add .agents/skills/designbook/design/tasks/
git commit -m "refactor: absorb reads into params — design concern tasks (13 files)"
```

---

### Task 4: Migrate css-generate, import tasks (5 files)

**Files:**
- Modify: `.agents/skills/designbook/css-generate/tasks/generate-jsonata.md`
- Modify: `.agents/skills/designbook/css-generate/fonts/google/tasks/prepare-fonts.md`
- Modify: `.agents/skills/designbook/css-generate/tasks/intake--css-generate.md`
- Modify: `.agents/skills/designbook/css-generate/tasks/generate-css.md`
- Modify: `.agents/skills/designbook/import/tasks/intake--import.md`

- [ ] **Step 1: Migrate generate-jsonata.md**

One required read: design-tokens (with workflow).

Delete `reads:` block. Update `params:` to:
```yaml
params:
  type: object
  required: [group, design_tokens]
  properties:
    group: { type: string }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      workflow: tokens
      type: object
```

- [ ] **Step 2: Migrate prepare-fonts.md**

No existing `params:`. One required read: design-tokens (with workflow).

Delete `reads:` block. Add before `result:`:
```yaml
params:
  type: object
  required: [design_tokens]
  properties:
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      workflow: tokens
      type: object
```

- [ ] **Step 3: Migrate intake--css-generate.md**

No existing `params:`, no `result:`. One required read: design-tokens.

Delete `reads:` block. Add after `domain:`:
```yaml
params:
  type: object
  required: [design_tokens]
  properties:
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
```

- [ ] **Step 4: Migrate generate-css.md**

No existing `params:`, no `result:`. One required read: design-tokens (with workflow).

Delete `reads:` block. Add after `domain:`:
```yaml
params:
  type: object
  required: [design_tokens]
  properties:
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      workflow: tokens
      type: object
```

- [ ] **Step 5: Migrate intake--import.md**

No existing `params:`. One required read: vision (with workflow).

Delete `reads:` block. Add before `result:`:
```yaml
params:
  type: object
  required: [vision]
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      workflow: vision
      type: object
```

- [ ] **Step 6: Run test suite**

Run: `cd packages/storybook-addon-designbook && npx vitest run`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add .agents/skills/designbook/css-generate/ .agents/skills/designbook/import/
git commit -m "refactor: absorb reads into params — css-generate and import tasks"
```

---

### Task 5: Migrate drupal integration task (1 file)

**Files:**
- Modify: `.agents/skills/designbook-drupal/components/tasks/create-component.md`

This file uses the old flat format for `params:` and `result:` (not migrated in Change 1 since it's an integration skill). The `params:` must be migrated to JSON Schema format first, then the read is absorbed.

- [ ] **Step 1: Read and migrate create-component.md**

Current frontmatter:
```yaml
params:
  $ref: designbook/design/schemas.yml#/Component
  props: { type: array, default: [] }
  variants: { type: array, default: [] }
result:
  component-yml:
    path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.component.yml
    $ref: designbook-drupal/components/schemas.yml#/ComponentYml
  component-twig:
    path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.twig
  component-story:
    path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.default.story.yml
    $ref: designbook-drupal/components/schemas.yml#/StoryYml
  app-css:
    path: ${DESIGNBOOK_CSS_APP}
each:
  component:
    $ref: designbook/design/schemas.yml#/Component
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    workflow: debo-design-tokens
```

Replace with:
```yaml
params:
  type: object
  $ref: designbook/design/schemas.yml#/Component
  properties:
    props: { type: array, default: [] }
    variants: { type: array, default: [] }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      workflow: debo-design-tokens
      type: object
result:
  type: object
  required: [component-yml, component-twig, component-story, app-css]
  properties:
    component-yml:
      path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.component.yml
      $ref: designbook-drupal/components/schemas.yml#/ComponentYml
    component-twig:
      path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.twig
    component-story:
      path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.default.story.yml
      $ref: designbook-drupal/components/schemas.yml#/StoryYml
    app-css:
      path: ${DESIGNBOOK_CSS_APP}
each:
  component:
    $ref: designbook/design/schemas.yml#/Component
```

Note: `reads:` is deleted. `params:` and `result:` are migrated to JSON Schema format (Change 1 was not applied to integration skills). The `design_tokens` read is required (no `optional:` flag) but not added to a `required:` array — it's resolved via `$ref` merge which doesn't have explicit required.

- [ ] **Step 2: Run test suite**

Run: `cd packages/storybook-addon-designbook && npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-drupal/components/tasks/create-component.md
git commit -m "refactor: absorb reads into params + JSON Schema format — drupal create-component"
```

---

### Task 6: Update skill-creator documentation (3 files)

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/resources/schemas.md`
- Modify: `.agents/skills/designbook-skill-creator/rules/principles.md`
- Modify: `.agents/skills/designbook-skill-creator/resources/research.md`

- [ ] **Step 1: Update schemas.md — add File-Input Params section**

In `.agents/skills/designbook-skill-creator/resources/schemas.md`, add a new section after the `$ref in params:` section (after line ~87) and before `## result: Declarations`:

```markdown
## File-Input Params (with `path:`)

Tasks declare file inputs as params with a `path:` extension field. These are read from disk by the AI agent, not provided via CLI.

```yaml
params:
  type: object
  required: [reference_dir, vision]
  properties:
    reference_dir: { type: string }
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      workflow: /debo-vision
      type: object
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
```

Two param classes, distinguished by `path:`:

| | CLI Params | File-Input Params |
|---|---|---|
| `path:` | absent | present |
| Source | `--params` / engine | AI reads from disk |
| Required | in `required:` = must be provided | in `required:` = file must exist |
| Optional | not in `required:`, has `default:` | not in `required:` = file may not exist |

### Extension Fields on Params

| Field | Purpose |
|-------|---------|
| `path:` | File/directory input path |
| `workflow:` | Inter-workflow dependency tracking |
| `description:` | Semantic description for AI |

### Directory Inputs

Use `type: string` for directory paths:

```yaml
components_dir:
  path: $DESIGNBOOK_DIRS_COMPONENTS
  type: string
  description: Available components — location resolved by the active framework skill
```

### Pattern Paths

Paths with placeholders stay as-is — the AI resolves the concrete path from context:

```yaml
section_scenes:
  path: $DESIGNBOOK_DATA/sections/[section-id]/[section-id].section.scenes.yml
  workflow: debo-shape-section
  type: object
```
```

- [ ] **Step 2: Update principles.md — Stages Flush After Completion**

In `.agents/skills/designbook-skill-creator/rules/principles.md`, find the "Stages Flush After Completion" section (line ~205). Update the text and example:

Replace:
```markdown
Consequence: a task file must declare the **final flushed paths** in `result:`, not temporary names. If stage B needs to read a file produced by stage A, it references the flushed name via `reads:`.

```markdown
# Stage A task — produces flushed output
result:
  type: object
  required: [component-yml]
  properties:
    component-yml:
      path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml

# Stage B task — reads the flushed output from stage A
reads:
  - path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
```
```

With:
```markdown
Consequence: a task file must declare the **final flushed paths** in `result:`, not temporary names. If stage B needs to read a file produced by stage A, it references the flushed name as a file-input param (with `path:` extension field).

```markdown
# Stage A task — produces flushed output
result:
  type: object
  required: [component-yml]
  properties:
    component-yml:
      path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml

# Stage B task — declares file-input param for flushed output
params:
  type: object
  required: [component_yml]
  properties:
    component_yml:
      path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
      type: object
```
```

- [ ] **Step 3: Update principles.md line 10 — remove reads: reference**

In `principles.md:10`, replace:
```markdown
Task files declare **what outputs to produce** — file paths, required params, prerequisite reads. They never contain style guidelines, implementation instructions, or format prescriptions.
```
With:
```markdown
Task files declare **what outputs to produce** — file paths, required params, file-input dependencies. They never contain style guidelines, implementation instructions, or format prescriptions.
```

- [ ] **Step 4: Update research.md — file-type table**

In `.agents/skills/designbook-skill-creator/resources/research.md:32`, replace:
```markdown
| **Task** | Output declarations (`result:`, `params:`, `reads:`) | Style guidance, implementation details, framework-specific logic |
```
With:
```markdown
| **Task** | Output declarations (`result:`, `params:`) | Style guidance, implementation details, framework-specific logic |
```

- [ ] **Step 5: Run test suite**

Run: `cd packages/storybook-addon-designbook && npx vitest run`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook-skill-creator/resources/schemas.md .agents/skills/designbook-skill-creator/rules/principles.md .agents/skills/designbook-skill-creator/resources/research.md
git commit -m "docs(skill-creator): update schemas, principles, research for reads-to-params migration"
```

---

### Task 7: Full verification

- [ ] **Step 1: Verify no remaining reads: in task files**

Run: `grep -r "^reads:" .agents/skills/*/tasks/ .agents/skills/*/*/tasks/ .agents/skills/*/*/*/tasks/ 2>/dev/null`
Expected: No output (no task files with `reads:` remain)

Also check: `grep -r "^reads:" .agents/skills/designbook-drupal/ 2>/dev/null`
Expected: No output

- [ ] **Step 2: Verify no reads: in TypeScript**

Run: `grep -r "reads" packages/storybook-addon-designbook/src/workflow-resolve.ts`
Expected: No matches (interface field removed)

- [ ] **Step 3: Run pnpm check**

Run: `pnpm check`
Expected: typecheck, lint, and test ALL PASS
