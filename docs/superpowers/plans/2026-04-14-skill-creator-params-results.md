# Skill-Creator Params/Results/JSON Schema Update — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the `designbook-skill-creator` skill to document the schema-driven params/results system and replace the OpenSpec-based research flow with Superpowers.

**Architecture:** Six files in `.agents/skills/designbook-skill-creator/` — four updates and two new resources. All changes are documentation (Markdown), no TypeScript code changes.

**Tech Stack:** Markdown skill files with YAML frontmatter

**Spec:** `docs/superpowers/specs/2026-04-14-skill-creator-params-results-design.md`

---

### Task 1: Update `rules/principles.md`

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/rules/principles.md`

- [ ] **Step 1: Replace "Tasks Say WHAT" example**

Replace the `files:` example (lines 13–19) with `result:`:

```yaml
old_string: |
  **Correct:**
  ```markdown
  ---
  params:
    component: ~
  files:
    - $DESIGNBOOK_HOME/components/{{ component }}/{{ component }}.component.yml
  ---
  ```

new_string: |
  **Correct:**
  ```markdown
  ---
  params:
    component: { type: string }
  result:
    component-yml:
      path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
      validators: [data]
  ---
  ```
```

- [ ] **Step 2: Update "Wrong" example to match**

Replace the `params: component: ~` in the Wrong example (lines 24–27):

```yaml
old_string: |
  **Wrong:**
  ```markdown
  ---
  params:
    component: ~
  ---
  Use snake_case for the component name. Create the YAML file with these required fields: ...
  ```

new_string: |
  **Wrong:**
  ```markdown
  ---
  params:
    component: { type: string }
  ---
  Use snake_case for the component name. Create the YAML file with these required fields: ...
  ```
```

- [ ] **Step 3: Add "Results Declare Schema" principle**

Insert after the "Tasks Say WHAT" section (after "Implementation guidance belongs in blueprints..." line 31):

```markdown
## Results Declare Schema, Not Just Paths

Task results are declared in the `result:` frontmatter field with a JSON Schema. Two types:

- **File results** (with `path:`) — files written to disk. Path template supports `$ENV` and `{{ param }}`. Optional `validators:` for semantic validation. Optional JSON Schema type (inline or `$ref`).
- **Data results** (without `path:`) — structured data returned via `--data`. JSON Schema type required (inline or `$ref`).

Both support `$ref` to `schemas.yml` definitions (see [`resources/schemas.md`](../resources/schemas.md)).

```yaml
result:
  component-yml:                              # file result
    path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
    validators: [data]
    $ref: ../schemas.yml#/ComponentYml
  issues:                                     # data result
    type: array
    items:
      $ref: ../schemas.yml#/Issue
```

The schema in frontmatter is the source of truth — the engine validates automatically.

## Tasks Declare Results in Schema, Not in Body

The `result:` schema in frontmatter defines shape and type of all outputs. The task body never explains *how* results are returned (writing files vs. `--data`), but may explain *what* goes into a result when the semantics aren't obvious from the schema type alone.

Use `## Result: <key>` sections in the task body for results that need semantic explanation. Keys whose schema is self-explanatory need no section.

```markdown
---
result:
  issues:
    type: array
    items:
      $ref: ../schemas.yml#/Issue
  scene:
    type: string
---
# Compare Screenshots

Compare each screenshot against its design reference.

## Result: issues

Collect all visual deviations between screenshot and reference.
Each issue needs a `severity`:
- `critical` — layout broken, content missing
- `major` — clearly visible deviation
- `minor` — cosmetic, only noticeable on close inspection
```

No `## Result: scene` needed — the schema type `string` is self-explanatory.
```

- [ ] **Step 4: Update "Stages Flush" section**

Replace `files:` references in the Stages Flush section (lines 139–152):

```yaml
old_string: |
  Consequence: a task file must declare the **final flushed paths** in `files:`, not temporary names. If stage B needs to read a file produced by stage A, it references the flushed name via `reads:`.

  ```markdown
  # Stage A task — produces flushed output
  files:
    - $DESIGNBOOK_HOME/components/{{ component }}/{{ component }}.component.yml

  # Stage B task — reads the flushed output from stage A
  reads:
    - path: $DESIGNBOOK_HOME/components/{{ component }}/{{ component }}.component.yml
      workflow: _debo-design-component
  ```

