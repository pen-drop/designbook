# Unify Design Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify design-screen, design-shell, design-component and design-verify workflows with maximum task reuse, shared schemas, extract-reference as standalone first stage, and one scene per workflow run.

**Architecture:** All changes are to markdown skill files (`.agents/skills/`). No TypeScript code changes. Tasks are rewritten/created as markdown with YAML frontmatter. Workflows are reconfigured to share tasks via `when.steps` matching and central `schemas.yml` references.

**Tech Stack:** YAML frontmatter, markdown task/rule/workflow files, `$ref` schema resolution

---

### Task 1: Add EntityMapping schema

**Files:**
- Modify: `.agents/skills/designbook/design/schemas.yml`

- [ ] **Step 1: Add EntityMapping to schemas.yml**

Append after the existing `Scene` schema (after line 53):

```yaml

EntityMapping:
  type: object
  required: [entity_type, bundle, view_mode]
  properties:
    entity_type: { type: string }
    bundle: { type: string }
    view_mode: { type: string }
```

- [ ] **Step 2: Verify YAML validity**

Run: `python3 -c "import yaml; yaml.safe_load(open('.agents/skills/designbook/design/schemas.yml'))" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/schemas.yml
git commit -m "feat: add EntityMapping schema to design schemas.yml"
```

---

### Task 2: Update all four workflow definitions

**Files:**
- Modify: `.agents/skills/designbook/design/workflows/design-component.md`
- Modify: `.agents/skills/designbook/design/workflows/design-shell.md`
- Modify: `.agents/skills/designbook/design/workflows/design-screen.md`
- Modify: `.agents/skills/designbook/design/workflows/design-verify.md`

- [ ] **Step 1: Rewrite design-component.md**

Replace the entire file with:

```yaml
---
title: Design Component
description: Create a new UI component from a design reference
params:
  component: { type: string }
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
  component:
    steps: [create-component]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
after:
  - workflow: design-verify
---
```

Key changes: removed `test` stage (replaced by design-verify after-hook), added `reference` stage, added `params.component`.

- [ ] **Step 2: Rewrite design-shell.md**

Replace the entire file with:

```yaml
---
title: Design Shell
description: Design the application shell -- page component with header, content, and footer slots
params:
  scene: { type: string, default: "design-system:shell" }
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
  component:
    steps: [create-component]
  scene:
    steps: [create-scene]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
after:
  - workflow: design-verify
---
```

Key changes: added `reference` stage, added `params.scene` with default, added design-verify after-hook.

- [ ] **Step 3: Rewrite design-screen.md**

Replace the entire file with:

```yaml
---
title: Design Screen
description: Create screen design components for a section (one scene per run)
params:
  scene: { type: string }
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
  component:
    steps: [create-component]
  sample-data:
    steps: [create-sample-data]
  entity-mapping:
    steps: [map-entity]
  scene:
    steps: [create-scene]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
after:
  - workflow: design-verify
---
```

Key changes: added `reference` stage, added `params.scene`, added design-verify after-hook.

- [ ] **Step 4: Rewrite design-verify.md**

Replace the entire file with:

```yaml
---
title: Design Verify
description: Visual testing -- verify screens or components against design references
params:
  scene: { type: string }
  component: { type: string }
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
  setup-compare:
    steps: [setup-compare]
  capture:
    steps: [capture]
  compare:
    steps: [compare]
  triage:
    steps: [triage]
  polish:
    steps: [polish]
  outtake:
    steps: [outtake]
engine: direct
---
```

Key changes: added `reference` stage, added `params.scene` + `params.component` (both optional), removed `params: reference: []`.

- [ ] **Step 5: Verify YAML validity for all four**

Run:
```bash
for f in .agents/skills/designbook/design/workflows/design-{component,shell,screen,verify}.md; do
  echo -n "$f: "
  sed -n '/^---$/,/^---$/p' "$f" | head -n -1 | tail -n +2 | python3 -c "import sys,yaml; yaml.safe_load(sys.stdin); print('OK')"
done
```
Expected: all four print `OK`.

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook/design/workflows/design-component.md \
        .agents/skills/designbook/design/workflows/design-shell.md \
        .agents/skills/designbook/design/workflows/design-screen.md \
        .agents/skills/designbook/design/workflows/design-verify.md
git commit -m "feat: update all design workflow definitions with reference stage and shared params"
```

---

### Task 3: Create extract-reference task

**Files:**
- Create: `.agents/skills/designbook/design/tasks/extract-reference.md`
- Delete: `.agents/skills/designbook/design/resources/extract-reference.md`

- [ ] **Step 1: Read the existing resource file**

Read `.agents/skills/designbook/design/resources/extract-reference.md` to carry over all extraction logic (Playwright phases, vision fallback, output format).

- [ ] **Step 2: Create the new task file**

Create `.agents/skills/designbook/design/tasks/extract-reference.md` with this content:

```markdown
---
when:
  steps: [extract-reference]
params:
  scene: { type: string }
  component: { type: string }
result:
  design-reference:
    path: $STORY_DIR/design-reference.md
  reference:
    type: array
    items:
      $ref: ../schemas.yml#/Reference
  screenshot:
    path: $STORY_DIR/reference-full.png
reads:
  - path: $DESIGNBOOK_DATA/vision.md
  - path: $STORY_DIR/design-reference.md
    optional: true
---

# Extract Reference

Standalone task that resolves and extracts a design reference. First stage in all design workflows (design-component, design-shell, design-screen, design-verify).

## Step 1: Resolve $STORY_DIR

Resolve the story directory using the CLI. Exactly one of `scene` or `component` will be set:

- If `scene` is set: `STORY_DIR=$(_debo story --scene ${scene} --create | jq -r '.storyDir')`
- If `component` is set: `STORY_DIR=$(_debo story --component ${component} --create | jq -r '.storyDir')`

## Step 2: Reuse Check

If `$STORY_DIR/design-reference.md` already exists (from a prior workflow run):

> "A design reference already exists for this target:
>
> [show first 10 lines of existing file]
>
> Use existing reference or extract fresh?"

If the user chooses to reuse, read the existing file and skip to Step 5.

## Step 3: Find Reference URL

Read `vision.md` and look for a design reference URL.

**If a URL is found:**

> "In der Vision ist `<url>` als Design Reference hinterlegt. Ist das die richtige Reference fuer [scene/component name], oder moechtest du eine andere URL/Screenshot verwenden?"

