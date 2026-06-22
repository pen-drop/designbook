---
title: "Intake"
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
  required: [reference, breakpoints, regions]
  properties:
    reference:
      type: array
      items:
        $ref: ../schemas.yml#/Reference
    breakpoints:
      type: array
      items: { type: string }
    regions:
      type: array
      items:
        $ref: ../schemas.yml#/Region
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

- **Running as a child workflow** (a parent workflow is set): do not prompt. Proceed reference-free with `params.reference` left empty — verify runs without a reference. (When the parent declares an `after: design-verify` hook gated on a reference being present, this path should not be reached; this guard is defense-in-depth.)
- **Running standalone** (no parent): ask the user.

> "What is the design reference?
> - A URL to the design source
> - 'skip' to verify without reference"

Set `params.reference` from the answer.

## Step 2: Select Breakpoints

Breakpoints are collected as a required result -- the workflow engine triggers `waiting_for` automatically, prompting the user to select which breakpoints to test.

List available breakpoints from the design tokens with pixel values.

## Step 2b: Resolve Regions

Emit `regions` — the review surfaces as `Region { id, selector }` pairs. A region is a
named selector; `id` is the clean filename/score label, `selector` is the CSS crop target
applied to BOTH the story and the reference capture (`""` ⇒ full page).

- **Shell** verification → one region per shell landmark, with the reference's **real**
  selector — e.g. `{ id: header, selector: <reference header selector> }`,
  `{ id: footer, selector: <reference footer selector> }`. Do NOT assume semantic
  landmarks (`header`/`[role=banner]`); use the actual element of the reference site
  (e.g. an Angular app exposes `app-site-header` / `app-footer`).
- **Entity / component / screen** with a target element → `[{ id: full, selector: <selector> }]`
  (e.g. `app-signage`).
- **No specific surface** → `[{ id: full, selector: "" }]` (whole page).

Take selectors from the workflow input / case prompt when given. A selector that matches
no element on one side falls back to that side's full capture (never fails).

## Step 3: Ensure Storybook is running

```bash
_debo storybook status
```

- **If running:** check freshness -- if component files are newer than `started_at`, restart with `_debo storybook start --force`.
- **If not running:** `_debo storybook start`. Wait for `{ ready: true }`.
- **If startup fails:** report errors from `_debo storybook logs` and pause.

## Step 4: Write Results and Complete

Pass `reference`, `breakpoints`, and `regions` to the next stage via data results.

- `reference`: the array from Step 1
- `breakpoints`: from user input (Step 2)
- `regions`: the `Region { id, selector }` list from Step 2b
