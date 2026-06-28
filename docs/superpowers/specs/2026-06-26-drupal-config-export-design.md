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
`designbook-drupal` so other backends can be added later as new blueprints. There is
no neutral intermediate format; transforms produce Drupal config directly (decision:
"Drupal-direkt, generisch gebaut").

## Core Model: two units + filter

Everything reduces to **two artifacts** plus a filter — the same in both directions:

| Unit            | Designbook side                              | Drupal side                                                        |
|-----------------|----------------------------------------------|-------------------------------------------------------------------|
| **data-model**  | `data-model.yml` (+ `entity-mapping/*.jsonata`) | config: bundles, fields, view-modes/displays, views, image styles, media, taxonomy |
| **data**        | `data.yml` (dummy/sample data)               | content entities                                                   |

"bundles", "displays", "config" are **not** separate concerns — they are **filter
dimensions over the data-model unit**. The data-model schema already constrains the
shape, which does most of the work in both directions.

**Filter dimensions** (shared by export and import):

- `entity_type` (e.g. `node`, `media`)
- `bundle` (e.g. `article`)
- `view_mode` (e.g. `teaser`) — selects the display slice
- `config_key` — names under `data-model.config.*` (a view, an image style)
- `record` — sample-data records (data unit)

Plus `--with-deps` (default) / `--no-deps` for dependency closure.

## Goals

- Move Designbook configuration to/from a live Drupal site, applied via Drupal's own
  config pipeline (`drush`).
- Express every transformation in **JSONata** (reuse the addon's existing JSONata
  runtime). Transforms are **paired**: a forward (export) and a reverse (import)
  expression per category — declarative, testable, overridable, mirroring today's
  `entity-mapping` field maps.
- Operate on **two units (data-model, data) with a shared filter**, selectable down
  to a single config entity, with or without its dependency closure.
- Keep the display/data-mapping strategy **pluggable**, selected per project from
  active strategy skills declared in `designbook.config.yml`.
- Verify with an `export-verify` workflow analogous to `design-verify` (measure → fix
  → re-measure).

## Non-Goals

- No neutral/backend-agnostic intermediate format. Drupal config is produced
  directly; generality comes from the skill/blueprint architecture.
- No migration or backwards-compat handling of previously exported config. Re-runs
  overwrite; testing is always from scratch (per project CLAUDE.md).
- The existing `import` workflow (design-system import from a design *reference*) is
  unrelated to this Drupal config import. Naming is kept distinct (see Folder
  Structure); a future rename of the old one to `import-design` is out of scope.

## Architecture

### Concerns and delegation

- **Core `export` concern** (`designbook/export/`): outbound workflows + tasks. Says
  WHAT each unit/filter produces. Backend-neutral.
- **Core `import-model` concern** (`designbook/import-model/`): inbound workflows +
  tasks (distinct from the design-reference `import/` concern). Backend-neutral.
- **`designbook-drupal/export/`**: forward JSONata transform blueprints (Designbook →
  Drupal). `filter: backend: drupal`.
- **`designbook-drupal/import/`**: reverse JSONata transform blueprints + `drush`
  readers (Drupal → Designbook). `filter: backend: drupal`.
- **Strategy skills** — each display/mapping strategy is its **own integration skill**
  (like `designbook-drupal` / `designbook-css-tailwind`), declared as an extension in
  `designbook.config.yml`:
  - **`designbook-ui-patterns`** — UI Suite / UI Patterns family base. Exposes SDC
    components as UI Patterns; shared by every UI-Suite strategy. Display Builder
    belongs to this family.
  - **`designbook-display-builder`** — the concrete display strategy. Depends on
    `designbook-ui-patterns`. Provides the forward (entity-mapping → Display Builder
    display config) **and** reverse (display config → entity-mapping) transform. v1
    ships this strategy.
  - Future strategies (e.g. Twig) are added as their own skills.
- **Core `export-verify` concern**: a verify workflow mirroring `design-verify`, with
  a fix loop.

This mirrors the existing `data-model` / `data-mapping` split: core states the WHAT,
the Drupal skill supplies the WHAT→Drupal blueprints, strategy skills plug in
variants via `filter`.

### Transformation: paired JSONata

