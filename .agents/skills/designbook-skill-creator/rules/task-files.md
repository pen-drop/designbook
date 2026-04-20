---
name: task-files
description: Authoring + validation rules for task files (tasks/*.md). Load before creating or editing any task file; load alongside common-rules.md.
applies-to:
  - tasks/*.md
  - "**/tasks/*.md"
---

# Task File Rules

Load together with [common-rules.md](common-rules.md).

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

## Stage = Filename, No Duplication

A task file's filename IS its stage assignment. `tasks/create-component.md` applies to stage `create-component`. Never declare `stage:` in frontmatter — it is redundant and becomes stale.

## Validation Is Automatic

Validation runs automatically when results are written and when tasks complete. Never add validation steps or instructions inside task files.

Results support semantic `validators:` in addition to JSON Schema validation: `data`, `entity-mapping`, `scene`, `image`, or `cmd:<command>` for arbitrary command validators.

## Concrete Implementations Don't Belong in Tasks

Tasks must stay **as abstract as possible**. They describe outputs only — what files to produce, what params to accept, what schema to match. They never contain:

- CSS class names or style syntax
- Framework-specific template code (Twig, JSX, Blade, …)
- File-naming patterns that differ between integrations
- Markup-layout instructions

Implementation details that vary between integrations belong in **blueprints** (overridable starting points). Implementation details that must hold regardless of integration belong in **rules** (hard constraints). See [blueprint-files.md](blueprint-files.md) and [rule-files.md](rule-files.md) for how those files are structured; the `TASK-06` check below enforces this boundary on the task side.

## `tasks/` — Naming Rule

**Filename = stage name.** `tasks/create-component.md` applies to stage `create-component`. The AI discovers tasks by scanning all skill directories for `tasks/<stage>.md`. No explicit stage declaration in frontmatter.

### Workflow-qualified tasks

**Scope.** This subsection applies **only** to task files whose filename contains `--`
(e.g. `intake--design-verify.md`). Non-qualified task files ignore this subsection.

Task files scoped to a specific workflow use `<step>--<workflow>.md` naming (e.g. `intake--design-verify.md`). Their `trigger.steps:` **MUST** use the fully qualified step name including the workflow prefix:

```yaml
# ✅ CORRECT — matches workflow step "design-verify:intake"
trigger:
  steps: [design-verify:intake]

# ❌ WRONG — bare step name will NOT match, task gets skipped
trigger:
  steps: [intake]
```

The CLI matches `trigger.steps:` values literally against the step name from the workflow definition. A workflow that declares `steps: [design-verify:intake]` will only find task files whose `trigger.steps:` contains the exact string `design-verify:intake`.

## Param + Body Consistency

Task bodies must not duplicate filename or path information that is already declared in
`params.properties` or `result.properties`. Five specific violations are checked:

1. **Hardcoded paths in the body.** Markdown body (everything below the frontmatter) may only reference files via runtime placeholders — `{{ … }}` JSONata templates or `$ENV_VAR`/`${ENV_VAR}` references. Bare `$DESIGNBOOK_DATA`, bare `.yml` filenames, and `Read X.yml` / `If X.yml exists` patterns are violations.
2. **Missing param declaration.** A file referenced in the body without a matching entry in `params.properties`.
3. **Missing `$ref` on a file result.** A `result:` entry with a `path:` but no `$ref:` to a schema.
4. **Redundant body reference.** A filename in the body whose basename matches the `path:` of an existing param — the param already covers it.
5. **Flat map format.** `params:` or `result:` without `type: object` and `properties:`. The wrapper object is required.

These five map to `TASK-10` through `TASK-14` in the Checks table.

## Checks

<!--
  TASK-09 shares its predicate with SCHEMA-02. If the definition of "teaching signal"
  (description / enum / pattern / examples) changes, update both checks together.
-->

| ID | Severity | What to verify | Where |
|---|---|---|---|
| TASK-01 | error | Required frontmatter fields present: `when`/`trigger`; if the task declares outputs, `result:` must be present | frontmatter |
| TASK-02 | error | Applies only when filename contains `--`: `trigger.steps:` uses the fully qualified step name `<step>:<workflow>` matching the workflow's `stages.*.steps` entry | filename |
| TASK-03 | error | `stage:` field absent in frontmatter (redundant — filename is the stage) | frontmatter |
| TASK-04 | error | No inline schema in `result:` properties when a matching type exists in the concern's `schemas.yml` — must use `$ref` instead | frontmatter |
| TASK-05 | warning | Body does not repeat a self-explanatory `result:` schema (a `## Result: <key>` section for a result whose schema type alone is self-explanatory) | body |
| TASK-06 | warning | Body contains no HOW — no CSS classes, Twig/JSX/Blade, framework-specific syntax, or style/markup instructions | body |
| TASK-07 | warning | Body does not repeat what a loaded rule already enforces (cross-layer duplicate with a matching rule file) | body |
| TASK-08 | warning | Body does not describe manual validation that the engine performs automatically | body |
| TASK-09 | warning | Properties in `params:` and `result:` with `type: string`/`number`/`object` carry at least one teaching signal (`description`, `enum`, `pattern`, or `examples`); properties with `path:` or `$ref:` are exempt | frontmatter |
| TASK-10 | warning | Body contains no hardcoded file path — file references in the body use `{{ … }}` or `$ENV_VAR` placeholders | body |
| TASK-11 | error | Every file referenced in the body is declared in `params.properties` (or `result.properties` if produced by the task) | frontmatter+body |
| TASK-12 | warning | Each `result:` entry with a `path:` also has a `$ref:` pointing to a schema | frontmatter |
| TASK-13 | warning | Body contains no filename reference whose basename matches an existing param's `path:` basename | frontmatter+body |
| TASK-14 | error | `params:` and `result:` use `type: object` with `properties:` — flat-map format is rejected | frontmatter |