Wait for response. The user may:
- Confirm the URL
- Provide a different URL
- Provide a screenshot path
- Say "skip" to proceed without reference

**If no URL in vision.md:**

> "No design reference URL found in vision.md. You can provide:
> - A URL to a reference website
> - A path to a screenshot
> - Or 'skip' to proceed without reference"

Wait for response.

If the user says "skip", complete the task with empty results (no design-reference.md, empty reference array, no screenshot).

## Step 4: Extract Structure

Follow the extraction strategy based on source capabilities.

### Strategy Selection

1. **URL with markup** (`hasMarkup: true`) -- Playwright extraction
2. **Screenshot or image path** -- AI vision analysis
3. **URL without markup** (`hasMarkup: false`) -- Download/screenshot then AI vision

### Playwright Extraction (hasMarkup: true)

All browser interaction uses `playwright-cli`. See [cli-playwright.md](../../resources/cli-playwright.md) for the full command reference.

#### Phase 1: Open Session and Screenshot

```bash
npx playwright-cli open
npx playwright-cli goto "<referenceUrl>"
npx playwright-cli resize 1440 1600
npx playwright-cli run-code "async (page) => { await page.waitForTimeout(3000) }"
npx playwright-cli screenshot --full-page --filename "$STORY_DIR/reference-full.png"
```

Inspect the screenshot visually to understand the page layout.

#### Phase 2: Extract All Design Characteristics

Use `playwright-cli eval` to extract DOM data. Run multiple eval calls -- one per concern -- to keep each extraction focused and readable.

**Fonts:**
```bash
npx playwright-cli eval "() => {
  const fonts = new Set();
  document.querySelectorAll('*').forEach(el => {
    const ff = getComputedStyle(el).fontFamily;
    if (ff) fonts.add(ff.split(',')[0].trim().replace(/['\"]/g, ''));
  });
  return JSON.stringify([...fonts]);
}"
```
- For each non-system font: extract `@font-face` declarations, Google Fonts `<link>` imports
- Extract: `font-family`, `src` URLs (woff2/woff), `font-weight`, `font-style`

**Color Palette:**
```bash
npx playwright-cli eval "() => {
  const bgs = new Set(); const texts = new Set();
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') bgs.add(cs.backgroundColor);
    texts.add(cs.color);
  });
  return JSON.stringify({ backgrounds: [...bgs], text: [...texts] });
}"
```
- Deduplicate and convert all values to hex format
- Note where each color appears (body bg, header bg, primary text, links, buttons, etc.)

**Landmark Structure:**
```bash
npx playwright-cli eval "() => {
  function getProps(el) {
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, height: el.offsetHeight + 'px', padding: cs.padding, borderBottom: cs.borderBottom };
  }
  const header = document.querySelector('header');
  const rows = header ? [...header.children].map(c => ({ tag: c.tagName, ...getProps(c), text: c.textContent?.substring(0, 100).trim() })) : [];
  const footer = document.querySelector('footer');
  const sections = footer ? [...footer.children].map(c => ({ tag: c.tagName, ...getProps(c), text: c.textContent?.substring(0, 100).trim() })) : [];
  return JSON.stringify({ header: rows, footer: sections });
}"
```

**Layout:**
- Measure container max-width, edge padding, section spacing via `eval`

**Interactive Patterns:**
- For each `<a>`, `<button>`, or `[role="button"]` within landmarks: extract computed styles via `eval`

**Close Session:**
```bash
npx playwright-cli close
```

### Vision Fallback (no markup)

1. Take a screenshot of the reference (or use existing screenshot)
2. AI analyzes the screenshot visually
3. Produce the same Markdown format with AI-estimated values
4. Add a note: `Strategy: vision (estimated values)`

## Step 5: Write Results

### design-reference.md

Write the extracted data to `$STORY_DIR/design-reference.md`:

```markdown
# Design Reference

Source: [reference URL or screenshot path]
Extracted: [date]

## Fonts

| Family | Source | Weights | Style |
|--------|--------|---------|-------|
| [name] | [URL or Google Fonts import] | [weights] | [normal/italic] |

## Color Palette

| Hex | Usage |
|-----|-------|
| #... | [where it appears: body bg, header bg, primary text, ...] |

## Layout

- Container max-width: [value]
- Edge padding: [mobile] -> [tablet] -> [desktop] -> [wide]
- Section spacing: [value]

## Landmark Structure

### Header
- Row 1: [bg color], [height] -- [content summary]
- Row 2: [bg color], [height] -- [content summary]

### Footer
- Section 1: [bg color] -- [content summary]
- Section 2: [bg color] -- [content summary]

## Interactive Patterns

| Element | Styles | Description |
|---------|--------|-------------|
| [button/link] | bg: ..., color: ..., radius: ... | [what it does] |
```

### reference[] Array

Build the reference array from the extracted data:

```json
[{"type": "url", "url": "<reference URL>", "threshold": 3, "title": "<page title>"}]
```

If the source was a screenshot (not URL), use `type: "image"`.

### screenshot

The full-page screenshot at `$STORY_DIR/reference-full.png` (captured in Phase 1, or provided by user).

## Reuse

If the target file already exists and the user chose to reuse (Step 2), read it and reconstruct the `reference[]` array from the `Source:` line. The screenshot file should already exist alongside it.
```

- [ ] **Step 3: Delete the old resource file**

```bash
git rm .agents/skills/designbook/design/resources/extract-reference.md
```

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/tasks/extract-reference.md
git commit -m "feat: convert extract-reference from resource to standalone task"
```

---

### Task 4: Create unified create-scene task and scene rules

**Files:**
- Create: `.agents/skills/designbook/design/tasks/create-scene.md`
- Create: `.agents/skills/designbook/design/rules/shell-scene-constraints.md`
- Create: `.agents/skills/designbook/design/rules/screen-scene-constraints.md`
- Delete: `.agents/skills/designbook/design/tasks/create-scene--design-shell.md`
- Delete: `.agents/skills/designbook/design/tasks/create-scene--design-screen.md`

- [ ] **Step 1: Read the two existing scene tasks for reference**

Read both files to carry over their logic:
- `.agents/skills/designbook/design/tasks/create-scene--design-shell.md`
- `.agents/skills/designbook/design/tasks/create-scene--design-screen.md`

- [ ] **Step 2: Create unified create-scene.md**

Create `.agents/skills/designbook/design/tasks/create-scene.md`:

