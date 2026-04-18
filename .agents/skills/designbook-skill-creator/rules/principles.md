---
name: principles
description: Core design principles for all Designbook skill authoring
---

# Skill Design Principles

## Tasks Say WHAT, Never HOW

Task files declare **what outputs to produce** — file paths, required params, file-input dependencies. They never contain style guidelines, implementation instructions, or format prescriptions.

**Correct:**
```markdown
---
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
---
```

**Wrong:**
```markdown
---
params:
  type: object
  required: [component]
  properties:
    component: { type: string }
---
Use snake_case for the component name. Create the YAML file with these required fields: ...
```

Implementation guidance belongs in blueprints (overridable) or rules (hard constraints) — never in task files.

## Results Declare Schema, Not Just Paths

Task results are declared in the `result:` frontmatter field with a JSON Schema. Two types:

- **File results** (with `path:`) — files written to disk. Path template supports `$ENV` and `{{ param }}`. Optional `submission: data | direct` (default `data`) and `flush: deferred | immediate` (default `deferred`) control who writes the file and when. Optional `validators:` for semantic validation. Optional JSON Schema type (inline or `$ref`).
- **Data results** (without `path:`) — structured data returned via `--data`. JSON Schema type required (inline or `$ref`).

Both support `$ref` to `schemas.yml` definitions (see [`resources/schemas.md`](../resources/schemas.md)).

```yaml
result:
  type: object
  required: [component-yml]
  properties:
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

**Result schemas must use `$ref` to `schemas.yml`.** Never inline a schema definition in task frontmatter when a matching type exists in the concern's `schemas.yml`. The `schemas.yml` is the single source of truth for schema shape — task results reference it, they don't duplicate it. If no matching type exists yet, create one in `schemas.yml` first, then `$ref` it.

```yaml
# ✅ CORRECT — schema defined in schemas.yml, referenced from task
result:
  type: object
  required: [vision]
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      $ref: ../schemas.yml#/Vision

# ❌ WRONG — schema duplicated inline in task frontmatter
result:
  type: object
  required: [vision]
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      type: object
      required: [product_name, description]
      properties:
        product_name: { type: string }
        description: { type: string }
```

## Tasks Declare Results in Schema, Not in Body

The `result:` schema in frontmatter defines shape and type of all outputs. The task body never explains *how* results are returned (writing files vs. `--data`), but may explain *what* goes into a result when the semantics aren't obvious from the schema type alone.

Use `## Result: <key>` sections in the task body for results that need semantic explanation. Keys whose schema is self-explanatory need no section.

```markdown
---
result:
  type: object
  required: [issues]
  properties:
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

## Schemas Must Teach the AI

`schemas.yml` is the authoritative spec for what tasks produce. The AI uses these schemas to drive intake dialogues and generation — so every type must contain enough metadata to be self-explanatory:

- **Top-level types** declare `title:` or `description:`.
- **Each property** has either `description:`, `enum:`, `pattern:`, or `examples:` — anything that gives the AI a signal beyond the bare type.
- **`additionalProperties: true`** is documented (what kind of arbitrary keys belong here).
- **Required fields** are listed explicitly in `required:`.

A reader (human or AI) must be able to look at a schema and know what to ask for and what to generate. A schema with only `{ type: string }` properties teaches nothing.

```yaml
# ❌ Teaches nothing — AI has no signal what to put in product_name
Vision:
  type: object
  properties:
    product_name: { type: string }
    description: { type: string }

# ✅ Teaches the AI what to ask for and what to generate
Vision:
  type: object
  title: Product Vision
  description: High-level intent for the product — drives all downstream generation.
  required: [product_name, description]
  properties:
    product_name:
      type: string
      description: Short brand-facing name. Used in titles, story labels, and intake prompts.
      examples: [Acme Portal, Citizen Hub]
    description:
      type: string
      description: One-paragraph product mission — answers "what is this for, for whom".
```

## Blueprints Are Overridable Starting Points

Blueprints provide an example of what a good output looks like: required tokens, props, slots, markup patterns. Integrations may deviate from blueprints to match their stack.

```markdown
---
trigger:
  domain: components
---
# Blueprint: Card

## Required Tokens
- `--card-bg`
- `--card-radius`
...
```

Blueprints are suggestions — an integration with different token conventions is free to diverge. If a constraint is non-negotiable, use a rule instead.

## Rules Are Hard Constraints

Rules enforce constraints that must hold regardless of integration, framework, or user preference. Once a rule's `trigger` conditions match, it applies absolutely.

```markdown
---
trigger:
  domain: components
filter:
  backend: drupal
