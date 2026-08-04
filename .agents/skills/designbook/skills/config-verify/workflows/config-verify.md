---
title: Config Verify
description: Reconcile a backend render (produced from a config) against the Storybook render as the live reference
params:
  config:
    type: string
    description: >
      The verification subject. For `entity_view_display` this is the display config id;
      for `scene` it is the Scene id (SceneDef.name). Drives both the Storybook story
      (the reference) and the backend render URL (the candidate).
    examples: ["node.article.default", "paragraph.signage.full", "article-detail"]
  config_type:
    type: string
    default: entity_view_display
    enum: [entity_view_display, scene]
    description: >
      Kind of verification subject. `entity_view_display` compares a display config
      against a selector-isolated entity render. `scene` compares a whole synced page
      against the Scene's story — candidate is the page's real URL, captured full-page.
      The dispatch stays open so further subjects can be added without reworking the flow.
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
    steps: [ensure-baseline-live]
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
| Reference (live baseline) | design image / reference URL | **Storybook render** |
| Candidate (measured) | Storybook render | **backend render** (from a config) |
| Fix-pass target | Storybook component / CSS | **backend config** |

`config` is the only real input; the workflow derives everything else from it. `story_id`
resolves the Storybook story the config maps to; `render_url` resolves the backend render
URL via the `render_url` resolver (which runs a project-supplied command — the backend
integration provides it, core adds no backend code); `reference_url` resolves to that
story's Storybook iframe, and the `ensure-baseline-live` stage **re-captures** that
Storybook render every run instead of reusing a stored PNG — the reference is live, not
frozen. That's exactly why `config-verify` uses its own `ensure-baseline-live` reference
step instead of reusing `design-verify`'s `ensure-baseline` stage, which freezes its
baseline on first capture.

`config_type` selects what the subject is; everything else in the flow is identical.
For `entity_view_display`, `config` is the display id and the candidate is a
selector-isolated entity render. For `scene`, `config` is the Scene id: `story_id`
resolves the Scene's story through the same resolver (`from: config`, `sources: [scenes]`),
and `render_url` resolves the **real URL of the synced page** — the page as it exists after
`sync-to` synced the Scene, never a preview route and never an isolated entity render. The
`scene` candidate is captured **full-page** (no isolation selector), so the whole page —
shell, header, content, footer — is compared against the Scene's story, which renders the
same whole page. The backend integration supplies the scene render command as a
command string; core adds no backend code.

The `capture`/`re-capture` stages screenshot the **backend render** at `render_url` as the
candidate; `compare`/`re-compare` diff it against the live Storybook baseline with the
same `compare-images` CLI (severity / diff_percent). The `triage`/`polish` stages apply a
single fix pass on the **backend config** — never the Storybook component, which is the
reference. They use the config-verify-specific `triage-config`/`polish-config` steps (not the
component-oriented `triage`/`polish` of design-verify) so the consolidated fix instructions
name the backend config as the fix surface, not the Storybook reference component.

Always regenerate CSS before measuring (`before: css-generate, execute: always`) — same
rationale as design-verify: measure against fresh CSS, not stale utilities or undefined
token variables.

The flow is measure → fix once → re-measure. `compare` yields the first-shot measurement;
`triage`/`polish` apply the single config fix; `re-capture`/`re-compare` re-measure to yield
the final measurement. Distinct `capture-backend`/`re-capture-backend` step names keep each
measurement's backend captures unambiguous and separate from Storybook capture.
