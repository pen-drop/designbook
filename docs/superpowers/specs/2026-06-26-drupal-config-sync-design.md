# Drupal Config Sync (Designbook ⇄ Drupal) + Verify — Design

**Date:** 2026-06-26
**Status:** Approved design, ready for implementation planning

## Summary

Designbook is the source of truth for a design system: data model (entity types,
bundles, fields, view modes), entity mappings (`entity-mapping/*.jsonata`), config
entities (views, image styles, media, taxonomy), SDC components, and sample data.

This feature **syncs that configuration between Designbook and a live Drupal site, in
both directions** — built as a thin layer that **reuses the existing `data-model` and
`data-mapping` concerns** rather than duplicating their schemas, rules, and
field/entity-type knowledge.

- **`sync-to`** (Designbook → Drupal): transforms artifacts into Drupal config +
  content, writes config into the site's config-sync dir, applies it (`drush
  config:import`).
- **`sync-from`** (Drupal → Designbook): reads the live site (`drush`) and
  reverse-transforms it back into Designbook artifacts — the common case being
  importing an existing data model.
- **`sync-verify`**: round-trip fidelity (live Drupal render vs Designbook Storybook
  render), modeled on `design-verify`.

Drupal is the first concrete target; backend-specific knowledge already lives in
`designbook-drupal`. There is no neutral intermediate format.

## Core Model: two units + filter, one direction

Everything reduces to **two units** + a filter + a direction:

| Unit             | Designbook side                                 | Drupal side                                                       |
|------------------|-------------------------------------------------|------------------------------------------------------------------|
| **data-model**   | `data-model.yml` (+ `entity-mapping/*.jsonata`) | config: bundles, fields, view-modes/displays, views, image styles, media, taxonomy |
| **content-data** | `data.yml` (dummy/sample data)                  | content entities                                                  |

"bundles", "displays", "config" are **filter dimensions over the data-model unit**,
not separate concerns. The existing data-model schema already constrains the shape.

**Direction** is explicit in the command name: `sync-to` / `sync-from`.
**Unit** is a positional argument (default: both).
**Filter** (shared both directions): `entity_type`, `bundle`, `view_mode`,
`config_key`, `record`. Plus `--with-deps` (default) / `--no-deps`.

## Reuse principle — what is reused vs new

The whole point: **do not duplicate**, especially for `sync-from`. The reverse
transform sits next to the forward transform next to the entity-type definition that
already exists.

**Reused as-is (no new files):**

- `designbook/data-model/schemas.yml` — the `DataModel` schema.
- `designbook/design/schemas.yml` — verify `Check` / `ScoreReport`.
- `designbook-drupal/data-model/` — entity-type blueprints (`node`, `media`, `view`,
  `block_content`, `taxonomy_term`, `canvas_page`) + rules (`canvas`, `drupal-views`,
  `layout-builder`, `media-image-styles`). These hold the Drupal entity-type shapes
  and field-type knowledge.
- `designbook-drupal/data-mapping/` — ComponentNode mapping blueprints (`field-map`,
  `canvas`, `layout-builder`, `views`) + rule `image-fields`.

**New — minimal:**

1. **A `to_drupal` / `from_drupal` JSONata pair added into each existing blueprint**
   (data-model entity-type blueprints + data-mapping blueprints). Forward and reverse
   live in the same file as the definition they serialize.
2. **One thin `sync/` concern** — orchestration only (workflows + drush IO tasks),
   **no new schema, no new domain rules**.
3. **Strategy skills** for the pluggable display mapping (`designbook-ui-patterns`,
   `designbook-display-builder`).

## Goals

- Sync Designbook config to/from a live Drupal site via Drupal's own pipeline.
- Express transforms in **JSONata**, **paired and co-located** (`to_drupal` /
  `from_drupal`) inside the existing blueprints — reusing the addon JSONata runtime.
- Operate on **two units + shared filter**, down to a single config entity, with/without
  dependency closure.
- Keep the display strategy **pluggable** via strategy skills.
- Verify with `sync-verify` (measure → fix → re-measure).

## Non-Goals

- No neutral/backend-agnostic intermediate format.
- No migration/backwards-compat of prior syncs. Re-runs overwrite; testing from
  scratch (per CLAUDE.md).
- No new *parallel* schema file or rules that restate data-model / data-mapping
  knowledge. (Blueprints may still **extend** the existing `DataModel` schema in-place
  via the established `provides`/`constrains` merge mechanism — see field-types below.)
- The existing `import` workflow (design-reference import) is untouched — `sync-from`
  avoids the name, so **no rename is needed**.

## Skills & Folder Structure

### Existing concerns — extended, not duplicated

Each existing blueprint gains a `to_drupal` / `from_drupal` JSONata pair. No new
files, no new rules.

```
designbook-drupal/data-model/blueprints/
  field-types.md     [NEU] shared: field type ⇄ field.storage + field.field (string/image/reference/…)
  node.md            # + to_drupal / from_drupal   (bundle ⇄ node.type; calls field-types per field)
  media.md           # + to_drupal / from_drupal
  view.md            # + to_drupal / from_drupal   (⇄ views.view)
  block_content.md   # + to_drupal / from_drupal
  taxonomy_term.md   # + to_drupal / from_drupal
  canvas_page.md     # + to_drupal / from_drupal
designbook-drupal/data-mapping/blueprints/
  field-map.md       # + to_drupal / from_drupal   (entity-mapping ⇄ core.entity_view_display)
  canvas.md          # + to_drupal / from_drupal   (native)
  layout-builder.md  # + to_drupal / from_drupal   (native)
  views.md           # + to_drupal / from_drupal   (native)
```

A small `rules/` addition may be needed in `designbook-drupal/data-model/` for
Drupal-config emission invariants that have no existing home (dependencies,
`langcode`/`status`/`uuid`, `field.storage` dedup) — kept to one file if at all.

### New thin concern — `designbook/sync/`

Orchestration only. **No `schemas.yml`, no domain `rules/`** — it reuses data-model and
design schemas.

```
designbook/sync/
  workflows/
    sync-to.md       # Designbook → Drupal  (unit arg, filter, deps; one cim at end)
    sync-from.md     # Drupal → Designbook  (unit arg, filter)
    sync-verify.md   # round-trip verify (fix loop)
  tasks/
    intake.md
    resolve-filter.md   # filter → target slices (both directions)
    resolve-deps.md     # --with-deps closure
    transform.md        # run to_drupal / from_drupal from the matched blueprint
    write-config.md     # → YAML into config-sync dir   (sync-to)
    sync.md             # drush config:import --partial  (sync-to)
    read-drupal.md      # drush config:export / get      (sync-from)
    merge.md            # reverse slice → data-model.yml / data.yml  (sync-from)
    outtake.md
    capture-drupal.md   # verify: actual side (live render)
    compare.md  triage.md  polish.md   # verify (reuse design/ capture-storybook for reference)
  resources/
```

### Strategy skills (UI Patterns family)

```
designbook-ui-patterns/        # UI Suite base — SDC exposed as UI Patterns
  SKILL.md
  rules/                       # SDC → ui_patterns exposure (filter: frameworks.component: sdc)
  blueprints/                  # shared UI-Patterns concepts
  install/rules/detect.md      # detect ui_patterns / ui_suite modules

designbook-display-builder/    # concrete display strategy; depends on ui-patterns
  SKILL.md
  blueprints/display-map.md    # to_drupal / from_drupal: field-map ⇄ Display Builder display
  install/rules/detect.md      # detect display_builder module
```

Both declared in `designbook.config.yml` `extensions:` (`{id, skill}`). The displays
slice selects the strategy because `designbook-display-builder` is the active strategy
skill.

## Workflow Names (sub-commands)

| Workflow      | Direction              | Purpose                                   |
|---------------|------------------------|-------------------------------------------|
| `sync-to`     | Designbook → Drupal    | unit `[data-model\|content-data]` → Drupal |
| `sync-from`   | Drupal → Designbook    | Drupal → unit `[data-model\|content-data]` |
| `sync-verify` | —                      | round-trip verify (fix loop)              |

Invocation:

- `debo sync-to [data-model|content-data] [--filter …] [--with-deps|--no-deps]`
- `debo sync-from [data-model|content-data] [--filter …] [--with-deps|--no-deps]`
- `debo sync-verify`

Omitting the unit argument processes both. Engine `direct`.

## Transformation: co-located `to_drupal` / `from_drupal`

Each blueprint carries two named JSONata expressions:

```
to_drupal   (sync-to):   Designbook artifact   → [ { config_name, data } ]   // Drupal config entities
from_drupal (sync-from): Drupal config (JSON)  → Designbook artifact slice   // data-model.yml / data.yml
```

`transform.md` resolves the blueprint matching the target (by entity type / mapping
template, via the existing `trigger`/`filter` mechanism) and runs the relevant
direction's expression on the addon JSONata runtime. For `sync-to`, `write-config`
serializes to `<config_name>.yml` and `sync` applies `drush cim --partial`. For
`sync-from`, `read-drupal` produces the JSON and `merge` folds the slice into
`data-model.yml` / `data.yml`.

| Filter slice   | `to_drupal` → Drupal                                                       | `from_drupal` → Designbook                  |
|----------------|---------------------------------------------------------------------------|---------------------------------------------|
| bundles+fields | `content.<et>.<bundle>` → `<et>.type.*`, `field.storage.*`, `field.field.*` | → `content.<et>.<bundle>.fields`            |
| displays       | `view_modes` + `entity-mapping` → `entity_view_mode.*`, `entity_view_display.*` | → `view_modes` (+ `entity-mapping`)    |
| config         | `config.*` → `views.view.*`, `image.style.*`, media/taxonomy              | → `config.*`                                |
| content-data   | `data.yml` → content entities                                            | → `data.yml`                                |

### Schema-first principle

Push as much correctness into the schema as possible — the more the schema enforces,
the simpler and safer the transforms. Prefer declarative `provides`/`constrains`
extensions + validators over imperative prose rules. Concrete applications:

- **`fields.<>.type` → enum.** `field-types.md` constrains the (currently free-form)
  type to the known field-type set, so unknown types fail validation up front instead
  of inside a transform.
- **Per-type required settings.** `image` requires `image_style`, `reference` requires
  `target_type`/handler, etc. — enforced by the per-type settings schema, not by a
  runtime check.
- **`view_modes.<>.template` → enum**, constrained by the active extensions/strategy
  skill (e.g. `field-map` always allowed; `layout-builder` only with the LB extension).
- **Drupal-config output schema (validator).** A schema describing a valid
  `{ config_name, data }` entity (required `langcode`/`status`/`uuid`/`dependencies`)
  used as a `validators:` check on `to_drupal` output — so emission invariants are a
  schema, not just the `drupal-config.md` rule. This output schema is a *new* schema
  (validating Drupal output), not a duplicate of `DataModel`.

Transforms therefore assume a validated input shape and produce schema-checked output.

### Logic placement — three layers

The transform logic lives in blueprints, co-located with the definition it serializes,
split across three layers so nothing is duplicated:

1. **Per entity-type / config-type** — `designbook-drupal/data-model/blueprints/<type>.md`
   (`node`, `media`, `view`, `block_content`, `taxonomy_term`, `canvas_page`). How a
   bundle becomes `<et>.type.*` and iterates its fields; how a config-type becomes
   `views.view.*` / `image.style.*`. Its `to_drupal`/`from_drupal` **calls layer 2 per
   field**.
2. **Per field-type (shared, one place)** —
   `designbook-drupal/data-model/blueprints/field-types.md`. The field-type **names**
   already exist as the data-model vocabulary (used in the existing entity-type
   blueprints; many are already Drupal field-type machine names). This file does **not**
   redefine types — it only adds the missing **serialization**: field type ⇄
   `field.storage.*` + `field.field.*`. Because the types are already Drupal-compatible,
   the mapping is mostly **identity**, with a few special cases (`image` → image +
   target settings, `reference` → `entity_reference` + target_type/handler). Reverse
   (`from_drupal`) is usually identity. Cross-cutting; used by every entity-type
   blueprint — never repeated per type. (Distinct from the existing config map
   `sample_data.field_types`, which maps type → sample_template for dummy data only.)

   As a blueprint, `field-types.md` also **extends the `DataModel` schema in-place** via
   the established `provides`/`constrains` merge mechanism (same pattern as component
   tokens): per field type it declares the **settings schema** (e.g. `image` requires
   `image_style`, `reference` requires `target_type`) alongside its `to_drupal` /
   `from_drupal`. One file per-type = validation + forward + reverse. In-place schema
   extension, not a new schema file.
3. **Per display/mapping** — `designbook-drupal/data-mapping/blueprints/<template>.md`
   (+ strategy skill for `field-map`). The view-mode rendering.

`sync/tasks/transform.md` resolves the matching blueprint (via `trigger`/`filter`) and
runs the direction's expression; entity-type expressions delegate field serialization
to `field-types.md`.

### Display strategy: native vs pluggable

- **Native structures** — `template: layout-builder` / `views` / `canvas` — translate
  to/from native Drupal config, **independent of the chosen strategy skill** (their
  `to_drupal`/`from_drupal` live in the existing data-mapping blueprints).
- **`field-map` / generic SDC trees** — handled by the **active strategy skill**. v1
  ships `designbook-display-builder` (UI Patterns family). The ComponentNode
  (component + props + slots, fields plugged in) maps cleanly to a UI Patterns display
  (pattern + props/slots sources), so both directions are close to **1:1 and
  round-trippable**.

Strategy is chosen **project-global** via the active strategy skill.

## Data Flow

**sync-to:**
```
data-model.yml / data.yml / entity-mapping
   │ filter → to_drupal (from matched blueprint)
   ▼
[ { config_name, data } ]  (+ closure if --with-deps)
   │ write-config → YAML
   ▼
Drupal config-sync dir   ← written into the live site
   │ drush config:import --partial
   ▼
live Drupal (config active; content entities created)
```

**sync-from:**
```
live Drupal site
   │ read-drupal (drush, filtered)
   ▼
config/content JSON
   │ from_drupal (from matched blueprint)
   ▼
data-model.yml / data.yml slice
   │ merge
   ▼
Designbook artifacts
```

Config-sync dir resolved from the Drupal docroot via the install skill's mechanism.

## Selective Sync + Dependency Closure

Granularity (both directions) via the shared filter: **all** · **one unit** · **a
filter slice** (`entity_type`/`bundle`/`view_mode`/`config_key`/`record`) · **a single
config entity** (`config_name` or `entity_type.bundle[.view_mode]`).

- **`--with-deps` (default):** closure from the `dependencies` the transforms emit, so
  the target imports standalone (sync-to) / referenced bundles are pulled in
  (sync-from).
- **`--no-deps`:** only the targeted entity verbatim.

A resolver walks the dependency graph derived from the `dependencies` keys.

## sync-verify Workflow

Mirrors `design-verify`. **live Drupal render vs Designbook Storybook render** of the
same `entity.bundle.view_mode`.

- **reference side** = Storybook render (reuse design/ `capture-storybook`).
- **actual side** = live Drupal render after sync.
- **Fix loop:**

```
reference → intake → capture → compare
  → triage → polish (fix the to_drupal transform/blueprint)
  → re-sync-to → re-capture → re-compare → outtake (ScoreReport)
```

### Drupal render capture — OPEN

Capture a **per-entity, per-view-mode** render at a **real URL with full page context**
(theme, libraries, CSS). Raw `drush php:eval` HTML rejected as sole mechanism.
Mechanism **deferred to planning**: (A) a contrib module rendering a single view mode
per entity at a URL (module TBD), or (B) a minimal Designbook preview route returning
`entity_view($entity, $view_mode)` with full render context. Verify requires **≥1
content entity per bundle/view-mode**, so a `sync-to content-data` is a prerequisite.

## Round-trip property

Paired `to_drupal`/`from_drupal` + near-bijective UI Patterns mapping ⇒
**sync-to → sync-from → sync-to** converges. Strong test oracle.

## Transform Correctness (hard requirements)

- `dependencies` (module + config) computed correctly — else `config:import` fails;
  also feeds the closure resolver.
- Required Drupal config keys (`langcode`, `status`, `uuid` where needed).
- `field.storage.*` deduplicated across bundles.
- Provider/namespace resolved at generation time — no placeholders.
- `from_drupal` reuses the existing field-type knowledge; an unmapped Drupal field
  type → stop + report (never silently drop a field).
- No matching blueprint for a template/entity type → stop + report.

## Environment Assumptions

- Reachable, installed Drupal site with `drush` + base URL.
- Theme from the Designbook install skill present.
- Strategy skill declared in `designbook.config.yml`.
- Re-runs overwrite (from-scratch testing per CLAUDE.md).

## Error Handling

- No matching blueprint → stop + report.
- `drush config:import` / read failure → stop, surface drush output verbatim.
- `sync-verify` with no content entity for a bundle/view-mode → stop + report.
- `from_drupal` hits an unmapped field type → stop + report.

## Testing

- JSONata transforms unit-testable both directions (`to_drupal`, `from_drupal`).
- Round-trip tests: to∘from and from∘to converge on fixtures.
- Dependency-closure resolver unit tests.
- Workflow smoke test in the test workspace (`./scripts/setup-workspace.sh`).
- `sync-verify` integration test against a real Drupal site.

## Decision Log

- **Architecture:** Drupal-direct; reuse existing concerns, no neutral format.
- **Concept:** `sync` with explicit direction — `sync-to` / `sync-from` /
  `sync-verify`. No `import` rename needed.
- **Core model:** two units (`data-model`, `content-data`) + shared filter; unit is a
  positional argument; "bundles/displays/config" are filter dimensions.
- **Reuse:** schemas (`data-model`, `design`), entity-type/field/mapping blueprints and
  rules (`designbook-drupal/data-model`, `data-mapping`) reused as-is.
- **Transforms:** JSONata `to_drupal` / `from_drupal` **co-located in the existing
  blueprints** — forward and reverse next to the definition.
- **Logic layers:** per entity-type (blueprint) → per field-type (shared
  `field-types.md`) → per display/mapping (data-mapping blueprint + strategy skill).
  Field serialization lives once in `field-types.md`, never duplicated per entity-type.
- **Schema-first:** maximize schema enforcement (type enum, per-type required settings,
  view-mode template enum, Drupal-config output validator) via `provides`/`constrains`
  + validators; transforms assume validated input and emit schema-checked output.
- **New surface:** one thin `designbook/sync/` concern (orchestration, no new
  schema/rules) + strategy skills.
- **Import source (sync-from):** live Drupal via `drush`.
- **Strategy packaging:** own skills — `designbook-ui-patterns` (UI Suite base) +
  `designbook-display-builder` (concrete strategy, depends on ui-patterns).
- **Selective sync:** down to a single config entity, `--with-deps` (default) /
  `--no-deps`.
- **Verify:** `sync-verify` with fix loop; capture via per-entity/per-view-mode real
  URL with full context (mechanism deferred to planning).