new_string: |
  Consequence: a task file must declare the **final flushed paths** in `result:`, not temporary names. If stage B needs to read a file produced by stage A, it references the flushed name via `reads:`.

  ```markdown
  # Stage A task — produces flushed output
  result:
    component-yml:
      path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml

  # Stage B task — reads the flushed output from stage A
  reads:
    - path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
  ```
```

- [ ] **Step 5: Expand "Validation Is Automatic"**

Replace the validation section (lines 185–187):

```yaml
old_string: |
  ## Validation Is Automatic

  Validation runs automatically via `workflow validate --task`. Never add validation steps or instructions inside task files.

new_string: |
  ## Validation Is Automatic

  Validation runs automatically when results are written and when tasks complete. Never add validation steps or instructions inside task files.

  Results support semantic `validators:` in addition to JSON Schema validation: `data`, `entity-mapping`, `scene`, `image`, or `cmd:<command>` for arbitrary command validators.
```

- [ ] **Step 6: Verify and commit**

Read the modified file to verify correctness, then:

```bash
git add .agents/skills/designbook-skill-creator/rules/principles.md
git commit -m "docs(skill-creator): update principles — result schema, body conventions, validation"
```

---

### Task 2: Update `rules/structure.md`

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/rules/structure.md`

- [ ] **Step 1: Update Integration Skills file tree**

Replace `*.schema.json` line in the flat structure (line 23):

```yaml
old_string: |
  └── *.schema.json         # JSON Schemas bundled in skill dir (not downloaded)

new_string: |
  └── schemas.yml            # Reusable JSON Schema definitions (PascalCase keys)
```

- [ ] **Step 2: Update Core Skill file tree**

Add `schemas.yml` to the concern-based structure (after line 38 `└── workflows/`):

```yaml
old_string: |
  └── <concern>/
      ├── tasks/            # Shared tasks + workflow-specific (intake--<id>.md)
      ├── rules/            # Concern-level rules
      ├── resources/        # Concern-level reference docs
      └── workflows/        # Workflow definitions (<workflow-id>.md)

new_string: |
  └── <concern>/
      ├── tasks/            # Shared tasks + workflow-specific (intake--<id>.md)
      ├── rules/            # Concern-level rules
      ├── resources/        # Concern-level reference docs
      ├── workflows/        # Workflow definitions (<workflow-id>.md)
      └── schemas.yml       # Concern-level JSON Schema definitions
```

- [ ] **Step 3: Add `schemas.yml` section**

Insert after the Core Skill file tree section (before `## \`tasks/\` — Naming Rule`):

```markdown
## `schemas.yml` — Schema Definitions

Each concern directory (core) or skill root (integration) can contain a `schemas.yml` file with reusable JSON Schema definitions. Tasks, rules, and blueprints reference these via `$ref`.

See [`resources/schemas.md`](../resources/schemas.md) for format conventions and `$ref` syntax.
```

- [ ] **Step 4: Add Schema Extension Fields to `rules/` section**

Insert after the Provider Rules subsection (after line 86 ending with "Constraint rules (without `provides`) use descriptive names as before."):

```markdown
### Schema Extension Fields

Rules can extend the merged result schema of a task. Three operations:

| Field | Effect | Allowed in |
|-------|--------|------------|
| `extends:` | Add new properties (error on duplicates) | Rule, Blueprint |
| `provides:` (object) | Set default values (last writer wins) | Rule, Blueprint |
| `constrains:` | Intersect enum values | Rule only |

```yaml
---
when:
  steps: [create-tokens]
constrains:
  design-tokens:
    properties:
      semantic:
        properties:
          spacing:
            additionalProperties:
              properties:
                $extensions:
                  properties:
                    designbook:
                      properties:
                        renderer: { enum: [margin, padding] }
---
```

**Note:** `provides: <param>` (string — Provider Rule) and `provides:` (object — Schema Defaults) are different concepts. Provider Rules resolve workflow params; schema `provides:` sets default values on result properties.

See [`resources/schema-composition.md`](../resources/schema-composition.md) for the full merge model.
```

