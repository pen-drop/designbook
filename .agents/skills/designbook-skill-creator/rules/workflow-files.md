---
name: workflow-files
description: Authoring + validation rules for workflow files (workflows/*.md). Load before creating or editing any workflow file; load alongside common-rules.md.
applies-to:
  - workflows/*.md
  - "**/workflows/*.md"
---

# Workflow File Rules

Load together with [common-rules.md](common-rules.md).

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
