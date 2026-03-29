---
title: Design Shell
description: Design the application shell — page component with header, content, and footer slots
stages:
  execute:
    steps: [intake, create-component, create-scene]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
