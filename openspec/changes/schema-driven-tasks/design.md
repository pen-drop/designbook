## Overview

The result schema declared in task frontmatter becomes the single source of truth for three concerns: **what to ask**, **how to validate**, and **how to serialize**. Task files contain only domain context — no CLI commands, no `$TASK_ID`, no `workflow result` calls. Rules extend schemas declaratively. The engine handles all lifecycle mechanics.

## Core Model

### Result Schema as Contract

Every task declares `result:` in its frontmatter. Each result key is a JSON Schema object with optional `path:` and `title:`.

```yaml
result:
  vision:
    path: $DESIGNBOOK_DATA/vision.md
    type: object
    required: [product_name, description]
    properties:
      product_name:
        type: string
        title: Product Name
      description:
        type: string
        title: Description
      features:
        type: array
        title: Key Features
        default: []
        items: { type: string }
```

The schema serves three purposes:

| Purpose | Mechanism |
|---------|-----------|
| **Questioning** | Missing required properties without defaults → AI asks. `title` guides the question. Task description provides *how* to ask. |
| **Validation** | `type`, `enum`, `required`, `items`, `$ref` — validated by ajv at `workflow done` time. |
| **Serialization** | `path:` extension determines format. `title` becomes heading for `.md`. `template:` overrides convention. |

### Serialization by Extension

When `workflow done` is called with `--data`, the engine serializes each result that has a `path:`:

| Extension | Serialization |
|-----------|--------------|
| `.yml` / `.yaml` | `yaml.dump(data)` — 1:1 mapping |
| `.json` | `JSON.stringify(data, null, 2)` |
| `.md` | Convention-based flattening OR `template:` if declared |

Results without `path:` are data-only — they flow into the workflow scope at stage completion.

### Markdown Flattening Convention

When no `template:` is declared, the engine walks the schema `properties` in order:

```
Property Type             Markdown Output
─────────────────────────────────────────────────────
string (first)            # {value}              (h1)
string                    ## {title}\n{value}    (h2 + body)
array<string>             ## {title}\n- item\n   (h2 + list)
array<object>             ## {title}\n### {.title}\n{.rest}
object                    ## {title}\n{recurse}
null / undefined          (omitted)
```

The first required string property becomes the h1 heading. All others become h2 sections. Nested objects recurse one level deeper (h3, h4).

**Example**: Vision schema flattens to:

```
{ product_name: "PetShop", description: "...", problems: [{title,solution}], features: ["A","B"] }

→

# PetShop

## Description
...

## Problems & Solutions
### Finding pets
AI-powered matching

## Key Features
- A
- B
```

Properties with `default: null` or absent values are omitted entirely (no empty sections).

### Template Override

For cases where convention isn't sufficient, `template:` provides explicit control:

```yaml
result:
  vision:
    path: $DESIGNBOOK_DATA/vision.md
    template: |
      # {{ product_name }}

      ## Description
      {{ description }}

      {{#if problems}}
      ## Problems & Solutions
      {{#each problems}}
      ### {{ title }}
      {{ solution }}
      {{/each}}
      {{/if}}
```

Template syntax: Mustache-like (`{{ prop }}`, `{{#each}}`, `{{#if}}`). Kept simple — no expressions, no filters.

Rules can append to templates via `template-append:` (see Rule Composition).

---

## Schema Composition

Rules and blueprints extend the task's result schema through **two channels**: declarative frontmatter (engine-merged, static) and prose instructions (AI-executed, dynamic).

### Static: Schema Patches (Engine-Merged)

Three declarative mechanisms in rule/blueprint frontmatter. The engine merges them into the result schema at resolution time.

#### `extends:` — Add Structure

Adds new properties to the result schema. Used by framework blueprints to define role structures (e.g., Tailwind color roles) and by integration rules to add framework-specific fields.

```yaml
# Blueprint: designbook-css-tailwind/blueprints/css-naming.md
---
when:
  frameworks.css: tailwind
  steps: [create-tokens]
extends:
  design-tokens:
    properties:
      semantic:
        properties:
          color:
            required: [primary, secondary, accent, neutral]
            properties:
              primary: { $ref: "tokens/schemas.yml#/W3cToken" }
              secondary: { $ref: "tokens/schemas.yml#/W3cToken" }
              accent: { $ref: "tokens/schemas.yml#/W3cToken" }
              neutral: { $ref: "tokens/schemas.yml#/W3cToken" }
---
```

#### `provides:` — Supply Defaults

