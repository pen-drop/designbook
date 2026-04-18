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
---
