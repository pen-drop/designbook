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

## Step 0: Inspection (Before Any Fix)

Before applying any fix, inspect what exists:

1. **Read the component files** referenced by `file_hint` and any related templates
2. **Read the scene YAML** for the affected scene (`scene` param)
3. **Open the Storybook URL** and verify current rendering state — understand what the issue looks like before changing code

If `design_hint` is available in params (passed via `each: issues` expansion from intake), cross-reference the hint's styles, fonts, and interactive patterns when evaluating fixes. Prefer hint values over guessing.

Only proceed to the fix after completing the inspection.

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

## Step 4: Mark Task Done

Mark the workflow task as done. The task status IS the issue status — no separate issue tracking needed.

## Output

```
## Polish: {description}

Fixed: {description}
File: {file_hint}
Changes: fontSize 14px → 48px, fontFamily 'Nunito Sans' → 'Inter'
```
