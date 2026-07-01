---
title: Design Entity
description: Build one entity view-mode (mapping + sample data) and preview it standalone
params:
  entity_type: { type: string, default: "" }
  bundle: { type: string, default: "" }
  view_mode: { type: string, default: "" }
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
  selector: { type: string, default: "" }
  breakpoints:
    type: array
    default: []
stages:
  reference:
    steps: [extract-reference]
    isolate: true
  intake:
    steps: [intake]
    domain: [data-model]
    interactive: true
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
