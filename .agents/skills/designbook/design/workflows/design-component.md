---
title: Design Component
description: Create a new UI component by gathering requirements interactively
stages:
  execute:
    steps: [intake, create-component]
engine: git-worktree
before:
  - workflow: css-generate
    execute: if-never-run
---