- [ ] **Step 5: Add Schema Extension Fields to `blueprints/` section**

Replace the current blueprints section (lines 89–97):

```yaml
old_string: |
  ## `blueprints/` — When Conditions

  Same `when` matching as rules. Use `when.steps` to scope to a specific creation stage.

  ```markdown
  ---
  when:
    steps: [create-component]
  ---
  ```

new_string: |
  ## `blueprints/` — When Conditions

  Same `when` matching as rules. Use `when.steps` to scope to a specific creation stage.

  ```markdown
  ---
  when:
    steps: [create-component]
  ---
  ```

  ### Schema Extension Fields

  Blueprints support `extends:` and `provides:` (object form) to contribute to the merged result schema. **`constrains:` is forbidden in blueprints** — only rules may constrain enum values.
```

- [ ] **Step 6: Verify and commit**

Read the modified file to verify correctness, then:

```bash
git add .agents/skills/designbook-skill-creator/rules/structure.md
git commit -m "docs(skill-creator): update structure — schemas.yml, extension fields"
```

---

### Task 3: Create `resources/schemas.md`

**Files:**
- Create: `.agents/skills/designbook-skill-creator/resources/schemas.md`

- [ ] **Step 1: Write the file**

```markdown
---
name: schemas
description: Reference for schemas.yml format, $ref syntax, and result conventions in task bodies
---

# Schema Definitions & Result Conventions

## `schemas.yml` Format

Each concern directory (core skill) or skill root (integration skill) can contain a `schemas.yml` file with reusable JSON Schema definitions.

### Placement

```
# Core skill — per concern
.agents/skills/designbook/<concern>/schemas.yml

# Integration skill — skill root
.agents/skills/designbook-drupal/schemas.yml
.agents/skills/designbook-drupal/components/schemas.yml   # sub-concern
```

### Format Conventions

- **Keys are PascalCase** — `Component`, `Issue`, `StoryYml` (not `component`, `issue`, `story-yml`)
- **Values are standard JSON Schema** (draft-07)
- **Each top-level key is a standalone type** — no nesting of types within types

```yaml
# .agents/skills/designbook/design/schemas.yml

Component:
  type: object
  required: [component, group]
  properties:
    component: { type: string }
    slots:
      type: array
      items: { type: string }
      default: []
    group: { type: string }
    description: { type: string }

Issue:
  type: object
  required: [severity, description]
  properties:
    severity: { type: string, enum: [critical, major, minor] }
    description: { type: string }
```

## `$ref` Syntax

Task, rule, and blueprint frontmatter reference schema types via `$ref`:

```yaml
$ref: ../schemas.yml#/TypeName
```

- **Path** — relative to the referencing file
- **Fragment** (`#/TypeName`) — selects a PascalCase key from the schemas file
- **Resolution** — all `$ref` values are resolved and inlined at `workflow create` time. Unresolvable references cause a hard error.

### Cross-Skill References

```yaml
$ref: designbook-drupal/components/schemas.yml#/ComponentYml
```

Cross-skill paths are resolved relative to the `.agents/skills/` root.

### `$ref` in `params:`

A top-level `$ref` in `params:` resolves a schema and uses its `properties` as param declarations. Explicit sibling entries override or extend the resolved properties:

```yaml
params:
  $ref: ../schemas.yml#/Section       # Section.properties become params
  order: { type: integer, default: 1 } # override: add default to existing property
  scene: { type: string }              # extend: add param not in schema
```

The `$ref` must point to an object schema with `properties`.

## `result:` Declarations

Task frontmatter declares all outputs in the `result:` field. Each key is a stable identifier.

### File Results (with `path:`)

Files written to disk. The engine auto-collects them from declared paths on `workflow done`.

```yaml
result:
  component-yml:
    path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
    validators: [data]
    $ref: ../schemas.yml#/ComponentYml
```

- `path:` — template with `$ENV` vars and `{{ param }}` substitution (resolved at plan time)
- `validators:` — semantic validators: `data`, `entity-mapping`, `scene`, `image`, `cmd:<command>`
- JSON Schema (inline or `$ref`) — optional, for structural validation

