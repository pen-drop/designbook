---
title: Design Component
description: Create a new UI component from a design reference
params:
  component_id: { type: string }
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
  breakpoints:
    type: string
    resolve: breakpoints
    from: story_id
  components:
    type: array
    items:
      $ref: ../schemas.yml#/Component
stages:
  intake:
    steps: [intake]
  component:
    steps: [create-component]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
after:
  - workflow: design-verify
    when: "components.length <= 1"
---

## Conditional design-verify

The `design-verify` follow-up suggestion is suppressed when the workflow was
seeded with a batch of pre-supplied components (`components.length > 1`).
Verification per component would explode the iteration cost and is not
meaningful during a one-shot migration. Operators can run `design-verify`
manually per component once the migration is settled.

