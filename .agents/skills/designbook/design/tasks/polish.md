---
name: designbook:design:polish
title: "Polish {id}"
description: "{description}"
when:
  steps: [polish]
priority: 50
params:
  id: ~
  scene: ~
  storyId: ~
  checkKey: ~
  severity: ~
  description: ~
  file_hint: ~
  properties: []
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Polish

Fixes a single consolidated issue from the triage stage. Each polish task receives one issue with actionable description and concrete values.

## Params (from `each: issues` expansion)

| Param | Source | Description |
|---|---|---|
| `id` | issue | Issue ID (e.g. `issue-001`) |
| `scene` | issue | Scene reference |
| `storyId` | issue | Story identifier |
| `checkKey` | issue | Check key (e.g. `sm--header`, `xl--markup`) |
| `severity` | issue | `critical` or `major` |
| `description` | issue | Actionable work instruction from triage |
| `file_hint` | issue | Primary file to edit |
| `properties` | issue | Array of `{property, expected, actual}` (extraction issues) |

## Step 1: Understand the Issue

Read the `description` — it contains:
- Which element is affected
- What properties need to change (with VON → NACH values)
- Which file to edit

If `properties` array is present, use the concrete values directly.
If `file_hint` is present, start there.

## Step 2: Rule Compliance Check

Before applying any fix, verify it does not contradict any loaded rules for the current stage.

## Step 3: Fix Code

Edit the file(s) to resolve the issue. Keep changes minimal and focused.

**Change scope:**

| In scope | Out of scope |
|----------|-------------|
| Component templates | `design-tokens.yml` (requires tokens workflow) |
| Scene definitions (`*.scenes.yml`) | Workflow configuration |
| Story files (`*.story.yml`) | Component schema structure |
| CSS framework output files | |

When CSS output values are changed to match the reference, the polish report MUST include a reconciliation note: "CSS output values adjusted — reconcile with `design-tokens.yml` via tokens workflow."

## Step 4: Update Issue in Meta

Mark the issue as done via CLI. Use `--update <index>` with the numeric index of the issue within its check:
```bash
_debo story issues --scene ${scene} --check ${checkKey} --update <index> --json '{"status":"done","result":"pass"}'
```

To find the correct index, list issues first: `_debo story issues --scene ${scene} --check ${checkKey}` and match by `id`.

## Output

```
## Polish: {description}

Fixed: {description}
File: {file_hint}
Changes: fontSize 14px → 48px, fontFamily 'Nunito Sans' → 'Inter'
```
