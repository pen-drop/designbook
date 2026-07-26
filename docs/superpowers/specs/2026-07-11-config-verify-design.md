# config-verify — Design

**Ticket:** DESIGNBOOK-5 — *config-verify: reconcile backend render against Storybook reference*
**Workflow:** `gaia_feature`

## Problem

`design-verify` closes the loop between a Storybook render and a design reference image.
Nothing yet verifies that a *real backend*, rendering through the designbook module, reproduces
what Storybook shows. When a backend (Drupal first) is configured to render a component via the
designbook module, drift between the backend output and the Storybook source of truth is invisible.

## Core idea

Reuse the `design-verify` measurement machine with the **reference axis flipped**:

| | `design-verify` | `config-verify` |
|---|---|---|
| Reference (baseline, frozen) | design image / reference URL | **Storybook render** |
| Candidate (measured) | Storybook render | **backend render** (from a config) |
| Fix-pass target | Storybook component / CSS | **backend config** (entity view display) |

Same capture → compare → fix once → re-measure loop; same `compare-images` CLI; same
`ScoreReport` / `VerifyResult` schemas. Pass = backend render matches the Storybook baseline
within threshold (severity / diff_percent from the existing CLI).

## Architecture

### Workflow shape (`engine: direct`, mirrors design-verify)

```
intake → setup-compare → reference(freeze Storybook baseline) → capture(backend render)
       → compare → triage → polish(edit backend config) → re-capture → re-compare → outtake
```

- `reference` stage freezes the **Storybook** screenshots as the baseline (design-verify froze
  the reference-URL page here).
- `capture` screenshots the **backend render** at the resolved `render_url`.
- `triage`/`polish` = a single fix pass on the **backend config** (the entity view display),
  then `re-capture`/`re-compare` re-measure.
- `before: css-generate (execute: always)` — same rationale as design-verify: measure against
  fresh CSS, not stale.

### config-type dispatch (the neutrality boundary)

- Param `config_type`. **Only `entity_view_display` is supported initially** (YAGNI); the
  dispatch is left open so further config-types can be added without reworking the workflow.
- Per config-type, **core** carries the intake/setup rules+tasks that resolve two values from the
  supplied backend config:
  - `story_id` — derived from the config↔component mapping the config encodes.
  - `render_url` — produced by a **resolver** (the param-resolver pattern design-verify already
    uses for `story_id` / `reference_dir`).
- The resolver is **declared** backend-neutrally in core; its **implementation** is supplied by
  the integration skill. For Drupal, `designbook-drupal` provides a **drush** resolver that takes
  the entity view display and returns the render URL. Core adds **no backend code** — only the
  resolver contract + a named command string live in the integration skill (per the
  backend-neutral core rule).

### Reuse vs. new

- **Reuse unchanged:** `capture-storybook`, `compare-screenshots`, and the score-report /
  `VerifyResult` / `ScoreReport` schemas (pure screenshot diff — already backend-agnostic).
- **New in core:** config-type intake/setup (for `entity_view_display`), the `story_id` +
  `render_url` resolver contract, the backend-config fix task.
- **New in `designbook-drupal`:** the drush `render_url` resolver implementation + command string.

## Testing

Executable Gherkin authored in spec (see the ticket `test` comment). Manual verification runs
against a real Storybook + a Drupal test workspace (`./scripts/setup-workspace.sh`), rendering a
configured entity view display and confirming the score-report reflects the Storybook↔Drupal
delta, and that a config fix pass moves the score.

## Scope / non-goals

- Only `entity_view_display` config-type in v1.
- No migration/back-compat for prior artifacts (project rule).
- No backend code added to core.
