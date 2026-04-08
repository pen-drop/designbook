# workflow-format Specification

## Purpose
Defines workflow YAML format, task/rule/blueprint schema, plan resolution, parameter expansion, and optional features (hooks, resume).

---

## Requirement: Workflow frontmatter uses grouped stage definitions

Workflow files live at `<concern>/workflows/<workflow-id>.md`. Frontmatter MUST use a `stages` map where each key is a stage name with `steps`, optional `each`, `workflow`, and `params`.

```yaml
---
title: Design Screen
description: Create screen design components for a section
stages:
  intake:
    steps: [design-screen:intake]
  component:
    each: component
    steps: [create-component]
  sample-data:
    steps: [create-sample-data]
  entity-mapping:
    steps: [design-screen:map-entity]
  scene:
    each: scene
    steps: [design-screen:create-scene]
  verify:
    each: scene
    workflow: design-verify
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
```

- `workflow create` parses `stages` as `Record<string, StageDefinition>` with `steps?: string[]`, `each?: string`, `workflow?: string`, `params?: Record<string, StageParam>`
- Frontmatter MUST NOT contain `name:`, `id:`, or `category:`
- `engine: direct` uses direct engine; `engine: git-worktree` uses git worktree engine
- `description` is required — matched against user intent at dispatch time

---

## Requirement: Stage definition fields

Each stage supports: `steps`, `each` (iterable param key), `workflow` (subworkflow ID), `params` (required parameters).

- `each: component` with `component: [{...}, {...}]` in params → one task per item per step
- `workflow: design-verify` with `each: scene` → `workflow done` returns `dispatch` with per-item child invocations
- `params: { user_approved: { type: boolean, prompt: "..." } }` blocks stage until fulfilled → `workflow done` returns `waiting_for`
- `workflow` and `steps` are mutually exclusive (validation error if both set); `workflow` requires `each`

---

## Requirement: No marker syntax

No `!WORKFLOW_FILE` or `!WORKFLOW_DONE` markers. File production declared in task frontmatter via `files`; completion determined by lifecycle state machine.

- Task `files: [{ file: "<template>", key: "<key>", validators: [...] }]` → CLI resolves paths at plan time, tracks in tasks.yml

---

## Requirement: Task files use when.steps for stage matching

A task file declares applicable steps via `when.steps`. Filename is a fallback with deprecation warning.

- `when: { steps: [create-component] }` → matched for step `create-component`
- Multiple matches → `name/as` deduplication and priority sorting applied
- No `when.steps` match but `<step>.md` exists → filename fallback with deprecation warning
- No `when` field → unconditional match at specificity 0

---

## Requirement: Task file frontmatter — when, params, files, reads

```yaml
---
when:
  steps: [design-screen:create-scene]
params:
  section_id: ~
  section_title: ~
  scenes: []
reads:
  - path: $DESIGNBOOK_DATA/data-model.yml
    workflow: debo-data-model
files:
  - file: $DESIGNBOOK_DATA/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml
    key: section-scenes
    validators: [scene]
---
```

- `{{ section_id }}` and `$DESIGNBOOK_DATA` resolved from params and env map
- `params: { component: ~ }` (null) = required; raises error if missing at expansion
- `params: { slots: [] }` = optional with default `[]`
- `key: section-scenes` → content written via `workflow write-file <name> <task-id> --key section-scenes`
- `validators: [scene]` → `write-file` runs validator against content

---

## Requirement: Rule files use when to scope to steps and config

Rules in `skills/<name>/rules/` are candidates for all steps; `when` narrows scope.

- `when: { steps: [create-data-model], backend: drupal }` → applies only during that step+config combo
- Rules without `when` (or empty) are skipped (`requireWhen=true`)

---

## Requirement: Blueprint files use when to scope to steps and config

Blueprints use same `when` system as rules, deduplicated by `type`+`name` with priority-based resolution. Highest `priority` wins (default: 0); equal priority uses last match.

---

## Requirement: Step name resolution — colon syntax and when.steps

Step names: plain (`create-component`) or qualified (`<workflow-id>:<step>`), both matched by `when.steps`.