Each unit/category is a **JSONata transform pair**:

```
forward (export):  Designbook artifact   → [ { config_name, data } ]   // Drupal config entities
reverse (import):  Drupal config (JSON)  → Designbook artifact slice   // data-model.yml / data.yml
```

Transforms run on the addon's existing JSONata runtime. A thin **writer** serializes
forward output to `<config_name>.yml` in the config-sync dir; on import a **reader**
(`drush`) produces the JSON the reverse transform consumes, and the result is merged
into `data-model.yml` / `data.yml`.

| Filter slice | Forward input → Drupal | Reverse input → Designbook |
|---|---|---|
| bundles+fields | `data-model.content.<et>.<bundle>` → `<et>.type.*`, `field.storage.*`, `field.field.*` | those config entities → `content.<et>.<bundle>.fields` |
| displays | `view_modes` + `entity-mapping/*.jsonata` → `core.entity_view_mode.*`, `core.entity_view_display.*` | those → `view_modes` (+ `entity-mapping`) |
| config | `data-model.config.*` → `views.view.*`, `image.style.*`, media/taxonomy | those → `config.*` |
| data | `data.yml` → content entities | content entities → `data.yml` |

### Display strategy: native vs pluggable

The displays slice is strategy-aware:

- **Native structures** — view modes whose `template` is `layout-builder`, `views`,
  or `canvas` — translate to/from their native Drupal config (Layout Builder section
  config, Views config, Experience Builder config), **independent of the chosen
  strategy skill**.
- **`field-map` / generic SDC trees** — handled by the **active strategy skill**
  (project-global). v1 ships `designbook-display-builder` (UI Patterns family).
  Designbook's ComponentNode (component + props + slots, fields plugged in) maps
  cleanly to a UI Patterns display (pattern + props sources + slots sources), so both
  directions are close to **1:1 and round-trippable**. A new strategy is a new skill —
  no core change.

Strategy is chosen **project-global** via the active strategy skill (decision:
"Projekt-global via Extension"). A different project picks a different strategy by
declaring a different strategy skill in its `extensions`.

## Workflows & Folder Structure

### Workflow names (sub-commands)

Each sub-command is one workflow file under `<concern>/workflows/<name>.md`
(established convention; e.g. `design/` holds `design-component`, `design-screen`, …).
Each leaf workflow runs standalone; the umbrellas chain the two units (export syncs
once at the end).

| Workflow            | Direction | Purpose                                              |
|---------------------|-----------|-----------------------------------------------------|
| `export`            | out       | Umbrella — data-model + data, one final sync        |
| `export-data-model` | out       | `data-model.yml` (+ mappings) → Drupal config       |
| `export-data`       | out       | `data.yml` → Drupal content entities                |
| `export-verify`     | —         | round-trip verify (fix loop)                        |
| `import`            | in        | Umbrella — data-model + data                        |
| `import-data-model` | in        | Drupal config → `data-model.yml` (+ mappings)       |
| `import-data`       | in        | Drupal content → `data.yml`                         |

All accept the shared filter (`--filter et=…,bundle=…,view-mode=…,config-key=…`) and
`--with-deps`/`--no-deps`.

### Core concern — `designbook/export/`

```
export/
  schemas.yml
  workflows/
    export.md            # umbrella
    export-data-model.md
    export-data.md
    export-verify.md
  tasks/
    intake--export.md
    transform.md         # run a forward JSONata transform → [{config_name,data}]
    resolve-filter.md    # expand filter → target slices
    resolve-deps.md      # dependency closure (--with-deps)
    write-config.md      # serialize → YAML into config-sync dir
    sync.md              # drush config:import --partial
    outtake--export.md
    intake--export-verify.md
    capture-storybook.md # reference side (may reuse design/ capture)
    capture-drupal.md    # actual side (live render)
    compare.md
    triage.md
    polish.md
    outtake--export-verify.md
  rules/
  resources/
```

### Core concern — `designbook/import-model/`

```
import-model/
  schemas.yml
  workflows/
    import.md            # umbrella
    import-data-model.md
    import-data.md
  tasks/
    intake--import-model.md
    read-drupal.md       # drush → config/content JSON (filtered)
    reverse-transform.md # run a reverse JSONata transform → data-model/data slice
    merge.md             # merge slice into data-model.yml / data.yml
    outtake--import-model.md
  rules/
```