```markdown
---
when:
  steps: [create-scene]
params:
  output_path: { type: string }
  scene: { type: string }
  section_id: { type: string }
  section_title: { type: string }
  reference: { type: array, default: [] }
result:
  scene-file:
    path: "{{ output_path }}"
    validators: [scene]
reads:
  - path: $DESIGNBOOK_DIRS_COMPONENTS
    description: Components -- location resolved by the active framework skill
  - path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
    optional: true
  - path: $STORY_DIR/design-reference.md
    optional: true
  - path: $DESIGNBOOK_DATA/data-model.yml
    optional: true
---

# Create Scene

Creates a scene YAML file at the path specified by `output_path`. Used by both design-shell (shell scenes) and design-screen (section scenes). Shell-specific and screen-specific constraints are applied via rules.

## Input

- `$DESIGNBOOK_DIRS_COMPONENTS` -- available components (discover slots and props from actual files)
- `design-system.scenes.yml` -- existing shell scene (for screen scenes that inherit via `scene:`)
- `design-reference.md` -- design reference for visual guidance (if available)
- `data-model.yml` -- entity types and bundles (for screen scenes with entity nodes)

## Output

```yaml
id: {{ scene identifier }}
title: {{ scene title }}
description: {{ scene description }}
status: planned
order: [number]

group: {{ determined by rules }}
scenes:
  - name: "[Scene Name]"
    reference:       # include ONLY when {{ reference }} is non-empty
      - type: "<url|image|...>"
        url: "<resource URL>"
        breakpoint: "<breakpoint name>"
        threshold: 3
        title: "<label>"
    # Write the reference entries from {{ reference }} param.
    # If {{ reference }} is null or empty, OMIT the reference: key entirely.
    items:
      # Scene items -- structure depends on shell vs screen rules
      - component: "$DESIGNBOOK_COMPONENT_NAMESPACE:COMPONENT_NAME"
        slots:
          ...
```

## Reference Resolution

If `$STORY_DIR/design-reference.md` exists, read its `Source:` line to extract the reference URL. Use this URL to populate the scene's `reference:` array (type: url, threshold: 3). If the `{{ reference }}` param is empty but design-reference.md exists, construct the reference entry from the extracted URL.

## Scene Node Types

Each entry in `items:` uses one of four keys:

- **`component:`** -- render a UI component directly (`$DESIGNBOOK_COMPONENT_NAMESPACE:card`)
- **`entity:`** -- render an entity from sample data (`node.article`, `view.recent_articles`)
- **`scene:`** -- embed a scene (e.g. the shell) and fill slots. The scene value MUST reference an existing scene.
- **`image:`** -- render an image using a named image style from `config.image_style` in data-model.yml.

## Ensure Meta

After writing the scene file, ensure `meta.yml` is created for each story via the `DeboStory` entity. This is handled automatically when design-verify runs as a subworkflow.

## Constraints

- **Discover, don't assume** -- read actual components to determine slots and props
- **Provider prefix** -- every `component:` value uses `$DESIGNBOOK_COMPONENT_NAMESPACE:name`
- **No `type: element`** -- plain strings for text content
```

- [ ] **Step 3: Create shell-scene-constraints.md**

Create `.agents/skills/designbook/design/rules/shell-scene-constraints.md`:

```markdown
---
when:
  steps: [design-shell:create-scene]
---

# Shell Scene Constraints

Constraints specific to shell scenes (design-system layout).

## Rules

- **`$content` injection point** -- exactly one slot in the root component MUST be set to `$content`. This is where section scenes inject their content.
- **Inline everything** -- all sub-component slots must be fully expanded with props and content. Never use `story: default` alone.
- **`group:`** must be `"Designbook/Design System"`
- **`id:`** must be `debo-design-system`
- **Scene name** -- the shell scene MUST be named `shell`

## Output Structure

```yaml
id: debo-design-system
title: Design System
description: [layout description]
status: planned
order: 0

group: "Designbook/Design System"
scenes:
  - name: shell
    items:
      - component: "$DESIGNBOOK_COMPONENT_NAMESPACE:page"
        slots:
          header:
            - component: "$DESIGNBOOK_COMPONENT_NAMESPACE:header"
              slots:
                # fully inline all header sub-components
          content: $content
          footer:
            - component: "$DESIGNBOOK_COMPONENT_NAMESPACE:footer"
              slots:
                # fully inline all footer sub-components
```
```

- [ ] **Step 4: Create screen-scene-constraints.md**

Create `.agents/skills/designbook/design/rules/screen-scene-constraints.md`:

```markdown
---
when:
  steps: [design-screen:create-scene]
---

# Screen Scene Constraints

Constraints specific to screen scenes (section pages).

## Rules

- **Shell inheritance** -- scene items MUST start with `scene: design-system:<shell_name>` and fill the `content` slot via `with:`.
- **Entity nodes allowed** -- use `entity:` with `view_mode:` for data-driven content
- **`group:`** must be `"Designbook/Sections/{{ section_title }}"`
- **`id:`** must match `{{ section_id }}`

## Output Structure

```yaml
id: {{ section_id }}
title: {{ section_title }}
description: {{ section_description }}
status: planned
order: [number]

group: "Designbook/Sections/{{ section_title }}"
scenes:
  - name: "[Screen Name]"
    items:
      - scene: "design-system:shell"
        with:
          content:
            - entity: "[ENTITY_TYPE].[ENTITY_BUNDLE]"
              view_mode: "[VIEW_MODE]"
            - component: "$DESIGNBOOK_COMPONENT_NAMESPACE:some-component"
              slots: ...
```
```

- [ ] **Step 5: Delete old scene task files**

```bash
git rm .agents/skills/designbook/design/tasks/create-scene--design-shell.md
git rm .agents/skills/designbook/design/tasks/create-scene--design-screen.md
```

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook/design/tasks/create-scene.md \
        .agents/skills/designbook/design/rules/shell-scene-constraints.md \
        .agents/skills/designbook/design/rules/screen-scene-constraints.md
git commit -m "feat: unified create-scene task with shell/screen rules"
```

---

### Task 5: Update existing task frontmatter to use $ref in params

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/map-entity--design-screen.md` (lines 4-8)
- Modify: `.agents/skills/designbook/design/tasks/capture-reference.md` (lines 8-12)
- Modify: `.agents/skills/designbook/design/tasks/compare-screenshots.md` (lines 8-12)
- Modify: `.agents/skills/designbook/design/tasks/polish.md` (lines 9-16)
- Modify: `.agents/skills/designbook-drupal/components/tasks/create-component.md` (lines 6-11)

