---
title: Design Entity
description: Build one entity view-mode (mapping + sample data) and preview it standalone
params:
  entity_type: { type: string, default: "" }
  bundle: { type: string, default: "" }
  view_mode: { type: string, default: "" }
stages:
  intake:
    steps: [intake]
    domain: [data-model]
  component:
    steps: [create-component]
    isolate: true
  sample-data:
    steps: [create-sample-data]
  entity-mapping:
    steps: [map-entity]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
