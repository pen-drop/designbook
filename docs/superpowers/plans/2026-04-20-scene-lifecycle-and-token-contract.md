# Scene Lifecycle + Token Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unblock the `design-screen` workflow, enforce the three-tier token shape at CSS-generate intake, and consolidate scene-file-writing tasks in a dedicated `scenes/` concern.

**Architecture:** Four kinds of change: (1) extend the existing `scene_path` addon resolver to accept a Storybook `story_id` directly, so workflows chain `story_id → scene_path` in one hop (no artificial `section_id` intermediate); (2) relocate and reshape the two scene-file-writing tasks into `scenes/tasks/` with modern `each:` + resolver patterns; (3) strengthen the `design_tokens` param contract with a `$ref`; (4) rewrite the petshop fixture to the three-tier shape. All work happens inside `.agents/skills/**` and `packages/storybook-addon-designbook/**`; testing runs in a fresh workspace.

**Tech Stack:** TypeScript (addon package, vitest), YAML (skill files), pnpm monorepo, existing ParamResolver contract, Storybook, Drupal SDC fixtures.

---

## Resolved open decisions

| Spec question | Decision | Rationale |
|---------------|----------|-----------|
| `story_id → scene_path` chain | **B (revised).** Extend the existing `scene_path` resolver to accept a `story_id` input directly — no new resolver, no `section_id` intermediate | There is no domain entity named "section id" — scene files also belong to the design-system shell. Extending `scene_path` makes it the single answer to "where does this scene live?" and eliminates a fake mid-stage entity. |
| Result key name in `create-scene-file.md` | Rename `section-scenes` → `scene-file` | Schema-name alignment; no external consumer references the old key |
| `design-shell` scene-stage chain | `steps: [create-scene-file, create-scene]` | First step idempotently ensures `design-system.scenes.yml` exists; second appends the shell scene |

## File map

### New files

| Path | Purpose |
|------|---------|
| `.agents/skills/designbook/scenes/tasks/create-scene-file.md` | SceneFile-skeleton creator. Relocated and renamed from `sections/tasks/create-section.md`; idempotent (skip if file exists). |
| `.agents/skills/designbook/scenes/tasks/create-scene.md` | SceneDef appender. Relocated from `design/tasks/create-scene.md`; reshaped to `each: scene:` + `scene_path` resolver. |

### Modified files

| Path | What changes |
|------|--------------|
| `packages/storybook-addon-designbook/src/resolvers/scene-path.ts` | Accept a Storybook story-id (e.g. `Designbook/Sections/Homepage--default`, `Designbook/Design System/Shell--default`) in addition to the existing kebab id / `shell` inputs. |
| `packages/storybook-addon-designbook/src/resolvers/__tests__/scene-path.test.ts` | Add cases for story-id inputs. |
| `.agents/skills/designbook/design/workflows/design-screen.md` | Remove dead `scene_id` param; chain `scene_path: { resolve: scene_path, from: story_id }` directly. |
| `.agents/skills/designbook/design/workflows/design-shell.md` | Remove `scene_id` + `section_title` defaults; replace `section_id: { default: "shell" }` with a literal `section` object default (scene-file metadata); derive `scene_path: { resolve: scene_path, from: section.id }`; extend scene stage to `[create-scene-file, create-scene]`. |
| `.agents/skills/designbook/sections/workflows/sections.md` | Rename step `create-section` → `create-scene-file`. |
| `.agents/skills/designbook/sections/workflows/shape-section.md` | Rename step `create-section` → `create-scene-file` (stage name remains `create-section` as a domain label; step list switches to the new step id). |
| `.agents/skills/designbook/css-generate/tasks/intake--css-generate.md` | Add `$ref: ../../tokens/schemas.yml#/DesignTokens` to `design_tokens` param. |
| `.agents/skills/designbook-skill-creator/resources/schemas.md` | Line 78 example referencing `Section` is updated to `SceneFile`. |
| `fixtures/drupal-petshop/tokens/designbook/design-system/design-tokens.yml` | Rewritten from flat to three-tier primitive/semantic structure. |

### Deleted files

| Path | Why |
|------|-----|
| `.agents/skills/designbook/sections/schemas.yml` | `Section` is a strict subset of `SceneFile`; all `$ref` usages migrate to `SceneFile`. |
| `.agents/skills/designbook/sections/tasks/create-section.md` | Replaced by `scenes/tasks/create-scene-file.md`. |
| `.agents/skills/designbook/design/tasks/create-scene.md` | Replaced by `scenes/tasks/create-scene.md`. |