Supplies default values so the AI doesn't need to ask. Used by component blueprints for `required_tokens` and by integration rules for pre-computed values.

```yaml
# Blueprint: designbook-drupal/components/blueprints/container.md
---
when:
  steps: [create-tokens]
provides:
  design-tokens:
    properties:
      component:
        properties:
          container:
            default:
              max-width:
                sm: { $value: "640px", $type: dimension }
                md: { $value: "768px", $type: dimension }
                lg: { $value: "1024px", $type: dimension }
---
```

#### `constrains:` — Restrict Values

Narrows allowed values for existing properties.

```yaml
# Rule: stitch-reference-type.md
---
when:
  steps: [design-verify:intake]
constrains:
  reference:
    items:
      properties:
        type:
          enum: [stitch, url, image]
---
```

### Dynamic: Prose Instructions (AI-Executed)

Not everything can be expressed as schema patches. Dynamic suggestions, MCP tool calls, and context-dependent logic remain as **prose in the rule body**. The AI reads the prose and acts on it — the engine doesn't need to understand it.

The `provides:` field in rule frontmatter serves double duty:
- **With a schema patch** (object value): engine merges it into the schema
- **With a property signal** (string value): tells the AI "read this rule before asking for this property"

```yaml
# Rule: provide-stitch-url.md — DYNAMIC (prose + signal)
---
provides: reference.url          # ← signal: "I help fill this property"
when:
  steps: [design-verify:intake]
  extensions: stitch
---

# Resolve Stitch URL

When a reference has origin: stitch, call mcp__stitch__get_screen
to resolve the screen ID to a preview URL...
```

```yaml
# Rule: stitch-import.md — DYNAMIC (prose)
---
when:
  steps: [import:intake]
  extensions: stitch
---

# Stitch Import

Call mcp__stitch__list_projects, present available screens
to the user as options for design_reference...
```

The AI sees the merged schema (knows `design_reference` exists and is optional), reads the rule prose (knows to call Stitch MCP first), then presents the user with options. No special engine mechanism needed — the AI's intelligence IS the resolver.

### What Goes Where

```
STATIC (engine-merged)              DYNAMIC (AI-executed)
──────────────────────              ─────────────────────
extends:  structure                 MCP tool calls
provides: defaults (object)         Suggestions from external APIs  
constrains: enums/patterns          Context-dependent decisions
                                    User interaction nuance
Validation: YES                     Validation: NO (prose is guidance)
Serialization: YES                  Serialization: NO
```

### Merge Order

```
1. Base task schema (from task frontmatter)
2. + extends: from each blueprint (add structure — sub-schemas, roles)
3. + extends: from each rule (add properties — integration-specific fields)
4. + provides: from each blueprint (supply component defaults)
5. + provides: from each rule (supply static defaults)
6. + constrains: from each rule (add enums, patterns, min/max)
7. = Merged schema (persisted in tasks.yml)
```

Blueprints merge before rules — they define the structural skeleton that rules then constrain or fill. Conflicts: later entries win for `provides:` defaults. For `extends:`, duplicate property names error at resolution time. For `constrains:`, enums intersect (narrowest wins).

### Schema Consistency Guarantee

The merged schema is computed once at task resolution time and used everywhere:

```
workflow create / workflow instructions
    │
    ├── 1. Load task frontmatter (base schema)
    ├── 2. Load blueprints → merge extends: / provides:
    ├── 3. Load rules → merge extends: / provides: / constrains:
    ├── 4. Store merged schema in tasks.yml (per task)
    │
    ▼
┌───────────────────────────────────────────────────┐
│              MERGED SCHEMA (persisted)             │
├───────────────────────────────────────────────────┤
│                                                   │
│  Used by AI:                                      │
│    workflow instructions returns merged schema     │
│    → AI sees ALL required roles (e.g. primary)    │
│    → AI sees ALL defaults (e.g. container tokens) │
│    → AI sees ALL constraints (e.g. enums)         │
│    → AI knows exactly what to ask and what to fill│
│                                                   │
│  Used by Engine:                                  │
│    workflow done validates against merged schema   │
│    → same schema the AI worked with               │
│    → if AI filled primary, engine expects primary │
│    → if blueprint provided container defaults,    │
│      engine validates container structure          │
│                                                   │
└───────────────────────────────────────────────────┘
```

**Critical invariant**: The schema the AI sees via `workflow instructions` and the schema the engine validates against at `workflow done` are **the same object**. Both are read from the persisted merged schema in `tasks.yml`. This means:

