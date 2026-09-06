---
title: Sync Verify
description: >-
  Reconcile a real backend render against the Storybook render of a story as the live reference, dispatched on
  the story's kind
params:
  story:
    type: string
    description: >
      The verification subject — a Storybook story identifier. For a `config` kind it is the config-entity /
      entity-view-mapping id (`<entity_type>.<bundle>.<view_mode>`); for a `scene` kind it is the Scene id
      (SceneDef.name). Drives both the Storybook story (the live reference) and the backend render URL (the
      candidate).
    examples:
      - node.article.default
      - paragraph.signage.full
      - landing
  kind:
    type: string
    enum:
      - config
      - scene
    description: >
      The top-level render kind, inferred from the story's Storybook group. `config` = an isolated single
      render (an `Entities/*` story); `scene` = a whole page (a `Designbook/Sections/*/Scenes` or
      `Designbook/Design System` story). `sync-verify` dispatches its candidate render on this binary. Within
      `config` the presence of a `selector` selects the sub-mode (see `selector`). See the loaded
      subject-mapping rule for the inference and the per-kind candidate render.
  selector:
    type: string
    default: ''
    description: >
      Optional CSS selector isolating the subject in the backend (candidate) render. Only meaningful for
      `kind: config`: a non-empty selector selects the config-entity sub-mode (isolate the display's output on
      the entity's canonical page); an empty selector selects the entity-view-mapping sub-mode (the module
      preview route, already isolated). For `kind: scene` it stays empty — a scene is captured full-page.
  story_id:
    type: string
  render_url:
    type: string
  reference_url:
    type: string
  reference_dir:
    type: string
stages:
  setup-compare:
    steps:
      - setup-compare
  reference:
    steps:
      - ensure-baseline-live
  capture:
    steps:
      - capture-backend
  compare:
    steps:
      - compare
  triage:
    steps:
      - triage-config
  outtake:
    steps:
      - outtake
---

Template for the planning agent. Use the ordered steps as building blocks. Enumerate repeated targets during intake and write each concrete task explicitly; these stages do not execute or expand at runtime.
