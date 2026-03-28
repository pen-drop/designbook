---
title: Design Shell
description: Design the application shell — page component with header, content, and footer slots
stages:
  execute:
    steps: [intake, create-component, create-scene]
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
