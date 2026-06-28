# Drupal Config Interchange (Export + Import) + Verify — Design

**Date:** 2026-06-26
**Status:** Approved design, ready for implementation planning

## Summary

Designbook is the source of truth for a design system: data model (entity types,
bundles, fields, view modes), entity mappings (`entity-mapping/*.jsonata`), config
entities (views, image styles, media, taxonomy), SDC components, and sample data.

This feature moves that configuration **between Designbook and a Drupal successor
site, in both directions**:

- **Export** transforms Designbook artifacts into real Drupal config + content,
  writes config directly into the site's config-sync directory, and syncs it live
  (`drush config:import`).
- **Import** reads the live Drupal site (via `drush`) and reverse-transforms it back
  into Designbook artifacts — the most common case being importing an existing data
  model.
- **Verify** checks round-trip fidelity (live Drupal render vs Designbook Storybook
  render) with a workflow modeled on `design-verify`.

Drupal is the first concrete target. Backend-specific parts live in
`designbook-drupal`; other backends can be added later as new blueprints. There is no
neutral intermediate format; transforms produce Drupal config directly (decision:
"Drupal-direkt, generisch gebaut").

## Core Model: two units + filter

Everything reduces to **two artifacts** plus a filter — the same in both directions:

| Unit             | Designbook side                                 | Drupal side                                                       |
|------------------|-------------------------------------------------|------------------------------------------------------------------|
| **data_model**   | `data-model.yml` (+ `entity-mapping/*.jsonata`) | config: bundles, fields, view-modes/displays, views, image styles, media, taxonomy |
| **content_data** | `data.yml` (dummy/sample data)                  | content entities                                                  |

"bundles", "displays", "config" are **not** separate concerns — they are **filter
dimensions over the data_model unit**. The data-model schema already constrains the
shape, doing most of the work in both directions.

**Filter dimensions** (shared by export and import):

- `entity_type` (e.g. `node`, `media`)
- `bundle` (e.g. `article`)
- `view_mode` (e.g. `teaser`) — selects the display slice
- `config_key` — names under `data-model.config.*` (a view, an image style)
- `record` — sample-data records (content_data unit)

Plus `--with-deps` (default) / `--no-deps` for dependency closure.

## Goals

- Move Designbook configuration to/from a live Drupal site via Drupal's own config
  pipeline (`drush`).
- Express every transformation in **JSONata** (reuse the addon's existing JSONata
  runtime). Transforms are **paired**: a forward (export) and a reverse (import)
  expression per category, **co-located in one blueprint file** — declarative,
  testable, overridable, mirroring today's `entity-mapping` field maps.
- Operate on **two units (data_model, content_data) with a shared filter**, selectable
  down to a single config entity, with or without its dependency closure.
- Keep the display strategy **pluggable**, selected per project from active strategy
  skills declared in `designbook.config.yml`.
- Verify with an `export-verify` workflow analogous to `design-verify` (measure → fix
  → re-measure).

## Non-Goals

- No neutral/backend-agnostic intermediate format.
- No migration or backwards-compat handling of previously exported config. Re-runs
  overwrite; testing from scratch (per CLAUDE.md).

## Skills & Folder Structure

