---
when:
  steps: [design-verify:intake]
params:
  scene_id: { type: string }
  component_id: { type: string }
  reference: { type: array, default: [] }
result:
  scene_id:
    type: string
  component_id:
    type: string
  reference:
    type: array
    items:
      $ref: ../schemas.yml#/Reference
  breakpoints:
    type: array
    items: { type: string }
reads:
  - path: $STORY_DIR/design-reference.md
    optional: true
---

# Intake: Design Verify

Visual testing for a single scene or component. Works in two modes:

- **Scene mode**: `params.scene` is set -- verify a scene (shell or section screen)
- **Component mode**: `params.component` is set -- verify a single component

Can be called as a subworkflow (from design-shell/screen/component after-hook) or standalone.

## Context Detection

- **`params.scene_id` is set:** Scene mode. The `extract-reference` stage has already resolved `$STORY_DIR`.
- **`params.component_id` is set:** Component mode. The `extract-reference` stage has already resolved `$STORY_DIR`.
- **Neither is set:** Standalone -- proceed with Step 1.

## Step 1: Identify Target (standalone only)

Ask the user what to verify:

> "What should I verify?
> - A scene (e.g. `design-system:shell`, `homepage:landing`)
> - A component (e.g. `card`, `header`)
>
> Enter the scene name or component name:"

Set `params.scene_id` or `params.component_id` from the answer.

## Step 2: Resolve Reference

If `$STORY_DIR/design-reference.md` exists (from a prior build workflow or the extract-reference stage):
- Read the `Source:` line to get the reference URL
- Build the `reference` array: `[{"type": "url", "url": "<url>", "threshold": 3, "title": "<label>"}]`
- Skip asking the user for a reference

If no `design-reference.md` and `params.reference` is empty:

> "What is the design reference?
> - A URL to the design source
> - 'skip' to verify without reference"

Set `params.reference` from the answer.

## Step 3: Select Breakpoints

Breakpoints are collected as a required result -- the workflow engine triggers `waiting_for` automatically, prompting the user to select which breakpoints to test.

List available breakpoints from `design-tokens.yml` with pixel values.

## Step 4: Ensure Storybook is running

```bash
_debo storybook status
```

- **If running:** check freshness -- if component files are newer than `started_at`, restart with `_debo storybook start --force`.
- **If not running:** `_debo storybook start`. Wait for `{ ready: true }`.
- **If startup fails:** report errors from `_debo storybook logs` and pause.

## Step 5: Write Results and Complete

Pass `scene_id`, `component_id`, `reference`, and `breakpoints` to the next stage via data results.

- `scene_id`: from params (or empty string if component mode)
- `component_id`: from params (or empty string if scene mode)
- `reference`: the array from Step 2
- `breakpoints`: from user input (Step 3)
