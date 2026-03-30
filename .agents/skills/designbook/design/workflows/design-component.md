---
title: Design Component
description: Create a new UI component by gathering requirements interactively
stages:
  execute:
    steps: [intake, create-component]
  test:
    steps: [screenshot, resolve-reference, visual-compare, polish]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
