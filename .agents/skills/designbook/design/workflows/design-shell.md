---
title: Design Shell
description: Design the application shell — page component with header, content, and footer slots
stages:
  intake:
    steps: [design-shell:intake]
  component:
    each: component
    steps: [create-component]
  scene:
    each: scene
    steps: [design-shell:create-scene]
  outtake:
    steps: [design-shell:outtake]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
