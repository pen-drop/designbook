---
title: "Intake"
trigger:
  steps: [sync-verify:intake]
domain: [design.verify, sync-verify]
params:
  type: object
  required: [story, story_id]
  properties:
    story:
      type: string
      description: "The verification subject — a Storybook story identifier."
      examples: ["node.article.default", "paragraph.signage.full", "landing"]
    kind:
      type: string
      enum: [config, scene]
      description: "Top-level render kind, inferred from the story's Storybook group; selects the candidate render."
    selector:
      type: string
      default: ""
      description: "Optional backend-side isolation selector; its presence selects the config sub-mode (see the subject-mapping rule)."
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
    render_url:
      type: string
      default: ""
      description: "Resolved backend render URL for the candidate side (already resolved in workflow scope)."
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [breakpoints, elements]
  properties:
    breakpoints:
      type: array
      items: { type: string }
    elements:
      type: array
      items:
        $ref: ../schemas.yml#/Element
---

# Intake: Sync Verify

Reconcile the backend render of `story` against the Storybook render of the resolved
`story_id`. The Storybook render is the live reference — re-captured every run by the
reference stage; the backend render is the candidate. `story_id` and `render_url` are
pre-resolved by the workflow engine before this task runs.

The loaded subject-mapping rule defines how the story maps to a `story_id` and which
subjects are compared for the resolved `kind` (and, within `config`, the `selector`
sub-mode) — read it and apply its mapping.

## Step 1: Select Breakpoints

Breakpoints are a required result — the workflow engine prompts the user to select which
breakpoints to test. List available breakpoints from the design tokens with pixel values.

## Step 2: Resolve Elements

Emit `elements` — the comparison subjects as `Element { id, selector, reference_selector }`.
Per element: `id` is the semantic subject label used in filenames and scores; `selector` is
the selector that isolates the subject in the **backend** render (candidate side);
`reference_selector` is the selector that isolates the same subject in the **Storybook**
render (baseline side). The subject-mapping rule states, per `kind`, how the subject and
each side's selector are derived — including the `scene` case where both selectors are
empty (full-page capture).

## Step 3: Ensure Storybook is running

The Storybook render is the reference baseline, so Storybook must be running and current
before the reference stage re-captures it. Check status; start (or restart when component
files are newer) and wait for readiness. On startup failure, report the logs and pause.

## Step 4: Write Results and Complete

Pass `breakpoints` (user selection) and `elements` (the resolved subject list) to the next
stage via data results.
