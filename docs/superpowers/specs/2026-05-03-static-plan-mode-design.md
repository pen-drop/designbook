# Static Plan Mode

**Date**: 2026-05-03
**Status**: Design
**Scope**: v1 — static plan generation only. Concrete/dry-run mode and follow-on architectural work are out of scope.

## Problem

Designbook workflows are split across many files: a workflow definition declares stages; each stage runs one or more tasks; each task may have rules and blueprints triggered into its context via `trigger:` frontmatter; tasks declare inputs via path references and produce outputs whose schemas live in `schemas.yml`. To understand what a single workflow does today, a reader (human or AI) must open and mentally assemble many files in the right order.

This causes three concrete pains:

1. **Clarity is hard to verify**. Whether a workflow is well-specified — every input has a source, every step is unambiguous, every constraint is visible at the right point — cannot be checked without manually walking the file graph.
2. **Plans cannot be fed to other AI tools**. Producing a portable description of "what this workflow does" requires hand-assembly each time.
3. **Optimization is guesswork**. Without seeing the assembled workflow, decisions about collapsing trivial tasks, deduplicating rules, or simplifying directory layout are made blind.

## Goal

Add a CLI command that resolves a workflow definition into a single self-contained markdown document. The document inlines all referenced rules, blueprints, schemas, and examples, and shows data flow between stages explicitly. No AI is invoked; no workflow execution occurs.

The output document serves two audiences:

- **AI consumer**: paste into Claude or another LLM tool and ask "given this configuration, is everything clear?" — the AI evaluates the assembled plan for ambiguity, contradictions, missing inputs.
- **Human reviewer**: read top-to-bottom to spot fragmentation, redundant rules, and broken references; diff between branches in PR review when workflow definitions change.

## Non-Goals

The following are explicitly deferred to future specs and **must not** be addressed by this work:

- **Concrete/dry-run mode** — actually executing workflow logic with AI while suppressing side effects. Discussed during brainstorm; deferred.
- **Plan diffing infrastructure** — `git diff` of plan output is enough for v1.
- **Multi-workflow rendering** (`--all`) — trivial follow-up; out of v1.
- **Visual graph / DAG output** — markdown only in v1.
- **Vocabulary alignment** — renaming `task`/`rule`/`blueprint`/`stage`/`intake`/`outtake` to canonical pipeline terms. Cosmetic; do last.
- **Rule reusability refactor** — making rules a shared library rather than scoped via trigger frontmatter. Architectural; separate spec.
- **Fragmentation cleanup** — collapsing trivial tasks into larger units. Driven by what plan mode reveals; separate spec.

The last three points are the architectural follow-ups from the brainstorming decomposition. Plan mode v1 exists to make them evidence-based.

## Design Inspiration

The two-mode model (static plan vs. concrete dry-run, the latter deferred) follows Terraform's `plan` / `apply` separation. Specifically, the static plan mirrors `terraform plan` *without* state refresh: it resolves the configuration graph and renders unknowns as placeholders rather than computing them. Where Terraform marks unset attributes as `(known after apply)`, the static plan marks forward-referenced inputs as `(produced by stage X)`.

Borrowing the placeholder semantics is intentional: it gives the document a precedent in widely-used tooling, avoiding the need to invent a vocabulary for "unknown" values. (When concrete/dry-run mode lands later, the same placeholder pattern extends to AI-decided output values.)

## Output Document Structure

The plan command produces a single markdown document with the following shape:

````markdown
# Plan: <workflow name>

> <workflow description from workflow frontmatter>

## Workflow Parameters
- <name> (<type>) — default: <value>
- ...

## Stages
| # | Stage | Tasks |
|---|-------|-------|
| 1 | reference | extract-reference |
| 2 | intake | intake--design-shell |
| ... |

---

## Stage 1 — <stage name>

