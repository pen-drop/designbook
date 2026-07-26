# DESIGNBOOK-2 — Entity View Displays for Layout Builder + UI Patterns 2 (sync-to) — Design

**Date:** 2026-07-10
**Ticket:** DESIGNBOOK-2 (gaia_feature)
**Status:** Approved design, ready for implementation planning

## Summary

`sync-to` (Designbook → Drupal, schema-driven export) already emits the
`core.entity_view_display.<et>.<bundle>.<view_mode>` config-name unit and validates the
result against the live typed-config JSON Schema fetched by `prepare`. But **no
`### to_drupal` pattern tells the generator what structure to author** for the display —
for a plain field-map display the fetched schema is enough guidance, but for the **Layout
Builder + UI Patterns 2** rendering path it is not: the schema permits any valid shape, not
the specific LB-section + UI-Patterns component mapping the path requires.

This feature adds that authoring pattern. It is expressed entirely as **`designbook-drupal`
blueprints** (the schema-driven model treats blueprints as generator *guidance*, not
executed code), with the UI-Patterns-2 sub-block factored into a **shared blueprint** so
DESIGNBOOK-3 (Display Builder) reuses it unchanged.

## Context / Goal

Two Drupal rendering paths:

- **Layout Builder + UI Patterns 2** — older projects — **this ticket**.
- **Display Builder** (built on UI Patterns 2) — newer — **DESIGNBOOK-3**.

The UI-Patterns-2 config (`component_id`, `variant_id`, `props` as `{source_id, source}`,
`slots`) is **byte-identical** across both paths, so it must be produced by a **shared
mechanism reusable by DESIGNBOOK-3**.

Reference project (verified): `/home/cw/projects/daisy-cms` — Layout Builder, `ui_patterns`
2.0.x, theme `ui_suite_daisyui`; e.g.
`web/sites/default/files/sync/core.entity_view_display.block_content.hero.default.yml`.

## Decisions (locked with the ticket owner)

- **Packaging:** everything lands in the existing **`designbook-drupal`** integration skill.
  No new `designbook-ui-patterns` / `designbook-display-builder` skill (the 2026-06-26 sync
  design doc floated those; superseded here). The shared UI-Patterns mechanism is a
  **blueprint**, not a skill.
- **No per-entity Layout Builder overrides.** `allow_custom: false` (matches daisy-cms). The
  ticket does not cover editor-customized per-node layouts.
- **Scope of displays:** both (a) **block_content** bundles whose display renders as a
  single UI-Patterns component section (hero/card SDC-as-layout — the ticket's explicit
  examples), and (b) **node/full** displays built entirely with Layout Builder, where each
  section is a `ui_patterns:<set>:<component>` layout with node fields placed as
  `field_block`s into the slot regions (possibly multiple sections). Node/full sections are
  **UI-Patterns layouts with field_blocks** — NOT sections that reference block_content
  entities.
- **Mapping source:** reuse Designbook's existing **entity-mapping ComponentNode**
  (`component` + `props` + `slots`, fields plugged in). No new parallel data-model schema.

## Target config shape (verified in daisy-cms)

`core.entity_view_display.block_content.hero.default`:

- `third_party_settings.layout_builder.enabled: true`, `allow_custom: false`,
  `sections: [ … ]`.
- one section: `layout_id: 'ui_patterns:<set>:<component>'` (e.g.
  `ui_patterns:ui_suite_daisyui:hero`), `layout_settings.ui_patterns` =
  `{ component_id, variant_id, props{}, slots{} }`, `layout_settings.context_mapping.entity:
  layout_builder.entity`.
- `props` each a `{source_id, source}` pair:
  - static: `attributes` / `checkbox` / `select` / `url` with a literal `source.value`.
  - `token`: `source.value: '[block_content:uuid:value]'`.
  - field-derived: `source_id: entity_field`, `source.derivable_context:
    'field:<et>:<bundle>:<field>'`, and a same-named key holding
    `value.source_id: 'ui_patterns_source:<et>:<field>'` (or
    `field_property:<et>:<field>:<prop>` for a specific field property).
  - `variant_id`: `null` when the SDC declares no `variants` (hero), else a field-derived
    `{source_id, source}` (card, derived from a component-settings field).
