---
title: Sync Verify
description: Reconcile a real backend render against the Storybook render of a story as the live reference, dispatched on the story's kind
params:
  story:
    type: string
    description: >
      The verification subject — a Storybook story identifier. For a `config` kind it is
      the config-entity / entity-view-mapping id (`<entity_type>.<bundle>.<view_mode>`);
      for a `scene` kind it is the Scene id (SceneDef.name). Drives both the Storybook story
      (the live reference) and the backend render URL (the candidate).
    examples: ["node.article.default", "paragraph.signage.full", "landing"]
  kind:
    type: string
    enum: [config, scene]
    description: >
      The top-level render kind, inferred from the story's Storybook group.
      `config` = an isolated single render (an `Entities/*` story); `scene` = a whole page
      (a `Designbook/Sections/*/Scenes` or `Designbook/Design System` story). `sync-verify`
      dispatches its candidate render on this binary. Within `config` the presence of a
      `selector` selects the sub-mode (see `selector`). See the loaded subject-mapping rule
      for the inference and the per-kind candidate render.
  selector:
    type: string
    default: ""
    description: >
      Optional CSS selector isolating the subject in the backend (candidate) render.
      Only meaningful for `kind: config`: a non-empty selector selects the config-entity
      sub-mode (isolate the display's output on the entity's canonical page); an empty
      selector selects the entity-view-mapping sub-mode (the module preview route,
      already isolated). For `kind: scene` it stays empty — a scene is captured full-page.
  story_id:
    type: string
    resolve: story_id
    from: story
    sources: [scenes]
  render_url:
    type: string
    resolve: render_url
    from: story
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

| | design-verify | sync-verify |
|---|---|---|
| Reference (live baseline) | design image / reference URL | **Storybook render** |
| Candidate (measured) | Storybook render | **backend render** |
| Fix-pass target | Storybook component / CSS | **backend config** |

`story` is the only real input; the workflow derives everything else from it. `story_id`
resolves the Storybook story the subject maps to; `render_url` resolves the backend render
URL via the `render_url` resolver (which runs a project-supplied command — the backend
integration provides it, core adds no backend code); `reference_url` resolves to that
story's Storybook iframe, and the `ensure-baseline-live` stage **re-captures** that
Storybook render every run instead of reusing a stored PNG — the reference is live, not
frozen. That's exactly why `sync-verify` uses its own `ensure-baseline-live` reference
step instead of reusing `design-verify`'s `ensure-baseline` stage, which freezes its
baseline on first capture.

## kind dispatch (candidate render)

`kind` selects how the candidate render is produced; the reference (the live Storybook
story), the shared compare/triage/polish engine, and the `ScoreReport` are identical
across all kinds. The loaded subject-mapping rule states how the story maps to its
comparison subject and each side's selector per kind; the backend integration supplies the
concrete render command as a command string (core adds no backend code):

- **`config`** — an isolated single render, one of two sub-modes chosen by `selector`:
  - **config-entity** (selector present) — candidate = the entity's **canonical page**,
    isolated by `selector` against the reference story's isolated root.
  - **entity-view-mapping** (selector empty) — candidate = the designbook module's
    **preview route** render, already isolated; reference = the isolated entity story.
- **`scene`** — candidate = the **real URL of the synced page** (the page `sync-to`
  created), captured **full-page** with an empty selector; reference = the Scene's story,
  which renders the same whole page. Never a preview route, never an isolated entity render.

The `capture`/`re-capture` stages screenshot the **backend render** at `render_url` as the
candidate; `compare`/`re-compare` diff it against the live Storybook baseline with the
same `compare-images` CLI (severity / diff_percent). The `triage`/`polish` stages apply a
single fix pass on the **backend config** — never the Storybook component, which is
the reference. For a `scene` kind that config is the page's block/layout/`page_layout`
config; a Scene carries its visible content inline in that config, so the fix pass never
touches a content entity. They use the sync-verify-specific `triage-config`/`polish-config` steps (not
the component-oriented `triage`/`polish` of design-verify) so the consolidated fix
instructions name the backend surface as the fix target, not the Storybook reference
component.

Always regenerate CSS before measuring (`before: css-generate, execute: always`) — same
rationale as design-verify: measure against fresh CSS, not stale utilities or undefined
token variables.

The flow is measure → fix once → re-measure. `compare` yields the first-shot measurement;
`triage`/`polish` apply the single fix; `re-capture`/`re-compare` re-measure to yield
the final measurement. Distinct `capture-backend`/`re-capture-backend` step names keep each
measurement's backend captures unambiguous and separate from Storybook capture.
