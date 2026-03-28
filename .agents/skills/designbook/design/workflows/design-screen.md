---
title: Design Screen
description: Create screen design components for a section
stages:
  execute:
    steps: [design-screen:intake, create-component, create-sample-data, design-screen:map-entity, design-screen:create-scene]
  preview:
    steps: [storybook-preview]
    params:
      user_approved:
        type: boolean
        prompt: "Preview unter {preview_url} — passt alles?"
engine: git-worktree
before:
  - workflow: css-generate
    execute: if-never-run
---
