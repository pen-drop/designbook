---
name: workflow-files
description: Authoring + validation rules for workflow files (workflows/*.md). Load before creating or editing any workflow file; load alongside common-rules.md.
applies-to:
  - workflows/*.md
  - "**/workflows/*.md"
---

# Workflow File Rules

Load together with [common-rules.md](common-rules.md).

## Workflow File Format

Workflow files live at `.agents/skills/<skill>/<concern>/workflows/<workflow-id>.md`. The filename (minus `.md`) becomes the workflow's ID — `design/workflows/design-component.md` defines workflow `design-component`.

### Frontmatter Fields

| Field | Type | Notes |
|-------|------|-------|
| `name:` | string | Canonical name. Defaults to filename (minus `.md`) if omitted — usually omit. |
| `title:` | string | Human-readable title shown in UI surfaces. |
| `description:` | string | One-liner summary. |
| `stages:` | map | Stage-name → `{ steps: [<step-name>, ...] }`. See below. |
| `track:` | bool | Default `true`. Set `false` for untracked utility workflows (e.g. `sb`) that don't write run state. |
| `engine:` | string | Execution engine. Always `direct` for designbook workflows; omit only for untracked workflows. |
| `params:` | map | Workflow inputs; see [`resources/schemas.md`](../resources/schemas.md) for `resolve:` / `from:`. |

### `stages:`

Each key is a stage name; its `steps:` lists step names that resolve to `tasks/<step>.md` in any loaded skill. See [task-files.md](task-files.md) for task filename conventions and workflow-qualified step names.

A stage may also declare `domain: [<name>, ...]` to seed the rule/blueprint context for every step in that stage (additive to any `domain:` a task itself declares):

```yaml
stages:
  data:
    steps: [define-data-model]
    domain: [data-model]
```

A stage may also declare `isolate: true` to run that stage's task(s) in a dedicated subagent context instead of inline in the orchestrator. Default is `false` (or absent — omit rather than spell out `false`). Use `isolate: true` on context-heavy stages of long workflows; lightweight stages such as intake, setup, and outtake should stay inline. The engine surfaces the flag on each `step_resolved` entry and on `workflow instructions`; the driver acts on it per `resources/workflow-execution.md`. An isolated stage that contains multiple `each:`-expanded tasks runs as **one** subagent that loops over the sibling tasks, not one subagent per task.

```yaml
stages:
  create-component:
    steps: [create-component]
    isolate: true
```

### Example

```yaml
---
title: Design Component
description: Create a new UI component from a design reference
params:
  component_id: { type: string }
  reference_url: { type: string, default: "" }
engine: direct
stages:
  intake:
    steps: [intake]
  component:
    steps: [create-component]
---
```

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

**Note:** `trigger.steps` is only used in **task files** for step matching. Rules and blueprints use `trigger.domain` instead — see [rule-files.md](rule-files.md) for the domain matching model.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| WORKFLOW-01 | warning | No `stages.*.steps` entry contains a workflow-qualified name (a `:`-separated step with a workflow prefix) — step names inside a workflow definition must be plain | body |
| WORKFLOW-02 | warning | If any `stages.*.isolate` is present, it is a boolean | body |