- UUID-keyed `sections[].components.<uuid>`: one `field_block:<et>:<bundle>:<field>` per
  field-filled slot, `region` = the SDC slot name, `configuration.context_mapping.entity:
  layout_builder.entity` + `view_mode: view_mode`, `configuration.formatter` chosen by field
  type (`string`, `text_default`, `link`, media formatter, …). A field that itself renders
  as a nested SDC uses `formatter.type: ui_patterns_component_per_item` whose
  `settings.ui_patterns` is the SAME `{component_id, variant_id, props, slots}` block again.
- top-level `content` / `hidden`: fields placed as `field_block`s are listed under `hidden`;
  a component-settings field (if any) sits in `content` with the `ui_patterns_source`
  formatter.

SDC prop **type** determines the static `source_id`: `boolean → checkbox`, enum `string →
select`, `$ref: ui-patterns://url → url`, attributes → `attributes`. Slot names come from the
SDC `slots:`; `variants:` presence decides whether `variant_id` is `null`.

## Architecture — blueprints as generator guidance

`sync-to`'s `transform` task iterates config-name units; per unit it fetches the live
typed-config JSON Schema (`prepare`) and the AI authors a per-config-name `.jsonata` guided
by the **matching blueprint's `### to_drupal` pattern**. This feature supplies that pattern
for `core.entity_view_display.*` in the Layout Builder path.

### New: `designbook-drupal/data-mapping/blueprints/ui-patterns.md` (shared)

Rendering-path-neutral. Documents the **UI-Patterns-2 sub-pattern**: given a ComponentNode
+ the SDC `.component.yml`, produce the `ui_patterns` block —
`component_id: '<provider>:<component>'`, `variant_id`, `props{}` each `{source_id, source}`,
`slots{}`. Prop-source rules:

- literal ComponentNode prop value → static source, `source_id` by SDC prop type
  (checkbox / select / url / attributes); a `[token]`-shaped literal → `token`.
- field-reference prop value (`$fields.field_x`) → `entity_field` + `derivable_context` +
  `ui_patterns_source:<et>:<field>` leaf.
- `variant_id`: `null` if the SDC has no `variants`, else field-derived.

Contains **no** Layout Builder / Display Builder specifics → DESIGNBOOK-3 references it
verbatim.

### New: `designbook-drupal/data-mapping/blueprints/layout-builder-display.md` (gated)

`filter: extensions: layout_builder`. The `### to_drupal` pattern for
`core.entity_view_display.<et>.<bundle>.<view_mode>` on the LB path:

- `third_party_settings.layout_builder.enabled: true`, `allow_custom: false`, `sections[]`.
- each section: `layout_id: 'ui_patterns:<set>:<component>'`, `layout_settings.ui_patterns`
  = the shared block (`ui-patterns.md`), `layout_settings.context_mapping.entity:
  layout_builder.entity`.
- per field-filled slot: UUID-keyed `field_block:<et>:<bundle>:<field>` component,
  `region` = slot name, `context_mapping.entity: layout_builder.entity` + `view_mode`,
  formatter by field type; nested-SDC slot (a ComponentNode/EntityNode in the slot) →
  `ui_patterns_component_per_item` carrying its own nested shared block.
- top-level `content` / `hidden` derived from field placement.
- One section for a block_content SDC-as-layout display; one-or-more sections for a node/full
  LB display (each a UI-Patterns layout with node `field_block`s).

### Rule tweak: `designbook-drupal/data-model/rules/layout-builder.md`

Note that per-entity overrides are out of scope (`allow_custom: false`), and that the LB
path uses a UI-Patterns-section display for block_content `default` and landing-page `full`.

### Input surfacing (keep it in designbook-drupal)

The blueprint pattern instructs the generator to read the bundle's entity-mapping
ComponentNode (`entity-mapping/<et>.<bundle>.<vm>.jsonata`) + the SDC `.component.yml`
directly. This avoids a `resolve-filter.md` change — the display unit already carries
`entity_type` / `bundle` / view-mode `def`; the pattern derives the rest from artifacts on
disk.

### transform.md lookup — the one possible core touch (resolve in planning)