- [ ] **Step 1: Update map-entity--design-screen.md frontmatter**

Replace the `params` block (lines 5-8):

```yaml
# Old:
params:
  entity_type: { type: string }
  bundle: { type: string }
  view_mode: { type: string }

# New:
params:
  $ref: ../schemas.yml#/EntityMapping
```

Also update the `each` key name from implicit to explicit (if currently missing `each`), and ensure `each` references the same schema. Current file already has no `each:` — it's a single-execution task per entity. However, per the spec, it should iterate via `each: entity_mappings`. Update the frontmatter to:

```yaml
params:
  $ref: ../schemas.yml#/EntityMapping
each:
  entity_mappings:
    $ref: ../schemas.yml#/EntityMapping
```

And remove the old `stage: map-entity` line (line 5) as stage is defined in the workflow.

- [ ] **Step 2: Update capture-reference.md frontmatter**

Replace the params block (lines 8-12):

```yaml
# Old:
params:
  scene: { type: string }
  storyId: { type: string }
  breakpoint: { type: string }
  region: { type: string }

# New:
params:
  $ref: ../schemas.yml#/Check
  scene: { type: string }
```

The `scene` param is not part of `Check` schema but is needed by the task, so it stays as an explicit sibling.

- [ ] **Step 3: Update compare-screenshots.md frontmatter**

Replace the params block (lines 8-12):

```yaml
# Old:
params:
  scene: { type: string }
  storyId: { type: string }
  breakpoint: { type: string }
  region: { type: string }

# New:
params:
  $ref: ../schemas.yml#/Check
  scene: { type: string }
```

Same pattern as capture-reference: `Check` schema provides the core fields, `scene` is an extra sibling.

- [ ] **Step 4: Update polish.md frontmatter**

Replace the params block (lines 9-16):

```yaml
# Old:
params:
  id: { type: string }
  scene: { type: string }
  storyId: { type: string }
  checkKey: { type: string }
  severity: { type: string }
  description: { type: string }
  file_hint: { type: string }
  properties: { type: array, default: [] }

# New:
params:
  $ref: ../schemas.yml#/Issue
```

All fields are part of the `Issue` schema.

- [ ] **Step 5: Update create-component.md (drupal skill) frontmatter**

In `.agents/skills/designbook-drupal/components/tasks/create-component.md`, replace the params block (lines 6-11):

```yaml
# Old:
params:
  component: { type: string }
  slots: { type: array, default: [] }
  props: { type: array, default: [] }
  group: { type: string }
  variants: { type: array, default: [] }

# New:
params:
  $ref: designbook/design/schemas.yml#/Component
  props: { type: array, default: [] }
  variants: { type: array, default: [] }
```

`Component` schema provides `component`, `slots`, `group`, `description`, `design_hint`. `props` and `variants` are not in the `Component` schema (they are component-creation-specific), so they stay as explicit siblings.

Note: the `$ref` path uses the skill-qualified form `designbook/design/schemas.yml#/Component` since this file is in the `designbook-drupal` skill, not the `designbook` skill.

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook/design/tasks/map-entity--design-screen.md \
        .agents/skills/designbook/design/tasks/capture-reference.md \
        .agents/skills/designbook/design/tasks/compare-screenshots.md \
        .agents/skills/designbook/design/tasks/polish.md \
        .agents/skills/designbook-drupal/components/tasks/create-component.md
git commit -m "feat: update task params to use \$ref for schema consistency with each"
```

---

### Task 6: Rewrite intake--design-component

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/intake--design-component.md`

- [ ] **Step 1: Read the current intake**

Read `.agents/skills/designbook/design/tasks/intake--design-component.md` to understand the current flow.

- [ ] **Step 2: Rewrite the file**

Replace the entire file content. The key change: remove Step 1 (Resolve Design Reference) — that's now handled by the `extract-reference` stage. The intake reads `design-reference.md` from `$STORY_DIR` instead.

```markdown
---
when:
  steps: [design-component:intake]
result:
  component:
    type: array
    items:
      $ref: ../schemas.yml#/Component
reads:
  - path: $STORY_DIR/design-reference.md
    optional: true
  - path: $STORY_DIR/reference-full.png
    optional: true
---

# Intake: Design Component

Help the user design a new UI component by gathering requirements. The `extract-reference` stage has already run — if a design reference exists, it is available in `$STORY_DIR/design-reference.md` and `$STORY_DIR/reference-full.png`.

## Step 1: Choose Input Mode

**If `design-reference.md` exists**, skip this step — go directly to Step 2 (Quick Description) and use the reference to auto-generate the component definition. Present the derived definition for confirmation.

**If no design reference:**

> "Let's create a new UI component!
>
> **How would you like to define it?**
>
> 1. **Quick description** -- Describe what you want in natural language
> 2. **Step-by-step** -- I'll ask detailed questions about each aspect
>
> Which do you prefer? (1/2)"

Wait for response.

**If "1":** Go to Step 2 (Quick).
**If "2":** Go to Step 3 (Step-by-step).

---

## Step 2: Quick Description Mode

**If `design-reference.md` exists**, analyze the reference and extract the component structure. Present the derived definition directly:

> "Based on the design reference, I've identified this component:
>
> **Component: [name]**
> **Slots:** [slot list]
> **Variants:** [list or 'default only']
> **Props:** [list or 'none']
>
> Does this match? (y / adjust)"

**If no design reference:**

> "Describe your component -- be as specific or vague as you like!
>
> _Example: 'A card with an image on top, a headline, body text, and a CTA button'_"

Wait for response.

Analyze the description to extract: `componentName`, `slots`, `variants`, `props`.

Present the interpretation:

> "Based on your description:
>
> **Component: [name]**
> **Slots:** [slot list]
> **Variants:** [list or 'default only']
> **Props:** [list or 'none']
>
> Does this match? (y / adjust)"

Wait for response. Iterate until confirmed, then go to Step 4.

---

## Step 3: Step-by-Step Mode

Ask these questions in order, waiting for each response:

**3.1 -- Name:**

> "What is the component name? (e.g. `Button`, `Card`, `Hero`)"

Normalize to kebab-case for files.

**3.2 -- Description:**

> "Brief description of the component? (1-2 sentences)"

**3.3 -- Variants:**

> "Does this component have visual variants? (y/n)
> _Examples: default/outline/ghost, info/warning/error_"

If yes, ask for variant names and details.

**3.4 -- Props:**

> "Does it need configurable properties (props)? (y/n)
> _Examples: variant, size, disabled, href_"

If yes, ask for each prop: name, type, title, enum values, default, required.

**3.5 -- Slots:**

> "Does it have content slots? (y/n)
> _Examples: title, body, footer, icon_"

If yes, ask for each slot: name, title, description.

Go to Step 4.

---

## Step 4: Confirm Summary

> "Here's your component definition:
>
> **Component:** [name]
> **Description:** [description]
>
> **Variants:** [count] -- [list]
> **Props:** [count] -- [list]
> **Slots:** [count] -- [list]
>
> Ready to create? (y/n)"

Wait for response. If no, go back to relevant step.

## Step 5: Complete Intake

Store the `component` iterable as task result.

- **`component`**: one entry with `component` (name), `slots` (array), and `group` (set to component name as default group).
- When a design reference was extracted, also include `design_hint` (structured data from `design-reference.md`) and `reference_screenshot` (absolute path to `$STORY_DIR/reference-full.png`) on the component item.

**Auto-set fields** (do NOT ask the user):
- `status` -> `experimental`
- `provider` -> from `$DESIGNBOOK_COMPONENT_NAMESPACE` or `designbook.config.yml`

**Guardrails**

- Component names must be unique (check existing components first)
- If component already exists, ask: overwrite or rename?
- Use kebab-case for files, PascalCase for display names
- Component skills are loaded by convention: `designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT`
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/intake--design-component.md
git commit -m "feat: rewrite intake--design-component, reference extraction is now a separate stage"
```

