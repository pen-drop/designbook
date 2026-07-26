---
title: "Intake"
trigger:
  steps: [config-verify:intake]
domain: [design.verify, config-verify]
params:
  type: object
  required: [config, story_id]
  properties:
    config:
      type: string
      description: "Backend config id — the verification subject."
    config_type:
      type: string
      default: entity_view_display
      enum: [entity_view_display]
      description: "Kind of backend config; selects the config-type mapping rule."
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

# Intake: Config Verify

Reconcile the backend render of `config` against the Storybook render of the resolved
`story_id`. The Storybook render is the live reference — re-captured every run by the
reference stage; the backend render is the candidate. `story_id` and `render_url` are
pre-resolved by the workflow engine before this task runs.

The loaded config-type rule for `config_type` defines how the config maps to a `story_id`
and which subjects are compared — read it and apply its mapping.

## Step 1: Select Breakpoints

Breakpoints are a required result — the workflow engine prompts the user to select which
breakpoints to test. List available breakpoints from the design tokens with pixel values.

## Step 2: Resolve Elements

Emit `elements` — the comparison subjects as `Element { id, selector, reference_selector }`.
Per element: `id` is the semantic subject label used in filenames and scores; `selector` is
the selector that isolates the subject in the **backend** render (candidate side);
`reference_selector` is the selector that isolates the same subject in the **Storybook**
render (baseline side). The config-type rule states how the subject and each side's selector
are derived from the config.

## Step 3: Ensure Storybook is running

The Storybook render is the reference baseline, so Storybook must be running and current
before the reference stage re-captures it. Check status; start (or restart when component
files are newer) and wait for readiness. On startup failure, report the logs and pause.

## Step 4: Write Results and Complete

Pass `breakpoints` (user selection) and `elements` (the resolved subject list) to the next
stage via data results.
