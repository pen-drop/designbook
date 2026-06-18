---
title: Design Shell
description: Design the application shell -- page component with header, content, and footer slots
params:
  section:
    type: object
    default:
      id: shell
      group: "Designbook/Design System"
      title: "Shell"
      status: planned
  scene_id:
    type: string
    default: design-system:shell
  story_id:
    type: string
    resolve: story_id
    from: scene_id
  scene_path:
    type: string
    resolve: scene_path
    from: section.id
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
  breakpoints:
    type: array
    default: []
  regions:
    type: array
    default: [header, footer]
stages:
  reference:
    steps: [extract-reference]
    isolate: true
  intake:
    steps: [intake]
  component:
    steps: [create-component]
    isolate: true
  scene:
    steps: [create-scene-file, create-scene]
    isolate: true
  validate:
    steps: [validate]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
after:
  - workflow: design-verify
    when: "reference_url != ''"
    params:
      story_id: story_id
      reference_url: reference_url
---