---

### Task 7: Rewrite intake--design-shell

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/intake--design-shell.md`

- [ ] **Step 1: Read the current intake**

Read `.agents/skills/designbook/design/tasks/intake--design-shell.md` to understand the current flow.

- [ ] **Step 2: Rewrite the file**

Replace the entire file. Key changes: remove Step 1 (Extract Design Reference), add `output_path` as result, remove `scene[]` array (only one scene), remove `mkdir` for story dir (handled by extract-reference).

```markdown
---
when:
  steps: [design-shell:intake]
result:
  component:
    type: array
    items:
      $ref: ../schemas.yml#/Component
  output_path:
    type: string
reads:
  - path: $DESIGNBOOK_DATA/vision.md
  - path: $STORY_DIR/design-reference.md
    optional: true
  - path: $STORY_DIR/reference-full.png
    optional: true
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
---

# Intake: Design Shell

Help the user design the application shell -- a `page` component with `header`, `content`, and `footer` slots, composed as a scene named `shell` in `design-system.scenes.yml`.

The `extract-reference` stage has already run -- if a design reference exists, it is available in `$STORY_DIR/design-reference.md`.

## Step 1: Analyze and Propose Layout

Review the product and sections, then present navigation options:

**If `design-reference.md` exists**, analyze the landmark structure (header rows, footer sections, layout dimensions) and propose the layout pattern that matches the reference. Skip hypothetical options and present the derived layout directly.

**If no design reference**, present options:

> "I'm designing the shell for **[Product Name]**. Based on your sections:
>
> 1. **[Section 1]** -- [Description]
> 2. **[Section 2]** -- [Description]
>
> Common layouts:
>
> **A. Top Navigation** -- Horizontal nav at top, content below
>    Best for: Corporate sites, marketing sites, fewer sections
>
> **B. Sidebar Navigation** -- Vertical nav on the left, content right
>    Best for: Apps with many sections, dashboards, admin panels
>
> **C. Minimal Header** -- Just logo + nav links in header
>    Best for: Simple sites, portfolio-style, few pages
>
> Based on **[Product Name]**, I'd suggest [suggestion] because [reason].
>
> Which pattern fits best?"

Wait for their response.

## Step 2: Plan Components

Follow the component planning process:
1. Scan existing components (location provided by framework rules)
3. Determine which shell components exist (reuse) vs. need creation (page, header, footer, navigation, etc.)

**If `design-reference.md` exists**, derive the component list from the landmark structure and interactive patterns rather than guessing.

### Component Extraction Criteria

Identify atomic UI elements as separate components when they meet either condition:
- **Appears 2+ times** across the shell (e.g. a button style used in header and footer)
- **Is interactive** -- receives user input or triggers navigation (e.g. search field, CTA button, nav link with hover states)

Common atomic components to extract: `button`, `badge`, `icon`, `search`, `link` (when styled distinctly from plain text).

Single-use decorative elements remain inline in the parent component's template.

### Resolve Embed Dependencies

After assembling the initial component list, resolve embed dependencies from loaded blueprints:

1. For each proposed component, find the matching loaded blueprint
2. Collect all `embeds:` entries from those blueprints' frontmatter
3. Add any missing embedded components to the plan (e.g., if `header.md` has `embeds: [container]` and container is not yet in the list, add it)
4. Sort the final component list so that embedded components are built before their embedders (leaves first, dependents last)

Present the component plan and get user confirmation before proceeding.

## Step 3: Gather Shell Details

**If `design-reference.md` exists**, pre-fill navigation items, footer links, and other details from the reference. Present them for confirmation rather than asking open-ended questions.

**If no design reference**, ask clarifying questions:

- "What navigation items should appear? (Based on your sections, I suggest: [list])"
- "Where should the user menu / contact info appear? (Top right is common)"
- "Do you need any additional items? (Search, language switcher, CTA button, etc.)"
- "How should it adapt on mobile? (Hamburger menu, collapsible sidebar, bottom nav)"
- "Footer: What links, copyright text, and social icons should appear?"

## Step 4: Present Shell Design

> "Here's the shell design for **[Product Name]**:
>
> **Layout Pattern:** [chosen pattern]
>
> **Header:**
> - Logo: [product name]
> - Navigation: [nav items list]
> - CTA: [if any]
>
> **Footer:**
> - Links: [list]
> - Copyright: [text]
> - Social: [if any]
>
> **Responsive Behavior:**
> - Desktop: [how it looks]
> - Mobile: [how it adapts]
>
> Does this match what you had in mind?"

Iterate until the user is satisfied. Once confirmed, proceed to the structure preview.

## Step 5: Structure Preview

Display a full recursive ASCII tree of the shell component structure so the user can verify the complete picture before building starts.