- If a Tailwind blueprint adds `semantic.color.primary` as required, the AI is told to collect it AND the engine rejects results without it.
- If a component blueprint provides `container.max-width` defaults, the AI knows it doesn't need to ask AND the engine accepts the defaults.
- If a rule constrains `reference.type` to `enum: [stitch, url, image]`, the AI presents those options AND the engine rejects anything else.

There is no scenario where the AI and engine disagree on what the schema expects.

### `workflow instructions` Response

The response includes the merged schema alongside task file paths:

```json
{
  "stage": "create-tokens",
  "task_file": "/abs/path/create-tokens.md",
  "rules": ["/abs/path/renderer-hints.md"],
  "blueprints": ["/abs/path/css-naming.md", "/abs/path/container.md"],
  "merged_schema": {
    "design-tokens": {
      "path": "$DESIGNBOOK_DATA/design-system/design-tokens.yml",
      "type": "object",
      "required": ["primitive", "semantic"],
      "properties": {
        "primitive": { "type": "object" },
        "semantic": {
          "type": "object",
          "properties": {
            "color": {
              "required": ["primary", "secondary", "accent", "neutral"],
              "properties": {
                "primary": { "$value": "string", "$type": "string" },
                "secondary": { "$value": "string", "$type": "string" }
              }
            }
          }
        },
        "component": {
          "type": "object",
          "properties": {
            "container": {
              "default": { "max-width": { "sm": {"$value":"640px"}, "md": {"$value":"768px"} } }
            }
          }
        }
      }
    }
  }
}
```

