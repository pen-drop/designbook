---
trigger:
  steps: [design-verify:intake]
domain: [design.verify]
params:
  type: object
  required: [story_id]
  properties:
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
    reference: { type: array, default: [] }
    reference_dir: { type: string, default: "" }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [reference, breakpoints]
  properties:
    reference:
      type: array
      items:
        $ref: ../schemas.yml#/Reference
    breakpoints:
      type: array
      items: { type: string }
---

# Intake: Design Verify

Visual testing for a single story. The `story_id` is pre-resolved by the workflow engine's param resolver before this task runs.

Can be called as a subworkflow (from design-shell/screen/component after-hook) or standalone.

## Step 1: Resolve Reference

If `$reference_dir` is non-empty and `$reference_dir/extract.json` exists (from a prior build workflow or the extract-reference stage):
- Read the `source` field from `extract.json` to get the reference URL
- Build the `reference` array: `[{"type": "url", "url": "<url>", "threshold": 3, "title": "<label>"}]`
- Skip asking the user for a reference

If no `$reference_dir` and `params.reference` is empty:

> "What is the design reference?
> - A URL to the design source
> - 'skip' to verify without reference"

Set `params.reference` from the answer.

## Step 2: Select Breakpoints

Breakpoints are collected as a required result -- the workflow engine triggers `waiting_for` automatically, prompting the user to select which breakpoints to test.

List available breakpoints from the design tokens with pixel values.

## Step 3: Ensure Storybook is running

```bash
_debo storybook status
```

- **If running:** check freshness -- if component files are newer than `started_at`, restart with `_debo storybook start --force`.
- **If not running:** `_debo storybook start`. Wait for `{ ready: true }`.
- **If startup fails:** report errors from `_debo storybook logs` and pause.

## Step 4: Write Results and Complete

Pass `reference` and `breakpoints` to the next stage via data results.

- `reference`: the array from Step 1
- `breakpoints`: from user input (Step 2)