---
All component files must include a `$schema` field pointing to the JSON schema.
```

Rules are never overridden by integration skills. If something CAN be overridden, it is a blueprint.

## Rules Never Declare `params:`

Rules are constraints that apply when a step matches. They must not declare their own `params:` schema and must not pick resolvers. Resolver choice is strictly task territory — different tasks can choose different resolvers (or no resolver) for the same input param.

If a rule needs a value (e.g. `story_url`), it reads it from the values already resolved by the task that owns the step. A rule that "requires" a param is really stating a precondition on the task: the task must declare that param with the appropriate resolver.

**Wrong** (rule carrying its own param + resolver):
```markdown
---
name: designbook:design:playwright-validate
trigger:
  steps: [validate]
params:
  type: object
  required: [story_url]
  properties:
    story_url: { type: string, resolve: story_url }
---
```

**Correct** (rule consumes what the task provides):
```markdown
---
name: designbook:design:playwright-validate
trigger:
  steps: [validate]
---

`story_url` is pre-resolved by the task's `story_url` resolver at `workflow create` time.
If the resolver returned an error, fix the input and restart the stage.
```

The same principle applies to blueprints.

## Concrete Implementations Belong in Blueprints, Never in Tasks or Rules

Tasks and rules must be **as abstract as possible**. They describe structure, requirements, and constraints — never concrete implementation details that differ between integrations (class names, token names, file naming patterns, markup specifics).

**The distinction:**

| What varies between integrations | → Blueprint |
| What never changes | → Rule |
| What to produce (outputs only) | → Task |

**Examples:**

- "A component must have a `$schema` field" — never changes → **rule**
- "Use `btn btn--primary` as the default button class" — Tailwind uses different classes → **blueprint**
- "Component tokens follow the pattern `--[component]-[property]`" — differs per integration → **blueprint**
- "Create `{{ component }}.component.yml`" — output declaration → **task**

**Wrong** (concrete implementation in a rule):
```markdown
---
trigger:
  domain: components
---
Use BEM class naming: `.block__element--modifier`.
```

**Correct** (move naming conventions to a blueprint):
```markdown
---
trigger:
  domain: components
---
# Blueprint: Component Naming

Use BEM class naming: `.block__element--modifier`.
```

Both rules and blueprints can live in an integration skill's layer (`designbook-drupal/rules/`, `designbook-css-tailwind/blueprints/`). The layer determines scope; the file type (rule vs blueprint) determines overridability.

## Skills Are Site-Agnostic

Tasks, rules, and blueprints must **never reference a specific site, brand, or project**. They describe generic patterns and constraints — the concrete appearance, colors, fonts, section names, and slot inventories always come from analyzing the design reference at runtime.

**Wrong** (site-specific slots in a blueprint):
```markdown
## Slots
- newsletter — newsletter signup section
- social — social media links
- logos — partner logos
```

**Correct** (generic):
```markdown
## Slots
- navigation — footer navigation component (required)
- Additional slots as determined by the design reference
```

**Wrong** (site-specific examples in a rule):
```markdown
Extract the BIBB brand bar above the navigation.
```

**Correct** (generic):
```markdown
For each direct child of a landmark, extract: backgroundColor, height, padding, and a content summary.
```

Blueprints describe **structural patterns** (multi-row headers, multi-section footers, container usage for background sections). Rules describe **technical constraints** (embed behavior, CSS property syntax, inline styles). Neither may prescribe site-specific visual details — those are discovered from the reference.

## Stages Flush After Completion

After each stage completes, all output files are **flushed** — renamed from their temporary working names to their final canonical names. This flush is what makes outputs referenceable by later stages.

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

Never reference unflushed (in-progress) file names from another stage — the file will not exist at that path until the producing stage has completed and flushed.

## Workflow Steps Are Plain Names

In workflow definitions (`stages.*.steps`), step names are always plain — never prefixed with the workflow name:

**Correct:**
```yaml
stages:
  intake:
    steps: [intake]
  outtake:
    steps: [outtake]
```

**Wrong:**
```yaml
stages:
  intake:
    steps: [design-screen:intake]
  outtake:
    steps: [design-screen:outtake]
```

The workflow prefix belongs in task files' `trigger.steps` for disambiguation (e.g. `trigger: steps: [design-screen:intake]`), not in the workflow definition itself. The resolver combines the workflow name with the step name automatically.

**Note:** `trigger.steps` is only used in **task files** for step matching. Rules and blueprints use `trigger.domain` instead — see [`structure.md`](./structure.md) for the domain matching model.

## Stage = Filename, No Duplication

A task file's filename IS its stage assignment. `tasks/create-component.md` applies to stage `create-component`. Never declare `stage:` in frontmatter — it is redundant and becomes stale.

## Validation Is Automatic

Validation runs automatically when results are written and when tasks complete. Never add validation steps or instructions inside task files.

Results support semantic `validators:` in addition to JSON Schema validation: `data`, `entity-mapping`, `scene`, `image`, or `cmd:<command>` for arbitrary command validators.
