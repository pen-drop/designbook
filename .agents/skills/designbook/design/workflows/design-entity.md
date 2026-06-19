---
title: Design Entity
description: Build one entity view-mode (mapping + demo data) and preview it standalone
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
  entity-mapping:
    steps: [map-entity]
  demo-data:
    steps: [create-entity-demo]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
