---
title: Design Component
description: Create a new UI component by gathering requirements interactively
stages:
  intake:
    steps: [intake]
  component:
    steps: [create-component]
  test:
    steps: [storybook-preview, screenshot, resolve-reference, visual-compare, polish]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