---

## Task 1: Extend `scene_path` resolver to accept a story-id (TDD)

**Files:**
- Modify: `packages/storybook-addon-designbook/src/resolvers/scene-path.ts`
- Modify: `packages/storybook-addon-designbook/src/resolvers/__tests__/scene-path.test.ts`

**Background.** The current `scene-path.ts` resolver (29 lines) accepts:
- `"shell"` → `design-system/design-system.scenes.yml`
- any other string → treated as a kebab id, producing `sections/<id>/<id>.section.scenes.yml`

This task adds a third acceptable input shape: a Storybook story-id of the form `Designbook/<Category>/<Title>[--variant]`. Stripping the `--variant` suffix and splitting on `/`:
- `Designbook/Design System/*` → treat like `"shell"`
- `Designbook/Sections/<Title>` or any other `.../<Title>` → kebab-case `<Title>` and treat like a normal section id

The existing two input shapes stay supported (they remain useful for the `create-scene-file` task, which resolves from `section.id`).

- [ ] **Step 1: Extend the test file with new cases**

Open `packages/storybook-addon-designbook/src/resolvers/__tests__/scene-path.test.ts`. Inside the existing `describe('scenePathResolver', …)` block (after the current `'normalises section ids to kebab-case'` test), append these four tests:

```typescript
  it('resolves a Designbook/Sections story id to the section scenes path', async () => {
    const result = await scenePathResolver.resolve(
      'Designbook/Sections/Homepage--default',
      {},
      makeContext(),
    );
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sections/homepage/homepage.section.scenes.yml');
  });

  it('kebab-cases multi-word titles from story ids', async () => {
    const result = await scenePathResolver.resolve(
      'Designbook/Sections/Pet Details--default',
      {},
      makeContext(),
    );
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sections/pet-details/pet-details.section.scenes.yml');
  });

  it('resolves a Designbook/Design System story id to the shell scenes path', async () => {
    const result = await scenePathResolver.resolve(
      'Designbook/Design System/Shell--default',
      {},
      makeContext(),
    );
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('design-system/design-system.scenes.yml');
  });

  it('strips the --variant suffix from story ids', async () => {
    const result = await scenePathResolver.resolve(
      'Designbook/Sections/Homepage--mobile',
      {},
      makeContext(),
    );
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sections/homepage/homepage.section.scenes.yml');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /home/cw/projects/designbook/packages/storybook-addon-designbook
pnpm vitest run src/resolvers/__tests__/scene-path.test.ts
```

Expected: the four new tests FAIL (current implementation feeds the full story-id as a kebab id, producing `sections/designbook-sections-homepage/...`).

- [ ] **Step 3: Extend the resolver implementation**

Replace the full contents of `packages/storybook-addon-designbook/src/resolvers/scene-path.ts` with:

```typescript
import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';

function toKebab(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normaliseToSectionId(input: string): { id: string } | null {
  const withoutVariant = input.split('--')[0];
  const segments = withoutVariant
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  // Storybook story-id shape: at least two segments ("Group/Path").
  if (segments.length >= 2) {
    if (segments[0] === 'Designbook' && segments[1] === 'Design System') {
      return { id: 'shell' };
    }
    const last = segments[segments.length - 1];
    const id = toKebab(last);
    return id ? { id } : null;
  }

  // Single-segment: treat as a direct id ("shell" or a kebab section id).
  if (segments[0] === 'shell') {
    return { id: 'shell' };
  }
  const id = toKebab(segments[0]);
  return id ? { id } : null;
}

export const scenePathResolver: ParamResolver = {
  name: 'scene_path',

  resolve(input: string, _config: Record<string, unknown>, _context: ResolverContext): ResolverResult {
    if (!input || !input.trim()) {
      return { resolved: false, input, error: 'scene id is required' };
    }

    const normalised = normaliseToSectionId(input);
    if (!normalised) {
      return { resolved: false, input, error: `cannot derive scene path from: ${input}` };
    }

    if (normalised.id === 'shell') {
      return { resolved: true, value: 'design-system/design-system.scenes.yml', input };
    }

    return {
      resolved: true,
      value: `sections/${normalised.id}/${normalised.id}.section.scenes.yml`,
      input,
    };
  },
};
```

- [ ] **Step 4: Run the tests to verify all pass**