### Backend — `designbook-drupal/`

Forward + reverse transforms, flat blueprints selected by frontmatter
(`type` + `name` + `trigger`/`filter`) — mirroring the existing `data-mapping`
blueprints. Discovery glob is `skills/**/blueprints/*.md` (files sit directly in a
`blueprints/` dir).

```
designbook-drupal/export/
  blueprints/
    bundles.md           # content.* → node.type / field.storage / field.field
    displays.md          # native view_mode + entity_view_display scaffold (LB/views/canvas)
    config.md            # views.view / image.style / media / taxonomy
    content.md           # data.yml → content entities
    capture-drupal.md    # per-entity/per-view-mode URL render (verify)
  rules/
    drupal-config.md     # dependencies, langcode/status/uuid, field.storage dedup

designbook-drupal/import/
  blueprints/
    bundles.md           # reverse: type/field config → content.<et>.<bundle>.fields
    displays.md          # reverse: view_mode/display config → view_modes
    config.md            # reverse: views.view / image.style → config.*
    content.md           # reverse: content entities → data.yml
  rules/
    drupal-read.md       # drush read conventions, field-type reverse map
```

### Strategy skills (UI Patterns family)

```
designbook-ui-patterns/        # UI Suite base — SDC exposed as UI Patterns
  SKILL.md
  rules/                       # SDC → ui_patterns exposure (filter: frameworks.component: sdc)
  install/rules/               # detect ui_patterns / ui_suite modules
  blueprints/                  # shared UI-Patterns concepts

designbook-display-builder/    # concrete display strategy; depends on ui-patterns
  SKILL.md
  export/blueprints/
    display-map.md             # forward: entity-mapping → Display Builder display config
  import/blueprints/
    display-map.md             # reverse: Display Builder display config → entity-mapping
  install/rules/               # detect display_builder module
```

Both strategy skills are declared in `designbook.config.yml` `extensions:`
(`{id, skill}`). The displays slice selects the strategy because
`designbook-display-builder` is the active strategy skill. Strategy-variant blueprints
follow the **flat + frontmatter** convention (Option A); a strategy that outgrows one
file can be promoted to its own sub-concern dir later.

## Data Flow

**Export:**

```
data-model.yml / data.yml / entity-mapping
   │  filter → forward JSONata transform
   ▼
[ { config_name, data } ]  (+ dependency closure if --with-deps)
   │  thin writer → YAML
   ▼
Drupal config-sync dir   ← written directly into the live site
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
   │  reverse JSONata transform
   ▼
data-model.yml / data.yml slice
   │  merge
   ▼
Designbook artifacts
```

The config-sync target directory is resolved from the Drupal docroot using the same
mechanism the install skill uses to locate docroot/theme.

## Selective Interchange + Dependency Closure

Granularity (both directions), via the shared filter:

- **All** (both units).
- **One unit** (`export-data-model` / `export-data`, likewise import).
- **A filter slice** — by `entity_type` / `bundle` / `view_mode` / `config_key` /
  `record`.
- **A single config entity** — `config_name` or `entity_type.bundle[.view_mode]`.

Dependency handling:

- **`--with-deps` (default):** compute the dependency closure from the `dependencies`
  (config + module) the transforms emit, so the targeted config can be
  `cim --partial`-imported standalone (export) / so referenced bundles are pulled in
  (import).
- **`--no-deps`:** only the targeted entity verbatim; the caller relies on its
  dependencies already existing on the other side.

A resolver walks the dependency graph derived from the `dependencies` keys.

## export-verify Workflow

Mirrors `design-verify`, measuring round-trip fidelity:
**live Drupal render vs Designbook Storybook render** of the same
`entity.bundle.view_mode`.

- **reference side** = Storybook render of the entity view mode (the target).
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
page context** (theme, libraries, CSS) so Playwright screenshots match what a visitor
sees. Raw `drush php:eval` HTML is rejected as the sole mechanism — it can miss
attached libraries/CSS and render incompletely.

Mechanism **deferred to implementation-planning**:

