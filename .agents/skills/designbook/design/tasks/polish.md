---
name: designbook:design:polish
title: "Polish {{ issue.id }}"
description: "{{ issue.description }}"
trigger:
  steps: [polish]
priority: 50
params:
  type: object
  required: [issue]
  properties:
    issue:
      type: object
      $ref: ../schemas.yml#/Issue
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
each:
  issue:
    expr: "issues"
    schema: { $ref: ../schemas.yml#/Issue }
---

# Polish

Fixes a single consolidated issue from the triage stage. Each polish task receives one issue with actionable description and concrete values.

## Params (from `each: issues` expansion)

| Field | Description |
|---|---|
| `issue.id` | Issue ID (e.g. `issue-001`) |
| `issue.scene_id` | Scene reference |
| `issue.story_id` | Story identifier |
| `issue.checkKey` | Check key (e.g. `sm--header`, `xl--markup`) |
| `issue.severity` | `critical` or `major` |
| `issue.description` | Actionable work instruction from triage |
| `issue.file_hint` | Primary file to edit |
| `issue.properties` | Array of `{property, expected, actual}` (extraction issues) |

## Step 0: Inspection (Before Any Fix)

Before applying any fix, inspect what exists:

1. **Read the component files** referenced by `issue.file_hint` and any related templates
2. **Read the scene YAML** for the affected scene (`issue.scene_id`)
3. **Open the Storybook URL** and verify current rendering state — understand what the issue looks like before changing code

Only proceed to the fix after completing the inspection.

## Step 1: Understand the Issue

Read the `issue.description` — it contains:
- Which element is affected
- What properties need to change (with VON → NACH values)
- Which file to edit

If `issue.properties` array is present, use the concrete values directly.
If `issue.file_hint` is present, start there.

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
## Polish: {{ issue.description }}

Fixed: {{ issue.description }}
File: {{ issue.file_hint }}
Changes: fontSize 14px → 48px, fontFamily 'Nunito Sans' → 'Inter'
```