### Data Results (without `path:`)

Structured data returned via `--data` on `workflow done`. Flow into workflow scope at stage completion.

```yaml
result:
  issues:
    type: array
    items:
      $ref: ../schemas.yml#/Issue
  scene:
    type: string
    title: Scene
```

- JSON Schema type required (inline or `$ref`)
- `title:` — optional human-readable label
- `description:` — optional semantic help text
- `default:` — auto-filled if not provided on `workflow done`

### Validators

Semantic validators run in addition to JSON Schema validation:

| Validator | Purpose |
|-----------|---------|
| `data` | Generic JSON Schema validation |
| `entity-mapping` | Validates entity mapping structures |
| `scene` | Validates scene/story metadata |
| `image` | Validates image files |
| `cmd:<command>` | Arbitrary command validator |

Validation runs automatically on write and on `workflow done`. Empty `validators:` = auto-pass.

## Task Body Convention: `## Result: <key>`

When a result's semantics aren't obvious from the schema type alone, use a `## Result: <key>` section in the task body:

```markdown
---
params:
  scene: { type: string }
result:
  issues:
    type: array
    items:
      $ref: ../schemas.yml#/Issue
  scene:
    type: string
---
# Compare Screenshots

Compare each screenshot against its design reference.

## Result: issues

Collect all visual deviations between screenshot and reference.
Each issue needs a `severity`:
- `critical` — layout broken, content missing
- `major` — clearly visible deviation
- `minor` — cosmetic, only noticeable on close inspection
```

**Rules:**
- Each result key that needs semantic explanation gets its own `## Result: <key>` section
- Explains *what* goes into the result, never *how* it's returned (file write vs. `--data`)
- Keys whose schema type is self-explanatory need no section (e.g. `scene: { type: string }`)

## `each:` — Iteration Declaration

Tasks declare iteration over scope arrays via `each:` in frontmatter:

```yaml
each:
  component:
    $ref: ../schemas.yml#/Component
```

The engine expands one task instance per item in the scope array. Scope is populated when the preceding stage completes and its data results are collected.

- Keys reference scope entries from completed stages
- Values are JSON Schema (inline or `$ref`) describing the expected item shape
```

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook-skill-creator/resources/schemas.md
git commit -m "docs(skill-creator): add schemas.md — format, ref syntax, result conventions"
```

---

### Task 4: Create `resources/schema-composition.md`

**Files:**
- Create: `.agents/skills/designbook-skill-creator/resources/schema-composition.md`

- [ ] **Step 1: Write the file**

```markdown
---
name: schema-composition
description: Deep-dive into the schema merge model — how task, blueprint, and rule schemas compose into a merged result schema
---

# Schema Composition

## Concept

A task's result schema is never just what the task declares. The engine merges contributions from the task, its matched blueprints, and its matched rules into a **merged schema**. This merged schema is the single source of truth for validation.

## The Three Operations

| Operation | Effect | Allowed in |
|-----------|--------|------------|
| `extends:` | Add new properties to the schema | Blueprint, Rule |
| `provides:` | Set default values for existing properties | Blueprint, Rule |
| `constrains:` | Intersect enum values to narrow allowed options | **Rule only** |

Blueprints **must not** use `constrains:` — only rules may constrain. This ensures blueprints remain overridable while rules enforce hard limits.

## Syntax

Declare extension fields in blueprint or rule frontmatter, keyed by result name:

### `extends:` — Add New Properties

```yaml
---
when:
  steps: [create-tokens]
  extensions: stitch
extends:
  design-tokens:
    properties:
      primitive:
        properties:
          color: { type: object, title: Imported Stitch Colors }
      semantic:
        properties:
          color: { type: object, title: Imported Stitch Semantic Colors }
---
```

Error if a property already exists in the base schema. Use `provides:` to modify existing properties.

### `provides:` — Set Defaults

```yaml
---
when:
  steps: [create-data-model]
provides:
  data-model:
    properties:
      content:
        additionalProperties:
          additionalProperties:
            properties:
              fields:
                additionalProperties:
                  properties:
                    sample_template: { type: object }
