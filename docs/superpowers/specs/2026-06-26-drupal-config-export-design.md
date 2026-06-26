# Drupal Config Export + Verify — Design

**Date:** 2026-06-26
**Status:** Approved design, ready for implementation planning

## Summary

Designbook is the source of truth for a design system: data model (entity types,
bundles, fields, view modes), entity mappings (`entity-mapping/*.jsonata`), config
entities (views, image styles, media, taxonomy), SDC components, and sample data.

This feature exports that configuration into a **Drupal successor site**: it
transforms Designbook artifacts into real Drupal config entities, writes them
directly into the site's config-sync directory, syncs them live (`drush
config:import`), and verifies the round-trip fidelity (live Drupal render vs
Designbook Storybook render) with a dedicated verify workflow modeled on
`design-verify`.

Drupal is the first concrete target. The architecture keeps the backend-specific
parts isolated in a `designbook-drupal/export` concern so other backends can be
added later as new blueprints — there is no neutral intermediate format; the
transforms produce Drupal config directly (decision: "Drupal-direkt, generisch
gebaut").

## Goals

- Export Designbook configuration into a live Drupal site, applied via Drupal's
  own config import pipeline.
- Express every transformation in **JSONata** (reuse the addon's existing JSONata
  runtime), so transforms are declarative, testable, and overridable — mirroring
  today's `entity-mapping` field maps.
- Make each category independently exportable (bundles, displays, config-entities,
  content) plus an "export everything" run.
- Support **selective export of a single config entity, with or without its
  dependency closure**.
- Keep the display/data-mapping render strategy **pluggable**, selected per project
  from active extensions in `designbook.config.yml`.
- Verify the result with an `export-verify` workflow analogous to `design-verify`,
  including a measure → fix → re-measure loop.

## Non-Goals

- No neutral/backend-agnostic intermediate export format. Drupal config is produced
  directly; generality comes from the skill/blueprint architecture.
- No migration or backwards-compat handling of previously exported config. Re-runs
  overwrite; testing is always from scratch (per project CLAUDE.md).

## Architecture

### Concerns and delegation

- **Core `export` concern** (`designbook/export/`): the export workflow and its
  stage tasks. Says WHAT each stage produces (a config category). Backend-neutral.
- **`designbook-drupal/export/`**: JSONata transform blueprints that say HOW —
  producing concrete Drupal config shapes. Gated by `filter: backend: drupal`.
- **Export-strategy extension** (e.g. `display-builder`): provides the display
  mapping transform for the field-map / generic SDC-tree case. Gated by
  `filter: extensions: <id>`. v1 bundles one strategy: `display-builder`.
- **Core `export-verify` concern**: a verify workflow mirroring `design-verify`,
  with a fix loop.

This mirrors the existing `data-model` / `data-mapping` split exactly: core states
the WHAT, the Drupal skill supplies the WHAT→Drupal blueprints, extensions plug in
strategy variants via `filter`.

### Transformation: JSONata-based

Each export category is a **JSONata transform** with the contract:

```
input:  Designbook artifact(s)        (data-model.yml, entity-mapping/*.jsonata, data.yml)
output: [ { config_name: string, data: object } ]   // one entry per Drupal config entity
```

Transforms run on the addon's existing JSONata runtime. A thin **writer** serializes
each `{ config_name, data }` to `<config_name>.yml` in the target config-sync
directory. Transforms live as blueprints/templates in `designbook-drupal/export`
(Drupal shapes) and the active strategy extension (display mapping).

| Stage             | JSONata input                                  | Drupal output                                                   |
|-------------------|------------------------------------------------|----------------------------------------------------------------|
| `export-bundles`  | `data-model.content.<et>.<bundle>` + `fields`  | `<et>.type.*` (node/block_content/media/vocabulary), `field.storage.*`, `field.field.*` |
| `export-displays` | `view_modes` + `entity-mapping/*.jsonata`      | `core.entity_view_mode.*`, `core.entity_view_display.*`         |
| `export-config`   | `data-model.config.*`                          | `views.view.*`, `image.style.*`, media/taxonomy config         |
| `export-content`  | `data.yml` sample data                         | Content entities (default content)                             |

### Display strategy: native vs pluggable

`export-displays` is strategy-aware:

- **Native structures** — view modes whose `template` is `layout-builder`, `views`,
  or `canvas` — translate to their native Drupal config (Layout Builder section
  config, Views config, Experience Builder config) **independent of the chosen
  strategy extension**.
- **`field-map` / generic SDC trees** — translated by the **active export-strategy
  extension** (project-global, declared in `designbook.config.yml`). v1 ships
  `display-builder`. A new strategy is a new blueprint with `filter: extensions:
  <id>` — no core change.

Strategy is chosen **project-global** via the active extension (decision:
"Projekt-global via Extension"). All field-map view modes in a project export the
same way; a different project picks a different strategy by declaring a different
extension.

## Data Flow

```
Designbook artifacts
   │  (JSONata transform)
   ▼
[ { config_name, data } ]
   │  (thin writer → YAML)
   ▼
Drupal config-sync dir   ← written directly into the live site
   │  drush config:import --partial
   ▼
live Drupal config (active)
```

Stages run individually or as one "export everything" pass. The config-sync target
directory is resolved from the Drupal docroot using the same mechanism the install
skill already uses to locate docroot/theme.

## Selective Export + Dependency Closure

Export target granularity:

- **All** (every stage).
- **Per category/stage** (`export-bundles`, `export-displays`, …).
- **Single config entity**, selected by `config_name` or by
  `entity_type.bundle[.view_mode]`.

Dependency handling via a flag:

- **`--with-deps` (default):** compute the dependency closure from the
  `dependencies` (config + module) that the transforms emit, and export the full
  closure so the targeted config can be `cim --partial`-imported standalone.
- **`--no-deps`:** export only the targeted config entity verbatim; the caller
  relies on its dependencies already existing in the target site.

A resolver walks the dependency graph of the produced config entities to build the
closure. The graph is derived from the `dependencies` keys in the generated config.

## export-verify Workflow

Mirrors `design-verify`, measuring round-trip fidelity:
**live Drupal render vs Designbook Storybook render** of the same
`entity.bundle.view_mode`.

- **reference side** = Storybook render of the entity view mode (the target — what
  Designbook shows).
- **actual side** = live Drupal render after sync.
- **Fix loop (decision: with fix loop):**

```
reference → intake → capture → compare
  → triage → polish (fix the export transform/mapping)
  → re-export → re-sync
  → re-capture → re-compare → outtake (ScoreReport)
```

`polish` here edits the export transform/blueprint (not CSS as in design-verify),
then re-exports and re-syncs before re-measuring.

### Drupal render capture — OPEN

Requirement: capture a **per-entity, per-view-mode** render at a **real URL with
full page context** (theme, libraries, CSS) so Playwright screenshots match what a
visitor sees. Raw `drush php:eval` HTML is rejected as the sole mechanism — it can
miss attached libraries/CSS and render incompletely.

The concrete mechanism is **deferred to the implementation-planning phase**:

- Option A: a contrib module that renders a single view mode per entity at a URL
  (exact module to be identified — not guessed here).
- Option B: a minimal Designbook-provided preview route/controller returning
  `entity_view($entity, $view_mode)` with full render context (attachments included).

Either way the requirement is fixed: per-entity, per-view-mode, full-context
rendered URL. `export-verify` requires **≥1 content entity per bundle/view-mode**,
so `export-content` is a prerequisite for verify.

## Transform Correctness (hard requirements)

- `dependencies` (module + config) computed correctly — otherwise `config:import`
  fails enforcing dependencies. This also feeds the closure resolver.
- Required Drupal config keys set (`langcode`, `status`, and `uuid` where the entity
  type needs it).
- `field.storage.*` deduplicated across bundles (shared field storage).
- Provider/namespace resolved at generation time — never leave placeholders.
- No strategy blueprint found for a template → stop and report (mirrors the existing
  map-entity rule).

## Environment Assumptions

- A reachable, installed Drupal site with `drush` and a base URL.
- The theme produced by the Designbook install skill is present.
- The chosen export-strategy extension is declared in `designbook.config.yml`.
- Re-runs overwrite; no migration of prior exports (from-scratch testing per
  CLAUDE.md).

## Error Handling

- No matching strategy blueprint for a view-mode template → stop + report.
- `drush config:import` failure → stop, surface the drush output verbatim.
- `export-verify` with no content entity for a bundle/view-mode → stop + report.

## Testing

- JSONata transforms are unit-testable: input fixture (data-model / entity-mapping)
  → expected Drupal config entities.
- Dependency-closure resolver: unit tests over synthetic dependency graphs
  (with-deps closure vs no-deps single entity).
- Workflow smoke test in the test workspace (`./scripts/setup-workspace.sh`).
- `export-verify` as an integration test against a real Drupal site.

## Invocation

New sub-command `debo export [stage] [target] [--with-deps|--no-deps]`, engine
`direct`, consistent with the other Designbook workflows. `debo export-verify` runs
the verify workflow.

## Decision Log

- **Architecture:** Drupal-direct, generic via skill architecture (not a neutral
  intermediate format).
- **Output form:** config/sync YAML written into the live site's config-sync dir,
  applied with `drush config:import --partial`.
- **Strategy level:** project-global via an export-strategy extension; native
  templates export independent of strategy.
- **Scope:** bundles+fields, view-modes+displays, config-entities, sample-content —
  each separately exportable, plus "all".
- **Transformation:** JSONata, reusing the addon runtime.
- **Selective export:** single config entity supported, with `--with-deps` (default)
  / `--no-deps`.
- **Verify:** `export-verify` with a fix loop; capture via per-entity/per-view-mode
  real URL with full context (exact mechanism deferred to planning).
