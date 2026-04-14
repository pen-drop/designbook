---
title: Design Component
description: Create a new UI component from a design reference
params:
  component_id: { type: string }
stages:
  reference:
    steps: [extract-reference]
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