Follow the process in [structure-preview.md](partials/structure-preview.md).

**Input for the tree:**
- Root: the `page` component with all its slots and nested components
- Show `content -> $content` for the content injection point
- Title: "Shell Structure"

**Guardrails**
- Be conversational -- help the user think through layout decisions
- Navigation items should map to the product's sections
- Consider the product type when suggesting layout patterns
- If `design-system/design-system.scenes.yml` already exists, read it first and ask: "You already have a shell design. Would you like to update it or start fresh?"
- If page/header/footer components already exist, reuse them -- only create if missing

## Step 6: Complete Intake

Store the `component` and `output_path` as task results.

- **`component`**: one entry per new component. Each item needs `component` (name) and `slots` (array).
- **`output_path`**: `$DESIGNBOOK_DATA/design-system/design-system.scenes.yml`

### Rich component params (when design reference is available)

When `design-reference.md` exists, pass the extracted design data directly as additional fields on each component param object:

- **`description`**: Start with `ref=<landmark>` to link the component to its reference landmark, followed by a short visual description
- **`design_hint`**: Structured landmark-specific extraction from `design-reference.md`. Contains `rows` (background colors, heights), `fonts` (per-element font specs), and `interactive` patterns (element types, colors, border-radius).
- **`reference_screenshot`**: Absolute path to `$STORY_DIR/reference-full.png`

When no design reference is available, emit only the standard fields (`component`, `slots`, `group`) -- omit `design_hint` and `reference_screenshot`.
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/intake--design-shell.md
git commit -m "feat: rewrite intake--design-shell, reference is separate stage, output_path result"
```

---

### Task 8: Rewrite intake--design-screen

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/intake--design-screen.md`

- [ ] **Step 1: Read the current intake**

Read `.agents/skills/designbook/design/tasks/intake--design-screen.md` to understand the current flow.

- [ ] **Step 2: Rewrite the file**

Replace the entire file. Key changes: remove Step 2 (Extract Design Reference), add `output_path` + `entity_mappings` + `section_id` + `section_title` as results, remove `scene[]` array (one scene per run), use `$ref` for EntityMapping.