```bash
cd /home/cw/projects/designbook/packages/storybook-addon-designbook
pnpm vitest run src/resolvers/__tests__/scene-path.test.ts
```

Expected: all tests PASS (existing four + new four = eight).

- [ ] **Step 5: Run pnpm check for the addon package**

```bash
cd /home/cw/projects/designbook/packages/storybook-addon-designbook
pnpm check
```

Expected: typecheck + lint + full test suite PASS.

- [ ] **Step 6: Commit**

```bash
cd /home/cw/projects/designbook
git add packages/storybook-addon-designbook/src/resolvers/scene-path.ts \
        packages/storybook-addon-designbook/src/resolvers/__tests__/scene-path.test.ts
git commit -m "feat(addon): scene_path resolver accepts Storybook story-id input"
```

---

## Task 2: Add token-shape $ref to css-generate intake

**Files:**
- Modify: `.agents/skills/designbook/css-generate/tasks/intake--css-generate.md`

- [ ] **Step 1: Update the `design_tokens` param declaration**

Replace the current frontmatter block:

```yaml
params:
  type: object
  required: [design_tokens]
  properties:
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
```

with:

```yaml
params:
  type: object
  required: [design_tokens]
  properties:
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
      $ref: ../../tokens/schemas.yml#/DesignTokens
```

The rest of the file is unchanged.

- [ ] **Step 2: Verify the frontmatter still parses as YAML**

```bash
cd /home/cw/projects/designbook
node -e "const y=require('js-yaml'); const fs=require('fs'); const src=fs.readFileSync('.agents/skills/designbook/css-generate/tasks/intake--css-generate.md','utf8'); const fm=src.split('---')[1]; console.log(JSON.stringify(y.load(fm), null, 2))" | head -20
```

Expected: JSON dump shows `design_tokens.$ref = "../../tokens/schemas.yml#/DesignTokens"`.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/css-generate/tasks/intake--css-generate.md
git commit -m "feat(css-generate): enforce DesignTokens shape at intake"
```

---

## Task 3: Rewrite petshop tokens fixture to three-tier shape

**Files:**
- Modify: `fixtures/drupal-petshop/tokens/designbook/design-system/design-tokens.yml`

- [ ] **Step 1: Overwrite the fixture with the three-tier shape**

Replace the entire file contents (currently 71 lines, flat structure) with:

```yaml
primitive:
  color:
    indigo-500:
      $value: "#4F46E5"
      $type: color
      description: Indigo — trust and reliability
    emerald-500:
      $value: "#10B981"
      $type: color
      description: Emerald — nature, growth, pet wellness
    amber-500:
      $value: "#F59E0B"
      $type: color
      description: Amber — warmth, energy, call-to-action
    gray-900:
      $value: "#1F2937"
      $type: color
    gray-200:
      $value: "#F3F4F6"
      $type: color
    gray-100:
      $value: "#F9FAFB"
      $type: color
    gray-300:
      $value: "#E5E7EB"
      $type: color
    slate-100:
      $value: "#F1F5F9"
      $type: color
    green-500:
      $value: "#22C55E"
      $type: color
    red-500:
      $value: "#EF4444"
      $type: color
    white:
      $value: "#FFFFFF"
      $type: color
    black:
      $value: "#000000"
      $type: color
  fontFamily:
    inter:
      $value: Inter
      $type: fontFamily
    jetbrains-mono:
      $value: JetBrains Mono
      $type: fontFamily
  fontSize:
    base:
      $value: "1rem"
      $type: dimension
    lg:
      $value: "1.125rem"
      $type: dimension
    xl:
      $value: "1.5rem"
      $type: dimension
    2xl:
      $value: "2rem"
      $type: dimension
  fontWeight:
    regular:
      $value: 400
      $type: fontWeight
    bold:
      $value: 700
      $type: fontWeight
  lineHeight:
    tight:
      $value: 1.2
      $type: number
    normal:
      $value: 1.5
      $type: number