- Plain step → scans `skills/**/tasks/*.md` for `when.steps` matches
- Qualified step → returns best match (highest specificity)
- Rule matching includes plain, qualified, and `<workflow-id>:*` variants

---

## Requirement: File locations

- Concern-level tasks: `skills/designbook/<concern>/tasks/<task>.md`
- Workflow-specific tasks: `skills/designbook/<concern>/tasks/<task>--<workflow-id>.md`
- Concern-level rules: `skills/designbook/<concern>/rules/<rule>.md`
- Workflows: `skills/designbook/<concern>/workflows/<workflow-id>.md`
- Extensions: `skills/designbook-<ext>/tasks/` and `rules/`

---

## Requirement: tasks.yml structure

Contains top-level `stages` map, `stage_loaded` map (resolved step data per step: task_file, rules, blueprints, config_rules, config_instructions), and `tasks` (flat array with `step` and `stage` per task).

---

## Requirement: Name/as deduplication and priority sorting

- `as: design:create-component` with higher priority → replaces core task
- No `as` on either → both loaded (stored as array in `stage_loaded`)

---

## Requirement: resolveAllStages at create time

Called during `workflow create`. Resolves task files, rules, blueprints, config for every step via `resolveTaskFilesRich`. Results stored in `stage_loaded`.

- `expected_params` aggregated from task frontmatter; null defaults → `required: true`
- Subworkflow stages (`workflow: design-verify`, `each: scene`) resolved and stored in `subworkflows[<stage-name>]`

---

## Requirement: expandTasksFromParams

Computes concrete tasks from `stage_loaded` and `params`.

- `each: component` with array params → per-item tasks
- Already-expanded steps skipped; subworkflow stages skipped
- Each task receives `task_file`, `rules`, `blueprints`, `config_rules`, `config_instructions` from `stage_loaded`, `files` from `expandFileDeclarations`

---

## Requirement: Task ID generation

`generateTaskId` produces `<step-basename>-<6-char-hash>` from step name, params, index. Duplicates get numeric suffix.

---

## Requirement: Two expansion modes — plan and append

- **Plan mode** (`workflow done --task intake --params <json>`): replaces tasks, preserves done tasks, sets engine fields, marks first pending as `in-progress`
- **Append mode** (`workflow done --task <non-intake> --params <json>`): appends new tasks, merges params additively

---

## Requirement: checkWhen — two-source lookup

Resolves each `when` key from context first, then config as fallback. Returns matched key count on success, `false` on any failure.

- Context key takes precedence over config
- Config supports dot-path traversal (`frameworks.css: tailwind`)
- Array values use inclusion check (`extensions: canvas` matches `['canvas', 'drupal']`)
- Empty `when` → unconditional match at specificity 0 (if `requireWhen=false`)

---

## Requirement: resolveFiles — unified glob-and-filter

Globs markdown files, parses frontmatter, filters by `when`. With `requireWhen=true` (default), files without `when` skipped. Returns `ResolvedFile` with `specificity`, `path`, `name`, `frontmatter`.

---

## Requirement: validateAndMergeParams

- Required param missing → expansion error
- Item params merged with global params

---

## Requirement: File path expansion

`expandFilePath` expands `$VAR` from env map, `{{ param }}` (strict — throws on unknown), `{param}` (lenient — leaves unknown for runtime).

```
$DESIGNBOOK_DATA/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml
→ /home/app/.designbook/sections/dashboard/dashboard.section.scenes.yml
```

---

## Requirement: Before/after hooks

```yaml
before:
  - workflow: debo-sample-data
    execute: if-never-run
after:
  - workflow: debo-design-guideline
```

- Before hooks processed after intake completes, before executing tasks
- Execution policies: `always` (run if `reads:` satisfied), `if-never-run` (skip if workflow exists in archive), `ask` (prompt user)
- `reads:` files act as gate — hook skipped silently if missing
- After hooks always prompt user; user may accept or decline
- Hook-triggered workflows pass `--parent $WORKFLOW_NAME_A`; child stores `parent: <A-name>`

---

## Requirement: Resume check

- `workflow list` returns existing workflows → AI asks "Continue or start fresh?"
- Continue → reuse existing `$WORKFLOW_NAME`; fresh → `workflow create`
