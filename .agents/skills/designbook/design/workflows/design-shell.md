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
  scene_path:
    type: string
    resolve: scene_path
    from: section.id
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
  regions:
    type: string
    default: "header,footer"
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
  component:
    steps: [create-component]
  scene:
    steps: [create-scene-file, create-scene]
  validate:
    steps: [validate]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
after:
  - workflow: design-verify
---