semantic:
  color:
    primary:
      $value: "{primitive.color.indigo-500}"
      $type: color
      description: Brand primary — trust and reliability
    primary-content:
      $value: "{primitive.color.white}"
      $type: color
      description: Text on primary
    secondary:
      $value: "{primitive.color.emerald-500}"
      $type: color
      description: Pet wellness accent
    secondary-content:
      $value: "{primitive.color.white}"
      $type: color
      description: Text on secondary
    accent:
      $value: "{primitive.color.amber-500}"
      $type: color
      description: Call-to-action accent
    accent-content:
      $value: "{primitive.color.black}"
      $type: color
      description: Text on accent
    neutral:
      $value: "{primitive.color.gray-900}"
      $type: color
      description: Dark headers and footer
    neutral-content:
      $value: "{primitive.color.slate-100}"
      $type: color
      description: Text on neutral
    background:
      $value: "{primitive.color.gray-100}"
      $type: color
      description: Page background
    surface:
      $value: "{primitive.color.gray-200}"
      $type: color
      description: Card surfaces
    border:
      $value: "{primitive.color.gray-300}"
      $type: color
      description: Dividers and borders
    foreground:
      $value: "{primitive.color.gray-900}"
      $type: color
      description: Main text color
    success:
      $value: "{primitive.color.green-500}"
      $type: color
      description: Adoption approved
    error:
      $value: "{primitive.color.red-500}"
      $type: color
      description: Error states
  typography:
    heading:
      $value:
        fontFamily: "{primitive.fontFamily.inter}"
        fontSize: "{primitive.fontSize.2xl}"
        fontWeight: "{primitive.fontWeight.bold}"
        lineHeight: "{primitive.lineHeight.tight}"
      $type: typography
      description: Clean, modern headings
    body:
      $value:
        fontFamily: "{primitive.fontFamily.inter}"
        fontSize: "{primitive.fontSize.base}"
        fontWeight: "{primitive.fontWeight.regular}"
        lineHeight: "{primitive.lineHeight.normal}"
      $type: typography
      description: Readable body text
    mono:
      $value:
        fontFamily: "{primitive.fontFamily.jetbrains-mono}"
        fontSize: "{primitive.fontSize.base}"
        fontWeight: "{primitive.fontWeight.regular}"
        lineHeight: "{primitive.lineHeight.normal}"
      $type: typography
      description: Code and reference IDs

component: {}
```

- [ ] **Step 2: Verify the YAML parses**

```bash
cd /home/cw/projects/designbook
node -e "const y=require('js-yaml'); const fs=require('fs'); const t=y.load(fs.readFileSync('fixtures/drupal-petshop/tokens/designbook/design-system/design-tokens.yml','utf8')); console.log(Object.keys(t), Object.keys(t.semantic||{}))"
```

Expected output: `[ 'primitive', 'semantic', 'component' ] [ 'color', 'typography' ]`.

- [ ] **Step 3: Commit**

```bash
git add fixtures/drupal-petshop/tokens/designbook/design-system/design-tokens.yml
git commit -m "test(fixture): petshop tokens on three-tier DesignTokens shape"
```

---

## Task 4: Create `scenes/tasks/` with the relocated `create-scene-file.md`

**Files:**
- Create: `.agents/skills/designbook/scenes/tasks/create-scene-file.md`
- Delete: `.agents/skills/designbook/sections/tasks/create-section.md`

- [ ] **Step 1: Create the new file**

Write `/home/cw/projects/designbook/.agents/skills/designbook/scenes/tasks/create-scene-file.md` with the following content:

```markdown
---
trigger:
  steps: [create-scene-file]
params:
  type: object
  required: [section, vision]
  properties:
    section:
      type: object
      description: >
        SceneFile-top-level metadata for the file being created
        (id, title, description, status, order, group).
      $ref: ../schemas.yml#/SceneFile
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      workflow: /debo-vision
      type: object
    sections_dir:
      path: $DESIGNBOOK_DATA/sections/
      type: string
    scene_path:
      type: string
      resolve: scene_path
      from: section.id
result:
  type: object
  required: [scene-file]
  properties:
    scene-file:
      path: "$DESIGNBOOK_DATA/{{ scene_path }}"
      type: object
      validators: [scene]
      $ref: ../schemas.yml#/SceneFile