```markdown
---
when:
  steps: [design-screen:intake]
result:
  component:
    type: array
    items:
      $ref: ../schemas.yml#/Component
  output_path:
    type: string
  entity_mappings:
    type: array
    items:
      $ref: ../schemas.yml#/EntityMapping
  section_id:
    type: string
  section_title:
    type: string
reads:
  - path: $DESIGNBOOK_DATA/data-model.yml
  - path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
  - path: $DESIGNBOOK_DATA/vision.md
  - path: $STORY_DIR/design-reference.md
    optional: true
  - path: $STORY_DIR/reference-full.png
    optional: true
  - path: $DESIGNBOOK_DATA/sections/[section-id]/[section-id].section.scenes.yml
    workflow: debo-shape-section
---

# Intake: Design Screen

Gather all information needed to design one screen for a section. This workflow builds one scene per run. The `extract-reference` stage has already run -- if a design reference exists, it is available in `$STORY_DIR/design-reference.md`.

## Step 1: Confirm Section

If the user provided a section name or id, use it directly.

If no section was provided, ask:

> "Which section would you like to design a screen for?"

Wait for their response before continuing.

## Step 2: Determine Screen

Read `data-model.yml` to understand the entities and structure of the selected section.

Based on the section name, data model, and **loaded design reference** (if available), determine which screen to build in this run:

> "Which screen would you like to build for the **[section]** section?
>
> - **Landing page** -- a curated, editorial layout (e.g. section homepage, campaign page)
> - **Overview page** -- shows a filterable/sortable list of [entities] (e.g. blog index, product catalog)
> - **Detail page** -- full view of a single [entity]
>
> [If a layout-builder bundle exists: "Your data model includes a layout-builder page type (`[bundle]`) -- that's typically used for landing pages."]"

Wait for the user's answer before continuing.

**If the user chooses landing page**, ask whether entity lists should be embedded:

> "Should the landing page include any embedded lists (e.g. a teaser list of recent [entities], featured items)?
>
> If yes -- which entities, and how many items?"

This determines whether list-related components and entity mappings (e.g. teaser view modes) need to be planned alongside the landing page.

Wait for the user's answer before continuing.

## Step 3: Plan Entities

Based on the confirmed screen and the section spec scenes, build the authoritative entity mapping work list:

1. Collect every `entity:` node for the planned screen and the section spec scenes
2. Deduplicate -- same `entity.view_mode` pair may appear in multiple contexts
3. Traverse `type: reference` fields in `data-model.yml` recursively -- add referenced entities with their implied view_mode
4. For landing pages with embedded lists: include teaser view modes for the embedded entities
5. Verify each template has a matching rule file (`skills/*/rules/*.md` with `when: template: {name}`) -- stop and report if any is missing
6. Order leaf entities first (no outgoing refs), then parents

Present the entity work list:

| Entity | View Mode | Template | Output |
| ------ | --------- | -------- | ------ |
| `[entity_type].[bundle]` | `full`   | `field-map` | `entity-mapping/[entity_type].[bundle].full.jsonata`   |
| `[entity_type].[bundle]` | `teaser` | `field-map` | `entity-mapping/[entity_type].[bundle].teaser.jsonata` |

Ask the user to confirm. Wait for confirmation.

## Step 4: Plan Components

Based on the confirmed screen, entities, section spec, data model, and **loaded design reference** (if available):

1. Scan existing components (location provided by framework rules)
3. Identify which UI components are needed for the planned screen beyond entities and shell (cards, filter bars, badges, stat displays, empty states, pagination, etc.)

**If `design-reference.md` exists**, analyze the landmark structure and interactive patterns to derive the component list rather than asking the user to describe components from scratch.

Present the component plan **grouped per entity** -- list which components are needed to render each entity view mode, then list any screen-level components that are not tied to a specific entity:

**`[entity_type].[bundle]` (full)**
| Category | Component | Slots              | Purpose      |
| -------- | --------- | ------------------ | ------------ |
| Existing | heading   | text               | Reuse        |
| New      | card      | image, title, body | Content card |

**Screen-level (not entity-specific)**
| Category | Component | Slots | Purpose |
| -------- | --------- | ----- | ------- |
| ...      | ...       | ...   | ...     |

Ask the user to confirm or adjust. Wait for confirmation.

The following fields are **auto-set from context** (do NOT ask the user):
- `status` -> `experimental`
- `provider` -> from `$DESIGNBOOK_COMPONENT_NAMESPACE` or `designbook.config.yml`
- `description` -> auto-generated from section context

## Step 5: Summary

Present a complete summary of everything that will be built:

> "Here is what I will build for the **[section]** section (**[screen type]**):
>
> **Entity Mappings** ([n] total)
> - `[entity_type].[bundle].[view_mode]` -- [template]
>
> **New Components** ([n] total, grouped by entity)
> - `[entity_type].[bundle]` (full): `[component-name]` -- [purpose]
> - Screen-level: `[component-name]` -- [purpose]
>
> Ready to proceed?"

Wait for confirmation before proceeding to the structure preview.

## Step 6: Structure Preview

Display a full recursive ASCII tree for the screen so the user can verify the complete component structure before building starts.

Follow the process in [structure-preview.md](partials/structure-preview.md).

**Input for the tree:**
- One tree for the single screen
- Tree starts from `scene: design-system:shell` with `content` injection point
- Show entity mappings and view modes where applicable
- Title: "Screen Structure: [Screen Name]"

**Guardrails**

- Reference the section spec for required user flows and UI requirements
- Reference the sample data for what content is available to display
- Reference design tokens for colors and typography
- Reference the shell for navigation context
- Consider responsive behavior

## Step 7: Complete Intake

Store all results as task data:

- **`component`**: one entry per new component from Step 4. Each item needs `component` (name) and `slots` (array). When `design-reference.md` exists, also include `reference_screenshot` (absolute path to `$STORY_DIR/reference-full.png`) and `design_hint` on each component item.
- **`output_path`**: `$DESIGNBOOK_DATA/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml`
- **`entity_mappings`**: one entry per entity mapping from Step 3. Each item has `entity_type`, `bundle`, `view_mode`.
- **`section_id`**: the confirmed section ID
- **`section_title`**: the confirmed section title
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/intake--design-screen.md
git commit -m "feat: rewrite intake--design-screen, one scene per run, reference is separate stage"
```

---

### Task 9: Rewrite intake--design-verify and setup-compare for component mode

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/intake--design-verify.md`
- Modify: `.agents/skills/designbook/design/tasks/setup-compare.md`

- [ ] **Step 1: Read both current files**

Read both to understand current flow:
- `.agents/skills/designbook/design/tasks/intake--design-verify.md`
- `.agents/skills/designbook/design/tasks/setup-compare.md`

- [ ] **Step 2: Rewrite intake--design-verify.md**

Replace the entire file. Key changes: add `component` param, reuse `design-reference.md` from prior workflows, both params optional.

```markdown
---
when:
  steps: [design-verify:intake]
params:
  scene: { type: string }
  component: { type: string }
  reference: { type: array, default: [] }
result:
  scene:
    type: string
  component:
    type: string
  reference:
    type: array
    items:
      $ref: ../schemas.yml#/Reference
  breakpoints:
    type: array
    items: { type: string }
reads:
  - path: $STORY_DIR/design-reference.md
    optional: true
---

# Intake: Design Verify

Visual testing for a single scene or component. Works in two modes:

- **Scene mode**: `params.scene` is set -- verify a scene (shell or section screen)
- **Component mode**: `params.component` is set -- verify a single component

Can be called as a subworkflow (from design-shell/screen/component after-hook) or standalone.

## Context Detection

- **`params.scene` is set:** Scene mode. The `extract-reference` stage has already resolved `$STORY_DIR`.
- **`params.component` is set:** Component mode. The `extract-reference` stage has already resolved `$STORY_DIR`.
- **Neither is set:** Standalone -- proceed with Step 1.

## Step 1: Identify Target (standalone only)

Ask the user what to verify:

> "What should I verify?
> - A scene (e.g. `design-system:shell`, `homepage:landing`)
> - A component (e.g. `card`, `header`)
>
> Enter the scene name or component name:"

Set `params.scene` or `params.component` from the answer.

## Step 2: Resolve Reference

If `$STORY_DIR/design-reference.md` exists (from a prior build workflow or the extract-reference stage):
- Read the `Source:` line to get the reference URL
- Build the `reference` array: `[{"type": "url", "url": "<url>", "threshold": 3, "title": "<label>"}]`
- Skip asking the user for a reference

If no `design-reference.md` and `params.reference` is empty:

> "What is the design reference?
> - A URL to the design source
> - 'skip' to verify without reference"

Set `params.reference` from the answer.

## Step 3: Select Breakpoints

Breakpoints are collected as a required result -- the workflow engine triggers `waiting_for` automatically, prompting the user to select which breakpoints to test.

List available breakpoints from `design-tokens.yml` with pixel values.

## Step 4: Ensure Storybook is running

```bash
_debo storybook status
```

- **If running:** check freshness -- if component files are newer than `started_at`, restart with `_debo storybook start --force`.
- **If not running:** `_debo storybook start`. Wait for `{ ready: true }`.
- **If startup fails:** report errors from `_debo storybook logs` and pause.

## Step 5: Write Results and Complete

Pass `scene`, `component`, `reference`, and `breakpoints` to the next stage via data results.

- `scene`: from params (or empty string if component mode)
- `component`: from params (or empty string if scene mode)
- `reference`: the array from Step 2
- `breakpoints`: from user input (Step 3)
```

- [ ] **Step 3: Rewrite setup-compare.md**

Replace the entire file. Key change: support `component` param alongside `scene`, adjust region logic.

```markdown
---
when:
  steps: [setup-compare]
params:
  scene: { type: string }
  component: { type: string }
  reference: { type: array, default: [] }
  breakpoints: { type: array }
result:
  checks:
    type: array
    items:
      type: object
      required: [storyId, breakpoint, region]
      properties:
        storyId: { type: string }
        breakpoint: { type: string }
        region: { type: string }
        threshold: { type: number, default: 0 }
        selector: { type: string }
        type: { type: string }
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Setup Compare

Creates the story entity and returns the `checks` array for the inline capture and compare stages.

## Step 1: Restart Storybook

Always restart Storybook before capture to ensure compiled state matches generated files:

```bash
_debo storybook start --force
```

Wait for `{ ready: true }`. If startup fails, report errors from `_debo storybook logs` and pause.

## Step 2: Determine Mode and Regions

**Component mode** (`component` param is set):
- Regions: always `["full"]`
- Story resolution: `_debo story --component ${component}`

**Scene mode** (`scene` param is set):
- Shell scenes (scene ends with `:shell`): regions `["header", "footer"]`
- All other scenes: regions `["full"]`
- Story resolution: `_debo story --scene ${scene}`

## Step 3: Build meta-seed JSON

From `params.reference` and resolved breakpoints + regions, build the meta-seed.

Build the full breakpoints x regions matrix:

```json
{
  "reference": {
    "source": {
      "url": "<reference[0].url>",
      "origin": "<reference[0].type>",
      "hasMarkup": true
    },
    "breakpoints": {
      "<bp1>": { "threshold": <threshold>, "regions": { "<region>": {}, ... } },
      "<bp2>": { "threshold": <threshold>, "regions": { "<region>": {}, ... } }
    }
  }
}
```

If `reference` is empty or null: skip compare by completing with an empty `checks` array.

### Apply matched rules (before story creation)

Before calling the CLI, apply all loaded rules for this stage that modify the reference. Rules may resolve provider-specific URLs, set additional fields on `reference.source` (e.g. `hasMarkup`), or transform the meta-seed.

## Step 4: Create story and get checks

Use the appropriate CLI command based on mode:

**Scene mode:**
```bash
CHECKS=$(_debo story --scene ${scene} --create --json '<meta-seed-json>' checks)
```

**Component mode:**
```bash
CHECKS=$(_debo story --component ${component} --create --json '<meta-seed-json>' checks)
```

This creates the story directory + `meta.yml`, validates the reference exists, and returns the checks as a JSON array. Each check has: `storyId`, `breakpoint`, `region`, `threshold`.

If the command fails, report the error and pause.

## Step 5: Complete with checks

The `checks` array flows into the `capture` and `compare` stages via the `each: checks` iterables.
```

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/tasks/intake--design-verify.md \
        .agents/skills/designbook/design/tasks/setup-compare.md
git commit -m "feat: design-verify supports both scene and component mode"
```

---

### Task 10: Update scenes-constraints rule and cleanup

**Files:**
- Modify: `.agents/skills/designbook/design/rules/scenes-constraints.md` (line 3)

- [ ] **Step 1: Update scenes-constraints when.steps**

The existing rule has:
```yaml
when:
  steps: [design-shell:create-scene, design-screen:create-scene, design-screen:map-entity]
```

Since `create-scene` is now a single shared step name, update to:
```yaml
when:
  steps: [create-scene, map-entity]
```

This matches both `design-shell:create-scene` and `design-screen:create-scene` since the step name is now just `create-scene` in both workflows. Similarly `map-entity` covers `design-screen:map-entity`.

- [ ] **Step 2: Verify all deleted files are gone**

Run:
```bash
ls -la .agents/skills/designbook/design/tasks/create-scene--design-shell.md \
       .agents/skills/designbook/design/tasks/create-scene--design-screen.md \
       .agents/skills/designbook/design/resources/extract-reference.md 2>&1
```

Expected: all three should report "No such file" (deleted in Tasks 3 and 4).

- [ ] **Step 3: Verify no broken references**

Run a grep to check for references to deleted files:
```bash
grep -r "create-scene--design-shell\|create-scene--design-screen\|resources/extract-reference" .agents/skills/designbook/ --include="*.md" || echo "No broken references found"
```

Expected: `No broken references found`

- [ ] **Step 4: Verify schema $ref paths are valid**

Run a grep to find all `$ref:` lines in task frontmatter and verify the referenced schemas exist:
```bash
grep -r '\$ref:.*schemas\.yml' .agents/skills/designbook/design/tasks/ --include="*.md"
```

Manually verify each referenced schema key (`Component`, `Scene`, `Reference`, `Check`, `Issue`, `EntityMapping`) exists in `.agents/skills/designbook/design/schemas.yml`.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/rules/scenes-constraints.md
git commit -m "feat: update scenes-constraints rule for unified step names"
```

---

### Task 11: Final cross-reference validation

- [ ] **Step 1: Verify workflow stage steps match task when.steps**

For each workflow, verify every step name has a matching task with `when: steps: [<name>]`:

| Workflow | Steps | Expected task match |
|----------|-------|---------------------|
| design-component | `extract-reference`, `intake`, `create-component` | `extract-reference.md`, `intake--design-component.md`, drupal `create-component.md` |
| design-shell | `extract-reference`, `intake`, `create-component`, `create-scene` | `extract-reference.md`, `intake--design-shell.md`, drupal `create-component.md`, `create-scene.md` |
| design-screen | `extract-reference`, `intake`, `create-component`, `create-sample-data`, `map-entity`, `create-scene` | `extract-reference.md`, `intake--design-screen.md`, drupal `create-component.md`, `create-sample-data.md`, `map-entity--design-screen.md`, `create-scene.md` |
| design-verify | `extract-reference`, `intake`, `setup-compare`, `capture`, `compare`, `triage`, `polish`, `outtake` | `extract-reference.md`, `intake--design-verify.md`, `setup-compare.md`, `capture-reference.md`, `compare-screenshots.md`, `triage.md`, `polish.md`, `outtake--design-verify.md` |

Run:
```bash
echo "=== Task when.steps ==="
grep -r "steps:" .agents/skills/designbook/design/tasks/ --include="*.md" -h | head -20
echo "=== Workflow stages ==="
for f in .agents/skills/designbook/design/workflows/design-*.md; do
  echo "--- $f ---"
  sed -n '/^stages:/,/^[a-z]/p' "$f"
done
```

Verify all step names have matching tasks.

- [ ] **Step 2: Verify result keys consumed downstream exist**

Check that result keys produced by intakes (`component`, `output_path`, `entity_mappings`, `section_id`, `section_title`, `reference`, `breakpoints`) are consumed by downstream tasks as params or reads:

- `component[]` -> consumed by `create-component` via `each: component`
- `output_path` -> consumed by `create-scene` via `params.output_path`
- `entity_mappings[]` -> consumed by `map-entity` via `each: entity_mappings`
- `section_id`, `section_title` -> consumed by `create-scene` via params
- `reference[]` -> consumed by `create-scene` and `setup-compare` via params
- `breakpoints[]` -> consumed by `setup-compare` via params

This is a manual check against the task frontmatter. No automated test needed -- just verify the param names match the result keys.

- [ ] **Step 3: Commit (if any fixes were needed)**

```bash
git add -A .agents/skills/
git commit -m "fix: cross-reference validation fixes"
```

If no fixes needed, skip this step.
