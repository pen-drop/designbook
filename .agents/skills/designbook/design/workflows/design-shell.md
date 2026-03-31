---
title: Design Shell
description: Design the application shell — page component with header, content, and footer slots
stages:
  component:
    each: component
    steps: [create-component]
  scene:
    each: scene
    steps: [create-scene]
  test:
    each: scene
    steps: [storybook-preview, screenshot, resolve-reference, visual-compare, polish]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
