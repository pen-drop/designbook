---
when:
  steps: [design-verify:intake]
params:
  scene: { type: string }
  reference: { type: array, default: [] }
  breakpoints: { type: array, default: [] }
result:
  scene:
    type: string
    title: Scene
  reference:
    type: array
    title: Design Reference
    default: []
    items:
      $ref: ../schemas.yml#/Reference
  breakpoints:
    type: array
    title: Breakpoints
    default: []
    items: { type: string }
---

# Intake: Design Verify

Visual testing for a single scene. Called once per scene — either as subworkflow (from design-shell/design-screen) or standalone.

## Context Detection

- **`params.scene` is set:** Subworkflow — skip dialog, go to Step 2.
- **`params.scene` is NOT set:** Standalone — proceed with Step 1.

## Step 1: Identify Scene and Reference (standalone only)

Ask the user which scene to verify and how:

> "Which scene should I verify? (e.g. `design-system:shell`, `homepage:landing`)"

Then ask for the reference:

> "What is the design reference?
> - Stitch screen ID (e.g. `projects/123/screens/abc`)
> - URL to a design screenshot
> - Or 'skip' to verify without reference"

Then ask for breakpoints:

> "Which breakpoints to test? (default: all from design-tokens)"

Set `params.scene` and `params.reference` from the answers. `reference` is an array:
```json
[{"type": "stitch", "url": "projects/...", "threshold": 3, "title": "Screen Name"}]
```

Reference entries describe the design source only — no `breakpoint` field. Breakpoints are resolved separately in Step 3a.

## Step 2: Ensure Storybook is running

```bash
_debo storybook status
```

- **If running:** check freshness — if component files are newer than `started_at`, restart with `_debo storybook start --force`.
- **If not running:** `_debo storybook start`. Wait for `{ ready: true }`.
- **If startup fails:** report errors from `_debo storybook logs` and pause.

## Step 3: Write Results and Complete

Pass `scene`, `reference`, and `breakpoints` to the next stage via data results. The `setup-compare` stage handles story creation and checks resolution.

- `reference`: the array from Step 1 (or `params.reference` in subworkflow mode)
- `breakpoints`: from user input (standalone) or empty array (subworkflow — setup-compare resolves from design-tokens)