Consolidated to **one core concern + one backend concern + two slim strategy skills**.
Each skill gains exactly one new area. Blueprints hold **forward + reverse co-located
in one file** per category (halves the file count, keeps a category's logic together).

| Skill                          | New area        | Role                                                  |
|--------------------------------|-----------------|------------------------------------------------------|
| `designbook` (core)            | `interchange/`  | workflows + tasks (export/import/verify), neutral     |
| `designbook-drupal`            | `interchange/`  | forward+reverse Drupal transforms + rules             |
| `designbook-ui-patterns` *(new)* | skill root    | SDC → UI Patterns base (UI Suite family)              |
| `designbook-display-builder` *(new)* | skill root | display strategy (fwd+rev); depends on ui-patterns    |

### `designbook/interchange/`

```
interchange/
  schemas.yml
  workflows/
    export.md              # umbrella: data_model + content_data, one sync
    export-data-model.md
    export-content-data.md
    export-verify.md
    import.md              # umbrella: data_model + content_data
    import-data-model.md
    import-content-data.md
  tasks/
    intake.md
    resolve-filter.md      # filter → target slices (both directions)
    resolve-deps.md        # --with-deps closure
    transform.md           # forward: artifact → [{config_name,data}]
    write-config.md        # → YAML into config-sync dir
    sync.md                # drush config:import --partial
    read-drupal.md         # drush read (import)
    reverse-transform.md   # reverse: drupal JSON → artifact slice
    merge.md               # slice → data-model.yml / data.yml
    outtake.md
    capture-storybook.md   # verify: reference side
    capture-drupal.md      # verify: actual side (live render)
    compare.md
    triage.md
    polish.md
  rules/
  resources/
```

### `designbook-drupal/interchange/`

Flat blueprints selected by frontmatter (`type` + `name` + `trigger`/`filter`),
mirroring the existing `data-mapping` blueprints. Discovery glob is
`skills/**/blueprints/*.md` (files sit directly in a `blueprints/` dir). Each file
holds two named JSONata expressions: `forward` and `reverse`.

```
interchange/
  blueprints/
    bundles.md             # content.* ⇄ <et>.type / field.storage / field.field
    displays.md            # view_modes ⇄ entity_view_mode / entity_view_display (native: LB/views/canvas)
    config.md              # config.* ⇄ views.view / image.style / media / taxonomy
    content-data.md        # data.yml ⇄ content entities
    capture-drupal.md      # verify render
  rules/
    drupal-config.md       # dependencies, langcode/status/uuid, field.storage dedup
    drupal-read.md         # drush read conventions + field-type map (both directions)
```

### `designbook-ui-patterns/` (new skill)

```
designbook-ui-patterns/
  SKILL.md
  rules/                   # SDC → ui_patterns exposure (filter: frameworks.component: sdc)
  blueprints/              # shared UI-Patterns concepts
  install/rules/detect.md  # detect ui_patterns / ui_suite modules
```

### `designbook-display-builder/` (new skill)

```
designbook-display-builder/
  SKILL.md
  blueprints/
    display-map.md         # forward + reverse: entity-mapping ⇄ Display Builder display config
  install/rules/detect.md  # detect display_builder module
```

Both strategy skills are declared in `designbook.config.yml` `extensions:`
(`{id, skill}`). The displays slice selects the strategy because
`designbook-display-builder` is the active strategy skill. A strategy that outgrows
one file can be promoted to its own sub-concern dir later.

## Workflow Names (sub-commands)

Each sub-command is one workflow file under `interchange/workflows/<name>.md`. Each
leaf runs standalone; umbrellas chain the two units (export syncs once at the end).

| Workflow              | Direction | Purpose                                          |
|-----------------------|-----------|--------------------------------------------------|
| `export`              | out       | Umbrella — data_model + content_data, one sync   |
| `export-data-model`   | out       | `data-model.yml` (+ mappings) → Drupal config    |
| `export-content-data` | out       | `data.yml` → Drupal content entities             |
| `export-verify`       | —         | round-trip verify (fix loop)                     |
| `import`              | in        | Umbrella — data_model + content_data             |
| `import-data-model`   | in        | Drupal config → `data-model.yml` (+ mappings)    |
| `import-content-data` | in        | Drupal content → `data.yml`                      |

All accept the shared filter and `--with-deps`/`--no-deps`.

**Required rename:** the existing `import` workflow (design-system import from a design
*reference*) is renamed to **`import-design`** so the new Drupal inbound umbrella can
take the symmetric name `import`. This touches the old `import/` concern's workflow
filename, the `debo` SKILL.md `argument-hint`, and the file-to-workflow dispatch map.

## Transformation: paired JSONata

```
forward (export):  Designbook artifact   → [ { config_name, data } ]   // Drupal config entities
reverse (import):  Drupal config (JSON)  → Designbook artifact slice   // data-model.yml / data.yml
```

Transforms run on the addon's existing JSONata runtime. A thin **writer** serializes
forward output to `<config_name>.yml`; on import a `drush` **reader** produces the JSON
the reverse transform consumes, and `merge` folds the slice into `data-model.yml` /
`data.yml`.

| Filter slice   | Forward → Drupal                                                          | Reverse → Designbook                         |
|----------------|--------------------------------------------------------------------------|----------------------------------------------|
| bundles+fields | `content.<et>.<bundle>` → `<et>.type.*`, `field.storage.*`, `field.field.*` | → `content.<et>.<bundle>.fields`             |
| displays       | `view_modes` + `entity-mapping` → `entity_view_mode.*`, `entity_view_display.*` | → `view_modes` (+ `entity-mapping`)     |
| config         | `config.*` → `views.view.*`, `image.style.*`, media/taxonomy             | → `config.*`                                 |
| content_data   | `data.yml` → content entities                                            | → `data.yml`                                 |

### Display strategy: native vs pluggable

- **Native structures** — `template: layout-builder` / `views` / `canvas` — translate
  to/from native Drupal config, **independent of the chosen strategy skill**.
- **`field-map` / generic SDC trees** — handled by the **active strategy skill**. v1
  ships `designbook-display-builder` (UI Patterns family). Designbook's ComponentNode
  (component + props + slots, fields plugged in) maps cleanly to a UI Patterns display
  (pattern + props sources + slots sources), so both directions are close to **1:1 and
  round-trippable**.

Strategy is chosen **project-global** via the active strategy skill.

## Data Flow

**Export:**

```
data-model.yml / data.yml / entity-mapping
   │  filter → forward JSONata
   ▼
[ { config_name, data } ]  (+ closure if --with-deps)
   │  writer → YAML
   ▼
Drupal config-sync dir   ← written into the live site
   │  drush config:import --partial
   ▼
live Drupal (config active; content entities created)
```

**Import:**

```
live Drupal site
   │  drush read (filtered)
   ▼
config/content JSON
   │  reverse JSONata
   ▼
data-model.yml / data.yml slice
   │  merge
   ▼
Designbook artifacts
```

The config-sync target directory is resolved from the Drupal docroot via the same
mechanism the install skill uses to locate docroot/theme.

## Selective Interchange + Dependency Closure

Granularity (both directions), via the shared filter:

- **All** (both units) · **one unit** · **a filter slice**
  (`entity_type`/`bundle`/`view_mode`/`config_key`/`record`) · **a single config
  entity** (`config_name` or `entity_type.bundle[.view_mode]`).

Dependency handling:

- **`--with-deps` (default):** compute the closure from the `dependencies` the
  transforms emit, so the target imports standalone (export) / referenced bundles are
  pulled in (import).
- **`--no-deps`:** only the targeted entity verbatim.

A resolver walks the dependency graph derived from the `dependencies` keys.

## export-verify Workflow

Mirrors `design-verify`, measuring round-trip fidelity:
**live Drupal render vs Designbook Storybook render** of the same
`entity.bundle.view_mode`.

- **reference side** = Storybook render of the entity view mode.
- **actual side** = live Drupal render after sync.
- **Fix loop (decision: with fix loop):**

```
reference → intake → capture → compare
  → triage → polish (fix the export transform/mapping)
  → re-export → re-sync
  → re-capture → re-compare → outtake (ScoreReport)
```

`polish` edits the export transform/blueprint (not CSS as in design-verify), then
re-exports and re-syncs before re-measuring.

### Drupal render capture — OPEN

Requirement: capture a **per-entity, per-view-mode** render at a **real URL with full
page context** (theme, libraries, CSS). Raw `drush php:eval` HTML is rejected as the
sole mechanism — it can miss attached libraries/CSS.

Mechanism **deferred to implementation-planning**:

- Option A: a contrib module that renders a single view mode per entity at a URL
  (exact module to be identified — not guessed here).
- Option B: a minimal Designbook-provided preview route/controller returning
  `entity_view($entity, $view_mode)` with full render context.

Verify requires **≥1 content entity per bundle/view-mode**, so `export-content-data` is
a prerequisite for verify.

## Round-trip property

Because transforms are paired and the UI Patterns display mapping is near-bijective,
**export → import → export** should converge. Strong test oracle: import a known
Drupal site, export it back, diff the config; export a data-model, import it back, diff
the data-model.

## Transform Correctness (hard requirements)

- `dependencies` (module + config) computed correctly — otherwise `config:import`
  fails. Also feeds the closure resolver.
- Required Drupal config keys set (`langcode`, `status`, and `uuid` where needed).
- `field.storage.*` deduplicated across bundles (shared field storage).
- Provider/namespace resolved at generation time — never leave placeholders.
- Reverse field-type map (Drupal field type → Designbook `type`) maintained alongside
  the forward map; an unmapped type → stop + report (don't silently drop the field).
- No strategy blueprint found for a template → stop and report.

## Environment Assumptions

- A reachable, installed Drupal site with `drush` and a base URL.
- The theme produced by the Designbook install skill is present.
- The chosen strategy skill is declared in `designbook.config.yml`.
- Re-runs overwrite (from-scratch testing per CLAUDE.md).

## Error Handling

- No matching strategy blueprint for a view-mode template → stop + report.
- `drush config:import` / read failure → stop, surface drush output verbatim.
- `export-verify` with no content entity for a bundle/view-mode → stop + report.
- Reverse transform hits an unmapped Drupal field type → stop + report.

## Testing

- JSONata transforms unit-testable: forward (fixture → expected Drupal config) and
  reverse (fixture → expected data-model slice).
- Round-trip tests: forward∘reverse and reverse∘forward converge on fixtures.
- Dependency-closure resolver: unit tests over synthetic graphs.
- Workflow smoke test in the test workspace (`./scripts/setup-workspace.sh`).
- `export-verify` as an integration test against a real Drupal site.

## Invocation

- `debo export [data-model|content-data] [--filter …] [--with-deps|--no-deps]`
- `debo import [data-model|content-data] [--filter …] [--with-deps|--no-deps]`
- `debo export-verify`
- `debo import-design` — the renamed design-reference import (unchanged behavior)

Engine `direct`, consistent with the other Designbook workflows.

## Decision Log

- **Architecture:** Drupal-direct, generic via skill architecture.
- **Core model:** two units (`data_model`, `content_data`) + shared filter;
  "bundles/displays/config" are filter dimensions, not separate concerns.
- **Naming:** `data` → `content_data` for clarity.
- **Bidirectional:** export/import symmetric — same units, same filter, paired
  forward/reverse JSONata co-located per blueprint. Import is the common case.
- **Import source:** live Drupal via `drush`.
- **Folder consolidation:** one core `interchange/` concern + one
  `designbook-drupal/interchange/` + two slim strategy skills, instead of separate
  export/import concerns.
- **import rename:** existing `import` (design-reference) → `import-design`; new Drupal
  inbound umbrella takes `import`.
- **Output form (export):** config/sync YAML into the live site's config-sync dir,
  applied with `drush config:import --partial`.
- **Strategy packaging:** each strategy is its own skill. v1:
  `designbook-ui-patterns` + `designbook-display-builder` (UI Patterns ecosystem).
- **Blueprint organization:** flat files, frontmatter selection, forward+reverse
  co-located.
- **Selective interchange:** down to a single config entity, `--with-deps` (default) /
  `--no-deps`.
- **Verify:** `export-verify` with fix loop; capture via per-entity/per-view-mode real
  URL with full context (mechanism deferred to planning).