each:
  section:
    expr: "section"
    schema: { $ref: ../schemas.yml#/SceneFile }
---

# Create Scene File

Initialise the scene file for a section (or the design-system shell) with an empty `scenes: []` array. The file format is `SceneFile`; "section" is the content-semantic label used by the roadmap workflows.

**Idempotency:** if the file at `$DESIGNBOOK_DATA/{{ scene_path }}` already exists, leave it unchanged and emit it as the `scene-file` result verbatim. Only write when the file is missing.

## Gathering (shape-section workflow only)

When called from the `shape-section` workflow, help the user define a specification for one roadmap section before the file is written.

### Select Section

Parse the sections from the product vision. Check which sections already have specs at `${DESIGNBOOK_DATA}/sections/[section-id]/*.section.scenes.yml`.

**Section ID conversion:** Convert the section title to kebab-case: lowercase, remove `&`, replace non-alphanumeric with `-`, trim dashes.

If only one section is unspecified, auto-select it. If a section already has a spec, ask: "Update it or start fresh?"

### Gather Section Requirements

Ask 4–6 clarifying questions based on the section context. Key areas:

- "What are the main user actions or tasks in this section?"
- "What information should be displayed? (Consider the data model entities)"
- "What are the key user flows?"
- "What UI patterns fit best? (e.g., list view, grid, cards, detail page, form)"
- "What's in scope and what's explicitly out of scope?"
- "Should this section be wrapped in the application shell?"

### Present Draft Specification

Show the specification and iterate until satisfied.

## Output Format

**For the `sections` workflow** (intake only provides `id`, `title`, `description`, `order`):

```yaml
id: {{ section.id }}
group: "Designbook/Sections/{{ section.title }}"
title: "{{ section.title }}"
description: "{{ section.description }}"
status: planned
order: {{ section.order }}
scenes: []
```

**For the `shape-section` workflow** (also provides `user_flows`, `ui_requirements`, `use_shell`):

```yaml
id: {{ section.id }}
group: "Designbook/Sections/{{ section.title }}"
title: "{{ section.title }}"
description: "{{ section.description }}"
status: shaped
order: {{ section.order }}
scenes: []
```

**For the `design-shell` workflow** (section id is `shell`, no conversational gathering):

```yaml
id: shell
group: "Designbook/Design System"
title: "Shell"
status: planned
scenes: []
```

## Rules

- `id` must match the directory name (kebab-case)
- Use only the fields available from the calling workflow's params
- If `user_flows` and `ui_requirements` are provided (non-empty), include them
- If `order` is not provided, omit it
- `scenes` starts as empty array — populated later by `/debo design-screen` or `/debo design-shell`
- **`group:`** must be `"Designbook/Sections/{{ section.title }}"` for section files, `"Designbook/Design System"` for the shell

## Constraints

- Be conversational only in the `shape-section` workflow; for other workflows write the skeleton without dialog.
- Keep specs focused on *what* the file needs, not *how* to implement it
- Reference the data model entities when discussing what information to display
- Each user flow should describe a complete path (start → action → result)
```

- [ ] **Step 2: Delete the old `create-section.md`**

```bash
cd /home/cw/projects/designbook
git rm .agents/skills/designbook/sections/tasks/create-section.md
```

- [ ] **Step 3: Verify the directory structure**

```bash
ls .agents/skills/designbook/scenes/
ls .agents/skills/designbook/sections/tasks/
```

Expected:

- `.agents/skills/designbook/scenes/` contains `schemas.yml` and a new `tasks/` subdir with `create-scene-file.md`.
- `.agents/skills/designbook/sections/tasks/` contains only `intake--sections.md`.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/scenes/tasks/create-scene-file.md
git commit -m "refactor(scenes): relocate create-section as scenes/tasks/create-scene-file.md"
```

---

## Task 5: Delete `sections/schemas.yml` and rewire all `Section` refs

**Files:**
- Delete: `.agents/skills/designbook/sections/schemas.yml`
- Modify: `.agents/skills/designbook/sections/tasks/intake--sections.md`
- Modify: `.agents/skills/designbook-skill-creator/resources/schemas.md`

- [ ] **Step 1: Find every current `Section` reference**

```bash
cd /home/cw/projects/designbook
grep -rn "sections/schemas.yml#/Section\|#/Section" .agents/skills/
```

Expected output (exactly these three locations after Task 4):

```
.agents/skills/designbook/sections/tasks/intake--sections.md:<lineno>:      $ref: ../schemas.yml#/Section
.agents/skills/designbook-skill-creator/resources/schemas.md:<lineno>:  $ref: ../schemas.yml#/Section       # Section.properties are merged in
```

(The previous `create-section.md` reference was removed in Task 4.)

- [ ] **Step 2: Update `intake--sections.md`**

In `.agents/skills/designbook/sections/tasks/intake--sections.md`, replace:

```yaml
    section:
      type: array
      items:
        $ref: ../schemas.yml#/Section
```

with:

```yaml
    section:
      type: array
      items:
        $ref: ../../scenes/schemas.yml#/SceneFile
```

- [ ] **Step 3: Update the skill-creator example**

In `.agents/skills/designbook-skill-creator/resources/schemas.md`, replace the example on line 78:

```yaml
  $ref: ../schemas.yml#/Section       # Section.properties are merged in
```

with:

```yaml
  $ref: ../../scenes/schemas.yml#/SceneFile  # SceneFile.properties are merged in
```

- [ ] **Step 4: Delete `sections/schemas.yml`**

```bash
git rm .agents/skills/designbook/sections/schemas.yml
```

- [ ] **Step 5: Verify no stale `Section` references remain**

```bash
grep -rn "sections/schemas.yml\|#/Section\b" .agents/skills/
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook/sections/tasks/intake--sections.md \
        .agents/skills/designbook-skill-creator/resources/schemas.md
git commit -m "refactor(scenes): drop redundant Section schema (subset of SceneFile)"
```

---

## Task 6: Rewire sections + shape-section workflows to call `create-scene-file`

**Files:**
- Modify: `.agents/skills/designbook/sections/workflows/sections.md`
- Modify: `.agents/skills/designbook/sections/workflows/shape-section.md`

- [ ] **Step 1: Update `sections.md`**

Replace the full file contents:

```markdown
---
title: Define Sections
description: Define your sections based on the product vision
stages:
  intake:
    steps: [sections:intake]
  execute:
    steps: [create-scene-file]
engine: direct
---
```

- [ ] **Step 2: Update `shape-section.md`**

Replace the full file contents:

```markdown
---
title: Shape Section
description: Define a section specification — user flows, UI requirements, and scope
stages:
  create-section:
    steps: [create-scene-file]
engine: direct
---
```

(Stage name `create-section` stays as a domain label; step id switches to the new task name.)

- [ ] **Step 3: Verify no workflow still references the old step id**

```bash
grep -rn "create-section" .agents/skills/designbook/
```

Expected: no output (the old step name is fully retired).

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/sections/workflows/sections.md \
        .agents/skills/designbook/sections/workflows/shape-section.md
git commit -m "refactor(sections): route workflows through create-scene-file step"
```

---

## Task 7: Relocate and reshape `create-scene.md`

**Files:**
- Create: `.agents/skills/designbook/scenes/tasks/create-scene.md`
- Delete: `.agents/skills/designbook/design/tasks/create-scene.md`

- [ ] **Step 1: Write the new `scenes/tasks/create-scene.md`**

Write `/home/cw/projects/designbook/.agents/skills/designbook/scenes/tasks/create-scene.md` with:

```markdown
---
trigger:
  steps: [create-scene]
domain: [components, scenes]
params:
  type: object
  required: [scene_path, components_dir]
  properties:
    scene_path:
      type: string
      description: >
        File path (relative to $DESIGNBOOK_DATA) of the target SceneFile.
        Supplied by the calling workflow via the scene_path resolver.
    components_dir:
      path: $DESIGNBOOK_DIRS_COMPONENTS
      type: string
      description: Components directory — location resolved by the active framework skill.
    components:
      type: array
      resolve: components_index
      description: >
        Live inventory of components currently rendered in Storybook.
        Every `component:` field in the scene result MUST match one of these ids —
        the compiled schema enum enforces this automatically.
      items:
        type: object
        required: [id]
        properties:
          id: { type: string }
          import_path: { type: string }
          story_id: { type: string }
    reference:
      type: object
      default: null
      $ref: ../../design/schemas.yml#/DesignReference
    design_scenes:
      path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
      type: object
      $ref: ../schemas.yml#/SceneFile
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
    section_scenes:
      path: "$DESIGNBOOK_DATA/{{ scene_path }}"
      type: object
      $ref: ../schemas.yml#/SceneFile
result:
  type: object
  required: [scene-file]
  properties:
    scene-file:
      path: "$DESIGNBOOK_DATA/{{ scene_path }}"
      validators: [scene]
      $ref: ../schemas.yml#/SceneFile
each:
  scene:
    expr: "scenes"
    schema: { $ref: ../schemas.yml#/SceneDef }
---

# Create Scene

Append one `SceneDef` to the SceneFile at `$DESIGNBOOK_DATA/{{ scene_path }}`. The file is expected to exist already — the calling workflow runs `create-scene-file` (or a roadmap workflow) before this task.

The exact structure depends on the active workflow step (shell or screen); see the applicable constraints rule:

- `shell-scene-constraints.md` when the scene is the design-system shell
- `screen-scene-constraints.md` when the scene is a section screen

## Inputs

- **`scene_path`** — the target file, resolved upstream via the `scene_path` resolver from either a Storybook `story_id` (design-screen) or `section.id` on a workflow-level `section` object (design-shell).
- **`section_scenes`** — the existing SceneFile content, from which the task reads `id`, `title`, `description`, and the existing `scenes[]` array. New scenes are appended to this array.
- **`reference`** — optional `DesignReference`, informs the scene's shell/section structure when present.

## Result: scene-file

Write the updated SceneFile: existing top-level fields preserved, `scenes[]` extended with the newly-derived `SceneDef` per scene binding.
```

- [ ] **Step 2: Delete the old `design/tasks/create-scene.md`**

```bash
cd /home/cw/projects/designbook
git rm .agents/skills/designbook/design/tasks/create-scene.md
```

- [ ] **Step 3: Verify the move is clean**

```bash
grep -rn "trigger:" .agents/skills/designbook/ | grep -E "create-scene(-file)?"
```

Expected: two matches, one in `scenes/tasks/create-scene-file.md`, one in `scenes/tasks/create-scene.md`.

```bash
ls .agents/skills/designbook/design/tasks/create-scene.md 2>&1 || echo "deleted (ok)"
```

Expected: "deleted (ok)".

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/scenes/tasks/create-scene.md
git commit -m "refactor(scenes): relocate create-scene to scenes/tasks, adopt each: + scene_path"
```

---

## Task 8: Update `design-screen.md` workflow

**Files:**
- Modify: `.agents/skills/designbook/design/workflows/design-screen.md`

- [ ] **Step 1: Rewrite the workflow frontmatter**

Replace the full file with:

```markdown
---
title: Design Screen
description: Create screen design components for a section (one scene per run)
params:
  story_id:
    type: string
    resolve: story_id
    sources: [scenes]
  scene_path:
    type: string
    resolve: scene_path
    from: story_id
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
  breakpoints:
    type: string
    resolve: breakpoints
    from: story_id
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
    domain: [data-model]
  component:
    steps: [create-component]
  sample-data:
    steps: [create-sample-data]
  entity-mapping:
    steps: [map-entity]
  scene:
    steps: [create-scene]
    domain: [data-model]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
after:
  - workflow: design-verify
---
```

Key differences from the original:

- `scene_id: { type: string }` — **removed**.
- `scene_path: { resolve: scene_path, from: story_id }` — **new** (one-hop resolver chain; `scene_path` now accepts a story-id directly — see Task 1).
- No `section_id` intermediate — section id is not a domain entity; scene files live under either the design-system shell or a section, and `scene_path` decides which based on the story-id shape.

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook/design/workflows/design-screen.md
git commit -m "feat(design-screen): chain scene_path directly from story_id"
```

---

## Task 9: Update `design-shell.md` workflow

**Files:**
- Modify: `.agents/skills/designbook/design/workflows/design-shell.md`

- [ ] **Step 1: Rewrite the workflow frontmatter**

Replace the full file with:

```markdown
---
title: Design Shell
description: Design the application shell -- page component with header, content, and footer slots
params:
  section:
    type: object
    default:
      id: shell
      group: "Designbook/Design System"
      title: "Shell"
      status: planned
  scene_path:
    type: string
    resolve: scene_path
    from: section.id
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
  regions:
    type: string
    default: "header,footer"
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
  component:
    steps: [create-component]
  scene:
    steps: [create-scene-file, create-scene]
  validate:
    steps: [validate]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
after:
  - workflow: design-verify
---
```

Key differences:

- `scene_id`, `section_title`, `section_id` — **removed**.
- `section: { default: {...} }` — **new** (structured SceneFile-metadata object; replaces the scalar `section_id` default. This is the same shape `create-scene-file` already expects from the sections/shape-section workflows, so the task needs no shell-specific branching).
- `scene_path: { resolve: scene_path, from: section.id }` — **new** (dot-path read on the default `section` object; `"shell"` input is still handled by `scene_path`).
- `scene` stage runs `[create-scene-file, create-scene]` — first step idempotently ensures `design-system.scenes.yml` exists, second appends the shell scene.

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook/design/workflows/design-shell.md
git commit -m "feat(design-shell): drop dead defaults, pass structured section object"
```

---

## Task 10: End-to-end smoke test — design-screen

**Files:** none — this is a verification task, no code changes.

- [ ] **Step 1: Rebuild the drupal-petshop workspace from scratch**

```bash
cd /home/cw/projects/designbook
rm -rf workspaces/drupal-petshop
./scripts/setup-workspace.sh drupal-petshop
./scripts/setup-test.sh drupal-petshop design-screen --into workspaces/drupal-petshop
```

Expected: workspace populated with fixtures (vision, tokens three-tier, data-model, sections, sample-data, design-component).

- [ ] **Step 2: Verify the tokens fixture landed correctly**

```bash
head -5 workspaces/drupal-petshop/designbook/design-system/design-tokens.yml
```

Expected: first line is `primitive:` — three-tier shape is in place.

- [ ] **Step 3: Start Storybook**

```bash
cd workspaces/drupal-petshop
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"
_debo storybook start
_debo storybook status
```

Expected: `status` prints a `url`.

- [ ] **Step 4: Run the design-screen workflow**

Execute the `design-screen.yaml` case prompt against the workspace (same prompt used during brainstorming).

Expected outcome:

- The workflow starts without prompting for `scene_id` and without requiring a hand-edited `tasks.yml`.
- The `css-generate` pre-step produces non-empty CSS (tokens now match the three-tier schema).
- The `create-scene` step writes `designbook/sections/homepage/homepage.section.scenes.yml` with the expected scene items.
- `pnpm build-storybook` succeeds.

- [ ] **Step 5: Archive snapshot diff**

```bash
cd workspaces/drupal-petshop
git status --short
cat designbook/workflows/archive/*/tasks.yml | grep -E "status:|error:" | head
```

Expected: `status: completed`, no `error:` entries.

- [ ] **Step 6: No commit — verification only**

No changes to commit in this task. If problems surface, fix at the root-cause level in Tasks 1–9 and re-run this task.

---

## Task 11: End-to-end smoke test — design-shell (optional, only if case exists)

**Files:** none.

- [ ] **Step 1: Rebuild the workspace for the design-shell case**

```bash
cd /home/cw/projects/designbook
rm -rf workspaces/drupal-petshop
./scripts/setup-workspace.sh drupal-petshop
./scripts/setup-test.sh drupal-petshop design-shell --into workspaces/drupal-petshop
```

- [ ] **Step 2: Start Storybook**

```bash
cd workspaces/drupal-petshop
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"
_debo storybook start
```

- [ ] **Step 3: Run the design-shell case prompt**

Execute the `design-shell.yaml` case prompt.

Expected outcome:

- Workflow completes without `scene_id`/`section_title` missing-param errors.
- `designbook/design-system/design-system.scenes.yml` is created (via `create-scene-file`) and populated with one `shell` scene (via `create-scene`).
- `pnpm build-storybook` succeeds.

- [ ] **Step 4: No commit — verification only**

---

## Self-review summary

- **Spec coverage:** D1 → Task 8; D2 → Task 7; D3 → Tasks 4 + 7; D4 → Tasks 4 + 5 + 6; D5 → Task 2; D6 → Task 3; design-shell cleanup → Task 9; open-decision "resolver chain" → Task 1 (extend `scene_path`, no `section_id` intermediate). All six decisions and the three open items are covered.
- **Placeholder scan:** every step has concrete file paths, full code blocks, and expected command output. No TODO/TBD placeholders.
- **Type consistency:**
  - `scene_path` resolver accepts three input shapes: `"shell"`, a kebab section id, and a Storybook story-id (`Designbook/.../<Title>[--variant]`). All three are covered by tests in Task 1.
  - `scene_path: { from: story_id }` (Task 8, design-screen) feeds a story-id straight into the resolver.
  - `scene_path: { from: section.id }` (Task 4 create-scene-file and Task 9 design-shell) feeds a kebab id (`"shell"`, `"homepage"`, …) via dot-path traversal — an established pattern (`section.id`, `check.story_id`, `vision.design_reference.url` in existing tasks).
  - Result key `scene-file` is used consistently in both scene tasks.
  - `SceneFile` `$ref` paths are `../schemas.yml#/SceneFile` from inside `scenes/tasks/` and `../../scenes/schemas.yml#/SceneFile` from cross-concern callers (`sections/tasks/intake--sections.md`).