### Task: <task name>
**References**: rule [<rule-name>](#rule-<rule-name>), blueprint [<blueprint-name>](#blueprint-<blueprint-name>)

**Inputs**
- `<param>` ← `<source>`
- ...

[Full body of task markdown inlined verbatim]

**Output schema**
```yaml
<schema, with $refs resolved>
```

**Output example**
```yaml
<author-written example, or schema-derived placeholder>
```

---

## Stage 2 — ...
(continues for all stages)

---

# Rules

## Rule: <rule name>
*Triggered on*: <trigger steps from frontmatter>
*Applied in tasks*: <reverse index of tasks where this rule's trigger matches>

[Full body of rule markdown inlined]

## Rule: ...

# Blueprints

## Blueprint: <blueprint name>
*Triggered on*: <trigger steps from frontmatter>
*Applied in tasks*: <reverse index>

[Full body inlined]
````

### Document Properties

The structure satisfies these properties:

- **Self-contained**. Every rule body, every blueprint body, every `$ref`'d schema fragment is inlined. A reader needs no other file.
- **Linear top-to-bottom for stages/tasks**. Stages appear in execution order. No branching diagrams.
- **Tasks reference rules/blueprints by anchor link**. Each task header lists `**References**:` with markdown anchor links into the appendix.
- **Rules/blueprints appear once each, deduplicated**, in the appendix at the bottom.
- **Reverse index on each rule/blueprint**: `Applied in tasks: ...` lists which tasks triggered it. Computed by the plan command from the trigger graph; free byproduct.
- **Inputs always show their source**. Three kinds, mirroring Terraform semantics:
  - File path (`$DESIGNBOOK_DATA/vision.yml`) — resolved at workflow start.
  - `(produced by stage X)` — output of an earlier stage. Mirrors Terraform's `(known after apply)`.
  - `(workflow params)` — provided at invocation time.

### Output Examples

Each task section ends with `**Output example**`. Source resolution order:

1. **Author-written**, from a designated location in the task file. To be decided at implementation time: either a frontmatter `example:` field or a `## Example output` markdown section. Recommendation in this spec: markdown section, because YAML examples read better with comments and indentation in markdown than in nested frontmatter.
2. **Schema-derived placeholder**, generated from the task's `result:` schema when no author-written example exists. Format: shape-correct, type-correct, with placeholder string values.

The fallback ensures every task has *some* example output; the author-written path lets task authors provide meaningful values.

## Resolution Semantics

The plan command performs this resolution, deterministically, in one pass:

### 1. Workflow definition

Read the workflow file (e.g. `design-shell.md`). Parse frontmatter for stages, params, before/after hooks (informational only — not executed).

### 2. Task discovery per step

For each `(workflow, stage, step)` tuple in the workflow:

- Find tasks whose `trigger:` matches. Matching rules:
  - **Plain step name** (`intake`) — matches that step name in any workflow.
  - **Workflow-scoped** (`design-shell:intake`) — matches only when invoked under that workflow.
  - **AND combinator** (`design-shell and:create-scene`) — both conditions must hold.

### 3. Rule and blueprint resolution

For each task identified:

- Find rules whose `trigger:` matches the same `(workflow, stage, step)` context, applying the same matching rules.
- Apply `domain:` filter: if a rule declares `domain: [components, scenes]`, the rule only applies when the task's domain (from its frontmatter) intersects.
- Same procedure for blueprints, distinguished by `type: blueprint` in their frontmatter or by living under `blueprints/`.

### 4. Schema `$ref` resolution

Within task `params:` and `result:` schemas, follow `$ref:` references and inline the target. Cycles are detected and reported as resolution errors. The resolved schemas are rendered into `**Inputs**` (path/source per param) and `**Output schema**` (full inlined schema) sections.

### 5. Input source classification

For each input declared in a task's `params:`:

- If `path:` is present → render as file source (`<param> ← <path> *(file)*`).
- If the input matches a key in a prior stage's task `result:` properties (matched by name; type compatibility checked when both sides have explicit types) → render as `(produced by stage N: <task>)`.
- Otherwise → render as `(workflow params)`.

Name-based matching is the simplest convention compatible with current task definitions. If implementation reveals collisions or false matches (e.g. two upstream tasks both expose `components`), step 5 may need a small refinement — for example, allowing tasks to declare explicit `inputs_from:` references. This is flagged as a known under-specification, not a blocker.

### 6. Reverse-index pass

After all tasks are resolved, walk back over the rule/blueprint set: for each rule, list every task whose triggers matched it. Render under the rule's `*Applied in tasks*:` line.

### 7. Render

Emit markdown in the structure given above. Single document, written to stdout.

## CLI Surface

```bash
debo plan <workflow>            # writes plan to stdout
debo plan <workflow> > plan.md  # redirect to file
```

- One workflow per invocation in v1.
- No `--output` flag — stdout + redirect is enough.
- Exit code 0 on success.
- Non-zero exit on resolution errors: unresolvable `$ref`, trigger pointing at non-existent step, blueprint or rule file missing on disk after being matched, etc.
- Resolution errors are written to stderr with file path + line number where possible.

The command lives in the existing CLI code at `packages/storybook-addon-designbook/src/cli/`, alongside other workflow utilities. If the trigger resolver and `$ref` resolver already exist in the runtime, the plan command reuses them; if not, both are simple enough to implement standalone for the plan use case.

## Limitations the Plan Will Surface

By construction, the plan command can only render what is *explicitly declared via `trigger:` frontmatter*. If a rule is applied implicitly at runtime — e.g. by Claude scanning the rules directory and self-deciding which apply — that rule will not appear in the plan.

This is a **feature, not a bug for v1**: the plan honestly shows the wired vs. incidental distinction. Rules that should be visible but don't appear are evidence for the future "rule reusability" spec, where binding becomes fully explicit. Plan mode is the diagnostic that motivates that work.

## Open Decisions Deferred to Implementation

These are small enough to be decided at implementation time without affecting the design:

- **Where the example lives in a task file** — frontmatter `example:` field vs. `## Example output` markdown section. Recommendation: markdown section.
- **Default schema-derived placeholder format** — `<string>` placeholder strings vs. type-prefixed (`"<string:component-name>"`). Recommendation: simple type placeholders.
- **Anchor link slug normalization** — kebab-case slugs derived from rule/blueprint filenames.

## Acceptance

The v1 plan command is complete when:

1. `debo plan design-shell` produces a single markdown document containing every stage, task, rule, blueprint, schema, and example referenced by the workflow, with no external file references the reader must follow.
2. The document is self-consistent: every `**References**:` link resolves to an anchor in the same document; every input source is classified.
3. Resolution errors (missing files, broken `$ref`, undeclared trigger targets) produce a non-zero exit code with an actionable message.
4. The document, pasted into Claude with a clarity-check prompt, gets a useful evaluation back. (Validated empirically on `design-shell`, `design-screen`, `design-component`, `design-verify`.)

## Follow-Up Specs (Out of Scope Here)

In sequence, motivated by what plan mode reveals:

1. **Concrete/dry-run mode** — `--run` flag that invokes AI per stage with side-effect interception. Discussed during brainstorm.
2. **Rule reusability refactor** — making rule binding fully explicit so plan mode shows complete information.
3. **Fragmentation cleanup** — collapsing trivial tasks based on what plan mode shows is bloated.
4. **Vocabulary alignment** — renaming to canonical pipeline terminology (workflow/stage/step/norm/safeguard).