`transform.md` currently resolves the blueprint by `unit.entity_type` (+ field-types /
config-type). A `core.entity_view_display.*` unit must resolve to the **display** blueprint,
selected by the view-mode `template` + active `extensions`. Planning must verify whether the
generic trigger/filter blueprint resolution already matches a `domain: data-mapping` display
blueprint for a display unit:

- **If yes** → zero change to `designbook/sync/` (everything stays in designbook-drupal).
- **If no** → a minimal, backend-neutral lookup tweak in `transform.md` (route
  `core.entity_view_display.*` to the display blueprint by template+extensions). This is
  mechanism, not Drupal domain code; flagged for the ticket owner because it touches the
  neutral core.

## Open nuances (resolve during planning)

- **UUID minting.** `sections[].components` are UUID-keyed. Re-running `sync-to` must not
  churn UUIDs (idempotency + clean `config:import`). JSONata has no UUID primitive → decide a
  **deterministic** UUID source (e.g. uuid5 of `config_name + field_name`) via an addon
  helper exposed to the transform, vs. accepting random UUIDs. Prefer deterministic.
- **variant_id** when the SDC declares `variants` but the ComponentNode carries no variant
  selector — default to `null` or derive from a designated component-settings field; decide
  the rule.
- **SDC prop types** must be read at generation time (`components/<comp>/<comp>.component.yml`)
  to pick the static `source_id`.
- **daisy-cms `field_component` indirection is NOT replicated.** daisy-cms funnels several
  props through one `ui_patterns_source` settings field. Designbook derives field-props from
  the actual mapped fields and static props from literals → the output is a **structural**
  match to the reference shape (same section / ui_patterns / field_block structure), not an
  identical `field_component` wiring. Acceptance is "matches the reference shape for at least
  one component bundle" — structural.

## Fixture / eval

- A daisy-cms-like drupal fixture with at least one block_content component bundle (hero or
  card) whose `sync-to` output **validates against the live typed-config schema**
  (`designbook:config-validate` / `config:import`) and **matches the reference shape**.
- Reuse the `drupal-web` sync-eval harness (the `sync-*` cases + `debo-test` research loop,
  per `2026-06-30-sync-e2e-eval-design.md`): add a LB+UIP case whose `expected_config`
  includes `core.entity_view_display.block_content.<bundle>.default`, scored by the existing
  `validate_pass_rate` + cim + `existence_rate` metric.

## Non-Goals

- No per-entity Layout Builder overrides (`allow_custom` stays `false`).
- No new strategy skill (`designbook-ui-patterns` / `designbook-display-builder`) — all
  content is `designbook-drupal` blueprints/rules.
- No backwards-compat / migration of prior sync output — testing is from scratch (CLAUDE.md).
- No replication of daisy-cms's `field_component` settings-field indirection.
- No Display Builder path (DESIGNBOOK-3) — only the shared `ui-patterns.md` it will later
  reuse.

## Acceptance mapping (ticket criteria → this design)

1. Valid `core.entity_view_display.*` on the LB path, imports cleanly → the
   `layout-builder-display.md` pattern + live-schema validation.
2. Props `{source_id, source}` (field-derived / static / variant) → the shared
   `ui-patterns.md` prop-source rules.
3. Field → `field_block:<et>:<bundle>:<field>`, `region` = slot, nested via
   `ui_patterns_component_per_item` → `layout-builder-display.md` component rules.
4. Shared UIP2 mechanism reusable by DESIGNBOOK-3 → `ui-patterns.md` is path-neutral.
5. `context_mapping.entity: layout_builder.entity` at section + component level →
   `layout-builder-display.md`.
6. Validates against live typed-config schema + matches daisy-cms shape for ≥1 bundle → the
   fixture/eval.

## Decision Log

- Everything in `designbook-drupal`; shared UIP2 = a blueprint, not a skill.
- `allow_custom: false`; no per-entity overrides.
- Scope: block_content SDC-as-layout displays + node/full LB displays (UI-Patterns sections
  with field_blocks; not block_content-referencing sections).
- Mapping from the existing entity-mapping ComponentNode; no new data-model schema.
- Input surfaced by the blueprint reading entity-mapping + SDC on disk (no resolve-filter
  change).
- transform.md lookup may need a minimal neutral tweak; verified/decided in planning.
- Deterministic UUIDs preferred for idempotent re-sync.