---
```

Last writer wins — if multiple rules/blueprints provide defaults for the same property, the last one applied takes precedence (rules override blueprints).

### `constrains:` — Narrow Enum Values

```yaml
---
when:
  steps: [create-tokens]
constrains:
  design-tokens:
    properties:
      semantic:
        properties:
          spacing:
            additionalProperties:
              properties:
                $extensions:
                  properties:
                    designbook:
                      properties:
                        renderer: { enum: [margin, padding] }
---
```

The engine intersects the declared enum with the base schema's enum. Only values present in **both** survive. If the intersection is empty, validation will reject all values.

## Merge Order

```
Phase 1: Base Task Schema        (result: in task frontmatter)
Phase 2: Blueprint extends:      (new properties from blueprints)
Phase 3: Rule extends:           (new properties from rules)
Phase 4: Blueprint provides:     (defaults from blueprints)
Phase 5: Rule provides:          (defaults from rules — override blueprint defaults)
Phase 6: Rule constrains:        (enum narrowing — rules only)
```

**Why this order:**
- Blueprints extend first, then rules — so rules can see all properties
- Rules provide after blueprints — so rule defaults override blueprint defaults
- Constraints come last — they narrow what's already defined

## `$ref` in Extension Fields

`$ref` is supported within `extends:`, `provides:`, and `constrains:`:

```yaml
extends:
  design-tokens:
    $ref: ../schemas.yml#/StitchTokenExtension
```

References are resolved at `workflow create` time, same as in task frontmatter.

## Example: Full Merge

**Base task** (`tasks/create-tokens.md`):
```yaml
result:
  design-tokens:
    path: $DESIGNBOOK_DATA/design-tokens.yml
    type: object
    properties:
      primitive: { type: object }
      semantic: { type: object }
```

**Blueprint extends** (`blueprints/stitch-tokens.md`):
```yaml
extends:
  design-tokens:
    properties:
      primitive:
        properties:
          color: { type: object, title: Imported Stitch Colors }
```

**Rule constrains** (`rules/renderer-hints.md`):
```yaml
constrains:
  design-tokens:
    properties:
      semantic:
        properties:
          spacing:
            additionalProperties:
              properties:
                $extensions:
                  properties:
                    designbook:
                      properties:
                        renderer: { enum: [margin, padding] }
```

**Merged result:** The `design-tokens` schema now includes `primitive.color` from the blueprint, and `semantic.spacing.*.renderer` is constrained to `[margin, padding]` by the rule.
```

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook-skill-creator/resources/schema-composition.md
git commit -m "docs(skill-creator): add schema-composition.md — merge model deep-dive"
```

---

### Task 5: Rewrite `resources/research.md`

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/resources/research.md`

- [ ] **Step 1: Replace entire file content**

Keep the frontmatter name, update description. Replace the body:

```markdown
---
name: research
description: Post-workflow review using Superpowers — audit loaded skill files, then fix via brainstorming and planning
---

# Research Flag

## What It Does

`--research` switches a `_debo` command into **research mode**. The workflow runs normally first. Afterwards, a structured audit reviews all loaded skill files against the 4-level model, then fixes are planned and implemented via Superpowers.

## Process

### Step 1 — Execute the workflow normally

The workflow runs as usual — all stages, tasks, rules, blueprints apply. The output is produced.

### Step 2 — Discover what was loaded

Read the archived workflow from `workflows/archive/<workflow-name>/tasks.yml`. The resolved entries contain the task files, rules, blueprints, and config instructions involved in this run.

### Step 3 — Audit every loaded file

Read every file that was loaded during the run and verify each one against the skill model principles. This is a systematic audit — do not skip files.

For **each file**, check:

#### 3a. Type correctness

| File type | Must contain | Must NOT contain |
|-----------|-------------|-----------------|
| **Task** | Output declarations (`result:`, `params:`, `reads:`) | Style guidance, implementation details, framework-specific logic |
| **Rule** | Hard constraints, `when:` conditions, optional `extends:`/`provides:`/`constrains:` | Overridable suggestions, examples that could vary by integration |
| **Blueprint** | Overridable starting points, optional `extends:`/`provides:` | `constrains:`, absolute constraints that should be rules |

#### 3b. Domain responsibility

- **Core skill files** (`designbook/`) — Must be integration-agnostic. Flag if they contain framework-specific logic.
- **Integration skill files** — Must handle their specific concern. Flag if they duplicate core logic or reach into another integration's domain.
- **Cross-cutting references** — If a core task references external data, verify that the responsible integration skill has a matching rule loaded.

#### 3c. Loading correctness

- Were all relevant integration rules loaded? Cross-reference `when:` conditions against the active config.
- Were rules that **should** have been loaded actually loaded?
- Were rules loaded that **shouldn't** have been? (wrong `when` scope, outdated step names)

#### 3d. Duplication

- **Cross-file** — Do two files describe the same constraint or mapping?
- **Cross-layer** — Does a task repeat what a rule already enforces?
- **Cross-skill** — Do two integration skills handle the same concern?

#### 3e. Content coherence

- Does the file reference CLI commands or params that exist?
- Does it describe manual steps that the CLI handles automatically?
- Are `when.steps` values current? (no stale step names)
- Do `result:` schemas match the actual outputs being produced?

Output the audit as a table:

```
| File | Type | Domain | Issues |
|------|------|--------|--------|
| intake--tokens.md | task | core | ⚠ Missing `## Result:` section for data result |
| renderer-hints.md | rule | core | ✓ OK |
```

### Step 4 — Review with user

Present the audit table, then ask:

```
→ Was the output correct?
→ Was something missing or wrong?
→ Do the audit findings match your experience?
```

### Step 5 — Fix via Superpowers

Based on feedback:

1. **Analyze** — Use `superpowers:brainstorming` to work through what needs to change and design the fix
2. **Plan** — Use `superpowers:writing-plans` to create an implementation plan for the skill changes
3. **Implement** — Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to apply the changes

### Step 6 — Verify

After implementing fixes, verify via test workspace:

1. **Set up workspace** — `./scripts/setup-workspace.sh <name>` (creates or rebuilds from scratch)
2. **Re-run the workflow** — `/designbook <workflow> --research`
3. **Confirm zero friction** — the research pass should report no issues
4. **Use** `superpowers:verification-before-completion` before committing

Skill files are symlinked from the repo root — fixes are available immediately without rebuilding the workspace. Re-run `setup-workspace.sh` only to reset generated pipeline data.
```

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook-skill-creator/resources/research.md
git commit -m "docs(skill-creator): rewrite research.md — superpowers-based, no OpenSpec"
```

---

### Task 6: Update `SKILL.md`

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/SKILL.md`

- [ ] **Step 1: Update Key Principles bullet**

Replace the tasks bullet (line 55):

```yaml
old_string: |
  - **Tasks say WHAT, never HOW** — task files declare output files and params; never contain style or implementation instructions

new_string: |
  - **Tasks say WHAT, never HOW** — task files declare result schemas and params; never contain style or implementation instructions
  - **Results declare schema** — file results with `path:`, data results with JSON Schema; `$ref` to `schemas.yml`
```

- [ ] **Step 2: Add Schema Reference section**

Insert before the `## Skill Map` section (before line 63):

```markdown
## Schema Reference

See [`resources/schemas.md`](resources/schemas.md) for `schemas.yml` format, `$ref` syntax, and result conventions.

See [`resources/schema-composition.md`](resources/schema-composition.md) for the schema merge model (extends/provides/constrains).
```

- [ ] **Step 3: Update Research Flag description**

Replace the Research Flag section (lines 67–69):

```yaml
old_string: |
  ## Research Flag

  See [`resources/research.md`](resources/research.md) for the `--research` flag convention.

new_string: |
  ## Research Flag

  See [`resources/research.md`](resources/research.md) for the `--research` post-workflow review (Superpowers-based).
```

- [ ] **Step 4: Verify and commit**

Read the modified file to verify correctness, then:

```bash
git add .agents/skills/designbook-skill-creator/SKILL.md
git commit -m "docs(skill-creator): update SKILL.md — schema references, research description"
```