The AI reads:
- `task_file` — for domain context (how to ask, what to consider)
- `rules` / `blueprints` — for prose instructions (naming conventions, constraints)
- `merged_schema` — for the complete contract (what to fill, what's required, what has defaults)

The AI does NOT need to manually merge schemas from rules/blueprints. The engine already did that.

---

## Schema Layering: Base Schema vs. Sub-Schemas

Some result schemas have a universal base format where the inner structure varies by integration. The canonical example is design tokens.

### Three-Layer Schema Model

```
Layer 1: BASE SCHEMA (universal, from core skill)
  W3C Design Token format — every leaf has $value and $type.
  Hierarchy: primitive → semantic → component.
  Defined in: tokens/schemas.yml

Layer 2: FRAMEWORK SUB-SCHEMA (from CSS framework blueprint)
  What roles and groups exist within the token hierarchy.
  Tailwind: primary, secondary, accent, neutral (colors); heading, body, mono (typography)
  Bootstrap: primary, secondary, success, danger, warning, info (colors)
  Defined in: css-framework blueprint via extends:

Layer 3: COMPONENT DEFAULTS (from component blueprints)
  Concrete default values for the component token layer.
  container.max-width: { sm: 640px, md: 768px, lg: 1024px }
  Defined in: component blueprint via provides: (today: required_tokens)
```

### How It Composes

The **core skill** declares only the W3C base schema:

```yaml
# tokens/tasks/create-tokens.md (core skill)
result:
  design-tokens:
    path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    type: object
    required: [primitive, semantic]
    properties:
      primitive: { type: object }
      semantic: { type: object }
      component: { type: object, default: {} }
```

The core skill does NOT know about `primary`, `secondary`, or any framework-specific roles. Those come from the CSS framework blueprint:

```yaml
# designbook-css-tailwind/blueprints/css-naming.md
---
type: css-naming
when:
  frameworks.css: tailwind
  steps: [create-tokens]
extends:
  design-tokens:
    properties:
      semantic:
        properties:
          color:
            type: object
            required: [primary, secondary, accent, neutral]
            properties:
              primary: { $ref: "tokens/schemas.yml#/W3cToken" }
              secondary: { $ref: "tokens/schemas.yml#/W3cToken" }
              accent: { $ref: "tokens/schemas.yml#/W3cToken" }
              neutral: { $ref: "tokens/schemas.yml#/W3cToken" }
          typography:
            type: object
            required: [heading, body]
            properties:
              heading: { $ref: "tokens/schemas.yml#/W3cToken" }
              body: { $ref: "tokens/schemas.yml#/W3cToken" }
              mono: { $ref: "tokens/schemas.yml#/W3cToken" }
---

# Tailwind Token Naming Rules

(Prose: palette construction, CSS variable namespaces, naming conventions)
```

A Bootstrap blueprint would define different roles:

```yaml
# designbook-css-bootstrap/blueprints/css-naming.md
extends:
  design-tokens:
    properties:
      semantic:
        properties:
          color:
            required: [primary, secondary, success, danger, warning, info]
            properties:
              primary: { $ref: "tokens/schemas.yml#/W3cToken" }
              success: { $ref: "tokens/schemas.yml#/W3cToken" }
              danger: { $ref: "tokens/schemas.yml#/W3cToken" }
              # ...
```

Component blueprints then fill the component layer with defaults:

```yaml
# designbook-drupal/components/blueprints/container.md
---
type: component
when:
  steps: [create-tokens]
provides:
  design-tokens:
    properties:
      component:
        properties:
          container:
            default:
              max-width:
                sm: { $value: "640px", $type: dimension }
                md: { $value: "768px", $type: dimension }
                lg: { $value: "1024px", $type: dimension }
                xl: { $value: "1280px", $type: dimension }
---
```

### Merged Result for Tailwind + Drupal

After resolution, the AI sees one merged schema:

```yaml
design-tokens:
  path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
  type: object
  required: [primitive, semantic]
  properties:
    primitive: { type: object }
    semantic:
      type: object
      properties:
        color:
          required: [primary, secondary, accent, neutral]  # ← from Tailwind
          properties:
            primary: { $value: string, $type: string }
            secondary: { $value: string, $type: string }
            # ...
        typography:
          required: [heading, body]                         # ← from Tailwind
          properties:
            heading: { $value: string, $type: string }
            # ...
    component:
      type: object
      default: {}
      properties:
        container:                                          # ← from container blueprint
          default: { max-width: { sm: ..., md: ..., lg: ..., xl: ... } }
        grid:                                               # ← from grid blueprint
          default: { gap: { md: ..., lg: ... } }
```

The AI doesn't know or care that `primary` came from Tailwind and `container` defaults came from a Drupal blueprint. It sees one schema and fills it.

### Migration: `required_tokens` → `provides:`

Today, component blueprints declare `required_tokens:` in their frontmatter. The AI reads these manually during the token task. In the new model, `required_tokens:` is replaced by `provides:` — the engine merges them automatically:

| Today | After |
|-------|-------|
| `required_tokens:` in blueprint frontmatter | `provides:` in blueprint frontmatter |
| AI reads blueprint, manually merges tokens | Engine merges at resolution time |
| AI decides what to ask | Engine knows what's missing from merged schema |
| AI writes result via CLI | Engine serializes from `--data` |

---

## `workflow done --data`

Replaces multiple `workflow result --key --json` calls with a single JSON blob:

```bash
_debo workflow done --task $TASK_ID --data '{
  "scene": "shell",
  "reference": [],
  "breakpoints": []
}'
```

Engine behavior:
1. Parse `--data` JSON
2. Match keys against declared `result:` entries
3. For each key with `path:` → serialize to file (by extension)
4. For each key without `path:` → store as data result
5. Validate all results against merged schema
6. If valid → mark task done, stage transition
7. If invalid → return errors, task stays in-progress

### Implicit File Collection

For file results where the AI writes the file directly (e.g., via Write tool or Playwright), `workflow done` without `--data` auto-detects:

```
For each result key with path:
  resolved_path = resolve(path, params)
  if file exists at resolved_path:
    register as file result
    validate content against schema
```

This means the AI can write a YAML file to `$DESIGNBOOK_DATA/design-tokens.yml` using the Write tool, then call `workflow done` — the engine finds the file and validates it.

---

## Intake+Create Merge

### Which Workflows Change

Two-stage workflows where intake gathers data and create writes a single file collapse to one stage:

| Workflow | Today | After |
|----------|-------|-------|
| vision | `intake` → `create-vision` | `create-vision` (single stage) |
| tokens | `intake` → `create-tokens` | `create-tokens` (single stage) |
| data-model | `intake` → `create-data-model` | `create-data-model` (single stage) |
| sample-data | `intake` → `create-sample-data` | `create-sample-data` (single stage) |
| sections | `intake` → `create-section` | `create-section` (single stage, keeps `each:`) |
| shape-section | `intake` → `create-section` | `create-section` (single stage) |

### Which Workflows Don't Change Structure

Multi-stage workflows keep their stages — the change only removes CLI commands from task files:

| Workflow | Stages | Reason |
|----------|--------|--------|
| design-screen | 9 stages | Complex data flow, each: expansion, subworkflows |
| design-shell | 9 stages | Same |
| design-verify | 7 stages | Same |
| design-component | 3 stages | Component + test stages |
| css-generate | 5 stages | Pipeline: prepare → generate → transform → index |
| import | 2 stages | intake → `each: workflow` sub-dispatch (cannot merge) |

### What Happens to Intake Tasks

For merged workflows, the intake task is **absorbed** into the create task:

- `reads:` from intake → moves to create task's `reads:`
- Dialog instructions from intake → moves to create task description (or becomes implicit from schema)
- `params:` from intake → becomes part of `result:` schema (the fields to collect)

For multi-stage workflows, intake tasks remain but lose CLI commands. They use `result:` with data-only keys and `workflow done --data`.

---

## Task File Changes — Complete Inventory

### Vision Concern

#### `create-vision.md` (absorbs `intake--vision.md`)

**Before** (2 files):
```yaml
# intake--vision.md
---
when: { steps: [vision:intake] }
reads:
  - path: $DESIGNBOOK_DATA/vision.md
    optional: true
---
# Prose: extract fields, ask missing

# create-vision.md  
---
when: { steps: [create-vision] }
params:
  product_name: { type: string }
  description: { type: string }
  ...
result:
  vision:
    path: $DESIGNBOOK_DATA/vision.md
---
# Prose: write MD via `workflow result --task $TASK_ID --key vision`
```

**After** (1 file):
```yaml
# create-vision.md
---
when: { steps: [create-vision] }
reads:
  - path: $DESIGNBOOK_DATA/vision.md
    optional: true
result:
  vision:
    path: $DESIGNBOOK_DATA/vision.md
    type: object
    required: [product_name, description]
    properties:
      product_name: { type: string, title: Product Name }
      description: { type: string, title: Description }
      problems:
        type: array
        title: Problems & Solutions
        default: []
        items:
          type: object
          properties:
            title: { type: string }
            solution: { type: string }
      features:
        type: array
        title: Key Features
        default: []
        items: { type: string }
      design_reference:
        type: object
        title: Design Reference
        default: null
        properties:
          type: { type: string }
          url: { type: string }
          label: { type: string }
      references:
        type: array
        title: References
        default: []
        items:
          type: object
          properties:
            type: { type: string }
            url: { type: string }
            label: { type: string }
---

# Product Vision

Define the product vision through dialog. Extract fields from the user's message.
If all required fields are present, no questions needed.
If fields are missing, ask for all missing in a single question.

- Design Reference and References are optional — only if user provides them
- If vision.md exists, use as starting point
```

**Deleted**: `intake--vision.md`

**Workflow change**: `vision.md` → single stage `create-vision`

**Rule changes**:
- `vision-format.md`: absorbed into schema (the `title:` fields ARE the format). Rule can be deleted or reduced to the one constraint "h1 heading is required for Storybook parsing".
- `vision-context.md`: unchanged — still bound to other steps that need vision as context.

---

### Tokens Concern

#### `create-tokens.md` (absorbs `intake--tokens.md`)

**Before** (2 files):
```yaml
# intake--tokens.md
---
when: { steps: [tokens:intake] }
reads:
  - path: $DESIGNBOOK_DATA/vision.md
    workflow: /debo-vision
  - path: $STORY_DIR/design-reference.md
    optional: true
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---
# Prose: 7-step dialog (colors, typography, blueprints, etc.)

# create-tokens.md
---
when: { steps: [create-tokens] }
params:
  intake: { type: object }
result:
  design-tokens:
    path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
---
# Prose: write W3C YAML via `workflow result`
```

**After** (1 file):
```yaml
# create-tokens.md
---
when: { steps: [create-tokens] }
reads:
  - path: $DESIGNBOOK_DATA/vision.md
    workflow: /debo-vision
  - path: $STORY_DIR/design-reference.md
    optional: true
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
result:
  design-tokens:
    path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    type: object
    required: [primitive, semantic]
    properties:
      primitive:
        type: object
        title: Primitive Tokens
      semantic:
        type: object
        title: Semantic Tokens
      component:
        type: object
        title: Component Tokens
        default: {}
---

# Design Tokens

Guide the user through choosing colors and typography. Result is W3C Design Token YAML.

## Gathering

1. Extract design reference from vision.md (if available)
2. Present fonts and colors as starting point
3. Let user confirm or adjust colors → primitive.color.*
4. Let user confirm or adjust typography → primitive + semantic typography
5. Check layout blueprints for required_tokens → component.*
6. Optional additional groups (breakpoints, spacing, shadows)
7. Present summary, wait for approval

## Format Constraints

- Every leaf token: `$value` and `$type` required
- Colors: hex codes
- Fonts: exact Google Fonts names
- Three levels: primitive (raw) → semantic (aliases) → component (blueprint-derived)
- Semantic tokens MUST reference primitives via `{primitive.<group>.<key>}`
```

**Deleted**: `intake--tokens.md`

**Workflow change**: `tokens.md` → single stage `create-tokens`, keeps `after: css-generate`

**Rule changes**:
- `renderer-hints.md`: `when: steps:` updated from `[tokens:intake, create-tokens]` to `[create-tokens]`

---

### Data-Model Concern

#### `create-data-model.md` (absorbs `intake--data-model.md`)

**Before**: intake gathers entity definitions, create writes data-model.yml

**After** (1 file):
```yaml
# create-data-model.md
---
when: { steps: [create-data-model] }
reads:
  - path: $DESIGNBOOK_DATA/vision.md
    workflow: /debo-vision
  - path: $DESIGNBOOK_DATA/data-model.yml
    optional: true
result:
  data-model:
    path: $DESIGNBOOK_DATA/data-model.yml
    type: object
    required: [content]
    properties:
      content:
        type: object
        title: Content Entities
      config:
        type: object
        title: Config Entities
        default: {}
---

# Data Model

Define content and config entities through dialog.
Read vision.md for product context. If data-model.yml exists, extend it.
```

**Deleted**: `intake--data-model.md`

**Rule changes**:
- `image-style-config.md`: `when: steps:` updated from `[data-model:intake, create-data-model]` to `[create-data-model]`
- `sample-template-mapping.md`: same update

---

### Sample-Data Concern

#### `create-sample-data.md` (absorbs `intake--sample-data.md`)

**Before**: intake selects section + proposes counts, create generates data.yml

**After** (1 file):
```yaml
# create-sample-data.md
---
when: { steps: [create-sample-data] }
reads:
  - path: $DESIGNBOOK_DATA/data-model.yml
    workflow: /debo-data-model
  - path: $DESIGNBOOK_DATA/sections/
    optional: true
params:
  section_id: { type: string }
  entities:
    type: array
    default: []
result:
  sample-data:
    path: $DESIGNBOOK_DATA/sections/{section_id}/data.yml
    type: object
---

# Sample Data

Generate sample data for a section. Idempotent — reads existing data.yml, preserves records, appends missing.
```

**Deleted**: `intake--sample-data.md`

---

### Sections Concern

#### `create-section.md` (absorbs `intake--sections.md` and `intake--shape-section.md`)

**Before**: intake proposes sections, create writes section YAML

**After** (1 file):
```yaml
# create-section.md
---
when: { steps: [create-section] }
reads:
  - path: $DESIGNBOOK_DATA/vision.md
    workflow: /debo-vision
  - path: $DESIGNBOOK_DATA/sections/
    optional: true
params:
  section_id: { type: string, title: Section ID }
  section_title: { type: string, title: Section Title }
  description: { type: string, title: Description }
  order: { type: integer, title: Order }
each:
  section:
    $ref: ../schemas.yml#/Section
result:
  section-scenes:
    path: $DESIGNBOOK_DATA/sections/{section_id}/{section_id}.section.scenes.yml
    type: object
---

# Section

Create or update a section scenes file.
```

**Note**: `intake--sections.md` is the multi-section planner (proposes N sections). `intake--shape-section.md` is the single-section detailer. Both feed into `create-section`. The intake for `sections` workflow still needs to produce the `section` array — this intake cannot be fully merged because it drives `each:` expansion.

**Revised**: `intake--sections.md` stays (produces array for `each:`), `intake--shape-section.md` can merge. CLI commands removed from both.

---

### CSS-Generate Concern

No structural merge (5-stage pipeline). CLI commands removed from task files.

#### `generate-jsonata.md`
**Before**: `workflow result --task $TASK_ID --key generate-jsonata`
**After**: result declared in frontmatter, engine serializes via `--data` or implicit file collection

#### `generate-index.md`
**Before**: result with explicit CLI call
**After**: same, CLI removed

#### `prepare-fonts.md`
**Before**: result with explicit CLI call
**After**: same, CLI removed

---

### Import Concern

No structural merge (intake produces `workflow` array for `each:` dispatch).

#### `run-workflow.md`
**Before**: CLI commands for sub-workflow creation
**After**: CLI removed from task body — sub-workflow dispatch is implicit from `each: workflow` + declared params

#### `intake--import.md`
**Before**: no CLI, but produces workflow array implicitly
**After**: gains `result:` with data-only keys for the workflow array

---

### Design Concern — Intake Tasks (Multi-Stage)

These intakes remain as separate stages (they produce arrays for `each:` expansion) but lose all CLI commands.

#### `intake--design-shell.md`

**Before**: 3× `workflow result --key` + `workflow done`
**After**:
```yaml
result:
  component:
    type: array
    items:
      $ref: ../schemas.yml#/Component
  scene:
    type: array
    items:
      $ref: ../schemas.yml#/Scene
```
Body: pure prose describing how to plan components and scenes. No CLI commands.
AI fills the result object → `workflow done --data '{...}'` (or engine auto-collects).

#### `intake--design-screen.md`

Same pattern as design-shell. CLI commands removed, `result:` schema retained.

#### `intake--design-verify.md`

**Before**: 3× `workflow result --key` + `workflow done`
**After**:
```yaml
result:
  scene: { type: string }
  reference:
    type: array
    default: []
    items:
      $ref: ../schemas.yml#/Reference
  breakpoints:
    type: array
    default: []
    items: { type: string }
```
Body: pure prose. No CLI commands.

---

### Design Concern — Create/Capture/Compare Tasks

#### `create-scene--design-shell.md`
**Before**: `workflow result --task $TASK_ID --key shell-scenes`
**After**: `result:` with `path:`, no CLI. Engine auto-collects file at declared path.

#### `create-scene--design-screen.md`
Same pattern.

#### `map-entity--design-screen.md`
**Before**: `workflow result --task $TASK_ID --key entity-mapping`
**After**: `result:` with `path:`, no CLI.

#### `capture-reference.md`
**Before**: Playwright writes to staged path via `workflow get-file` + `workflow result --external`
**After**: `workflow get-file` stays (Playwright needs the path). `--external` flag stays. But the task prose no longer mentions `$TASK_ID` — the execution rules handle it.

**Note**: Capture tasks use `--external` because Playwright writes the file, not the AI. This is the one case where explicit `workflow result` survives — but moved to execution rules, not task prose.

#### `capture-storybook.md`
Same as capture-reference.

#### `compare-screenshots.md`
**Before**: `workflow result --task $TASK_ID --key issues --json [...]`
**After**: data result via `workflow done --data '{...}'`

#### `setup-compare.md`
**Before**: `workflow result --key checks --json` + `workflow done`
**After**: data result via `workflow done --data '{...}'`

#### `triage.md`
**Before**: `workflow result --key issues --json`
**After**: data result via `workflow done --data`

#### `polish.md`
No change — already has no CLI result commands (modifies code files directly).

#### `configure-meta.md`
**Before**: `_debo workflow result --task $TASK_ID --key meta`
**After**: `result:` with `path:`, engine auto-collects.

#### `outtake--design.md`
**Before**: references `workflow create --params` for sub-workflow dispatch
**After**: sub-workflow dispatch is driven by workflow definition, not task CLI commands. Task prose describes WHAT to dispatch, engine handles HOW.

#### `outtake--design-verify.md`
No change — already has no CLI commands.

---

### Integration Skills

#### `designbook-drupal/components/tasks/create-component.md`

**Before**: 4× `workflow result` calls for component-yml, component-twig, component-story, app-css
**After**: 4 result keys in `result:` with `path:`, engine auto-collects files. No CLI in task body.

This is a multi-file task — the AI writes 4 files. All have `path:` declarations. `workflow done` auto-detects all 4.

---

## Workflow Definition Changes

### Merged Workflows (intake stage removed)

```yaml
# vision.md — after
---
title: Define Product Vision
stages:
  create-vision:
    steps: [create-vision]
engine: direct
---

# tokens.md — after  
---
title: Design Tokens
stages:
  create-tokens:
    steps: [create-tokens]
engine: direct
after:
  - workflow: css-generate
    optional: true
---

# data-model.md — after
---
title: Data Model
stages:
  create-data-model:
    steps: [create-data-model]
engine: direct
---

# sample-data.md — after
---
title: Sample Data
stages:
  create-sample-data:
    steps: [create-sample-data]
engine: direct
---

# shape-section.md — after
---
title: Shape Section
stages:
  create-section:
    steps: [create-section]
engine: direct
---
```

### Unchanged Workflow Structures

- `sections.md` — keeps intake (produces section array for `each:`)
- `design-screen.md` — 9 stages, unchanged
- `design-shell.md` — 9 stages, unchanged
- `design-verify.md` — 7 stages, unchanged
- `design-component.md` — 3 stages, unchanged
- `css-generate.md` — 5 stages, unchanged
- `import.md` — 2 stages, unchanged (intake produces workflow array)

---

## Rule File Changes

### Rules Absorbed (can be deleted)

| Rule | Reason |
|------|--------|
| `vision-format.md` | Format constraints now live in schema `title:` fields. Single remaining constraint ("h1 is required") can be a `constrains:` annotation or inline in task description. |

### Rules With `when:` Update

| Rule | Before | After |
|------|--------|-------|
| `renderer-hints.md` | `[tokens:intake, create-tokens]` | `[create-tokens]` |
| `image-style-config.md` | `[data-model:intake, create-data-model]` | `[create-data-model]` |
| `sample-template-mapping.md` | `[data-model:intake, create-data-model]` | `[create-data-model]` |
| `extract-reference.md` | `[design-shell:intake, design-screen:intake, tokens:intake]` | `[create-tokens, design-shell:intake, design-screen:intake]` |

### Rules Gaining Declarative Schema Extensions

| Rule | Mechanism | What it adds |
|------|-----------|-------------|
| `renderer-hints.md` | `constrains:` | Adds `$extensions.designbook.renderer` pattern to dimension tokens |
| `image-style-config.md` | `constrains:` | Enforces `config.image_style` bundle structure (no fields, uses aspect_ratio) |
| `sample-template-mapping.md` | `provides:` | Supplies `sample_template` defaults based on field type mapping |
| `stitch-tokens.md` | `provides:` | Supplies token values imported from Stitch design system |
| `provide-stitch-url.md` | `provides:` | Supplies resolved preview URLs for Stitch screen references |
| `tailwind-breakpoints` (future) | `provides:` | Supplies Tailwind default breakpoint tokens |

### Rules Unchanged (Prose-Only)

These rules provide behavioral context that cannot be expressed as schema patches:

| Rule | Why prose stays |
|------|----------------|
| `vision-context.md` | Loads vision.md as context — behavioral, not schema |
| `extract-reference.md` | Playwright automation — procedural steps |
| `playwright-capture.md` | Staged file flow — procedural |
| `scenes-constraints.md` | Provider prefixes, inline styles — code-generation constraints |
| `typography-tokens.md` | Token usage patterns — code-generation constraints |
| `font-url-construction.md` | Google Fonts URL construction — procedural |
| `stitch-import.md` | Stitch project resolution — procedural |

---

## `workflow-execution.md` Changes

### New Generic Done Protocol

Replace all per-task CLI instructions with a single rule in workflow-execution.md:

```markdown
## Completing a Task

After following the task instructions:

1. **File results** (result keys with `path:`):
   Write each file to its declared path using the Write tool or stdin.
   The engine auto-detects files at declared paths when `done` is called.

2. **Data results** (result keys without `path:`):
   Pass all data results as a single JSON object:
   `_debo workflow done --task <id> --data '<json>'`

3. **No results**:
   `_debo workflow done --task <id>`

4. **External file results** (written by Playwright or other tools):
   `_debo workflow result --task <id> --key <key> --external`
   Then: `_debo workflow done --task <id>`
```

This replaces all per-task `workflow result --key X --json` instructions.

---

## Files Deleted

| File | Reason |
|------|--------|
| `vision/tasks/intake--vision.md` | Absorbed into `create-vision.md` |
| `tokens/tasks/intake--tokens.md` | Absorbed into `create-tokens.md` |
| `data-model/tasks/intake--data-model.md` | Absorbed into `create-data-model.md` |
| `sample-data/tasks/intake--sample-data.md` | Absorbed into `create-sample-data.md` |
| `sections/tasks/intake--shape-section.md` | Absorbed into `create-section.md` (for shape-section workflow) |
| `vision/rules/vision-format.md` | Format now in schema `title:` fields |

---

## Summary of Changes by File Count

| Category | Files Modified | Files Deleted | Files Created |
|----------|---------------|---------------|---------------|
| Task files (merged intake+create) | 5 | 5 | 0 |
| Task files (CLI removal only) | 16 | 0 | 0 |
| Workflow definitions | 5 | 0 | 0 |
| Rule files (when: update) | 4 | 1 | 0 |
| Rule files (gain extends/provides) | 6 | 0 | 0 |
| Execution rules | 1 | 0 | 0 |
| CLI (Part 2) | ~3 | 0 | ~2 |
| **Total** | **~40** | **6** | **~2** |