- Option A: a contrib module that renders a single view mode per entity at a URL
  (exact module to be identified — not guessed here).
- Option B: a minimal Designbook-provided preview route/controller returning
  `entity_view($entity, $view_mode)` with full render context.

Either way the requirement is fixed: per-entity, per-view-mode, full-context rendered
URL. Verify requires **≥1 content entity per bundle/view-mode**, so `export-data` is a
prerequisite for verify.

## Round-trip property

Because the transforms are paired (forward/reverse) and the UI Patterns display
mapping is near-bijective, **export → import → export** should converge. This is a
strong test oracle: import a known Drupal site, export it back, diff the config;
export a data-model, import it back, diff the data-model.

## Transform Correctness (hard requirements)

- `dependencies` (module + config) computed correctly — otherwise `config:import`
  fails. Also feeds the closure resolver.
- Required Drupal config keys set (`langcode`, `status`, and `uuid` where needed).
- `field.storage.*` deduplicated across bundles (shared field storage).
- Provider/namespace resolved at generation time — never leave placeholders.
- Reverse field-type map (Drupal field type → Designbook `type`) maintained alongside
  the forward map.
- No strategy blueprint found for a template → stop and report (mirrors the existing
  map-entity rule).

## Environment Assumptions

- A reachable, installed Drupal site with `drush` and a base URL.
- The theme produced by the Designbook install skill is present.
- The chosen strategy skill is declared in `designbook.config.yml`.
- Re-runs overwrite; no migration of prior exports (from-scratch testing per
  CLAUDE.md).

## Error Handling

- No matching strategy blueprint for a view-mode template → stop + report.
- `drush config:import` / read failure → stop, surface the drush output verbatim.
- `export-verify` with no content entity for a bundle/view-mode → stop + report.
- Reverse transform encounters an unmapped Drupal field type → stop + report (don't
  silently drop the field).

## Testing

- JSONata transforms unit-testable: forward (fixture → expected Drupal config) and
  reverse (fixture → expected data-model slice).
- Round-trip tests: forward∘reverse and reverse∘forward converge on fixtures.
- Dependency-closure resolver: unit tests over synthetic graphs (with-deps vs
  no-deps).
- Workflow smoke test in the test workspace (`./scripts/setup-workspace.sh`).
- `export-verify` as an integration test against a real Drupal site.

## Invocation

- `debo export [data-model|data] [--filter …] [--with-deps|--no-deps]`
- `debo import [data-model|data] [--filter …] [--with-deps|--no-deps]`
- `debo export-verify`

Engine `direct`, consistent with the other Designbook workflows.

## Decision Log

- **Architecture:** Drupal-direct, generic via skill architecture (not a neutral
  intermediate format).
- **Core model:** two units (data-model, data) + shared filter; "bundles/displays/
  config" are filter dimensions, not separate concerns.
- **Bidirectional:** export and import are symmetric — same units, same filter, paired
  forward/reverse JSONata transforms. Import is the most common case (data model).
- **Import source:** live Drupal via `drush`.
- **Output form (export):** config/sync YAML written into the live site's config-sync
  dir, applied with `drush config:import --partial`.
- **Strategy level:** project-global via an active strategy skill; native templates
  handled independent of strategy.
- **Strategy packaging:** each strategy is its own integration skill. v1:
  `designbook-ui-patterns` (UI Suite base) + `designbook-display-builder` (concrete
  strategy, depends on ui-patterns). Display Builder belongs to the UI Patterns
  ecosystem.
- **Blueprint organization:** flat files + frontmatter selection (Option A), mirroring
  `data-mapping`; promote to a sub-concern dir only if a strategy outgrows one file.
- **Workflow naming:** `export`, `export-data-model`, `export-data`, `export-verify`,
  `import`, `import-data-model`, `import-data`. The new inbound concern is
  `import-model/`, distinct from the design-reference `import/`.
- **Transformation:** paired JSONata, reusing the addon runtime.
- **Selective interchange:** down to a single config entity, with `--with-deps`
  (default) / `--no-deps`.
- **Verify:** `export-verify` with a fix loop; capture via per-entity/per-view-mode
  real URL with full context (exact mechanism deferred to planning).
