---
title: Config Verify
description: Reconcile a backend render (produced from a config) against the Storybook render as the frozen reference
params:
  config:
    type: string
    description: >
      Backend config id — the verification subject. Drives both the Storybook
      story (the reference) and the backend render URL (the candidate).
    examples: ["node.article.default", "paragraph.signage.full"]
  config_type:
    type: string
    default: entity_view_display
    enum: [entity_view_display]
    description: >
      Kind of backend config. v1 supports entity_view_display only; the dispatch
      stays open so further config-types can be added without reworking the flow.
  story_id:
    type: string
    resolve: story_id
    from: config
    sources: [scenes]
  render_url:
    type: string
    resolve: render_url
    from: config
  reference_url:
    type: string
    resolve: story_url
    from: story_id
  reference_dir:
    type: string
    resolve: reference_folder
    from: reference_url
stages:
  intake:
    steps: [intake]
  setup-compare:
    steps: [setup-compare]
  reference:
    steps: [ensure-baseline]
  capture:
    steps: [capture-backend]
  compare:
    steps: [compare]
  triage:
    steps: [triage-config]
  polish:
    steps: [polish-config]
  re-capture:
    steps: [re-capture-backend]
  re-compare:
    steps: [re-compare]
  outtake:
    steps: [outtake]
engine: direct
before:
  - workflow: css-generate
    execute: always
---

Reconcile a real backend render against Storybook. This is `design-verify` with the
reference axis flipped:

| | design-verify | config-verify |
|---|---|---|
| Reference (frozen baseline) | design image / reference URL | **Storybook render** |
| Candidate (measured) | Storybook render | **backend render** (from a config) |
| Fix-pass target | Storybook component / CSS | **backend config** |

`config` is the only real input; the workflow derives everything else from it. `story_id`
resolves the Storybook story the config maps to; `render_url` resolves the backend render
URL via the `render_url` resolver (which runs a project-supplied command — the backend
integration provides it, core adds no backend code); `reference_url` resolves to that
story's Storybook iframe, so the reused `ensure-baseline` stage freezes the **Storybook**
render as the frozen baseline instead of a design reference.

The `capture`/`re-capture` stages screenshot the **backend render** at `render_url` as the
candidate; `compare`/`re-compare` diff it against the frozen Storybook baseline with the
same `compare-images` CLI (severity / diff_percent). The `triage`/`polish` stages apply a
single fix pass on the **backend config** — never the Storybook component, which is the
reference. They use the config-verify-specific `triage-config`/`polish-config` steps (not the
component-oriented `triage`/`polish` of design-verify) so the consolidated fix instructions
name the backend config as the fix surface, not the frozen reference component.

Always regenerate CSS before measuring (`before: css-generate, execute: always`) — same
rationale as design-verify: measure against fresh CSS, not stale utilities or undefined
token variables.

The flow is measure → fix once → re-measure. `compare` yields the first-shot measurement;
`triage`/`polish` apply the single config fix; `re-capture`/`re-compare` re-measure to yield
the final measurement. Distinct `capture-backend`/`re-capture-backend` step names keep each
measurement's backend captures unambiguous and separate from Storybook capture.
