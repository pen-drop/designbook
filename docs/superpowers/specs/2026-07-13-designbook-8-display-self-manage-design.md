# DESIGNBOOK-8 — Entity view displays self-manage (drop transform.md special-casing) — Design

**Date:** 2026-07-13
**Ticket:** DESIGNBOOK-8 (gaia_chore) — follow-up to DESIGNBOOK-2 (MR !120)
**Status:** Approved design, ready for implementation planning

## Summary

DESIGNBOOK-2 added the Layout Builder + UI Patterns 2 display-authoring pattern
(`designbook-drupal/data-mapping/blueprints/layout-builder-display.md`) and, as the pragmatic
choice flagged in its design, a **special-case routing clause** in the neutral core
`designbook/sync/tasks/transform.md`: for a `core.entity_view_display.*` unit, route to the display
blueprint by active `extensions` rather than by `unit.entity_type`.

This chore removes that clause. A `core.entity_view_display.*` display unit should **self-manage** —
resolve to its display-mapping blueprint purely through the resolution mechanism — so `transform.md`
stays a pure, backend-neutral router that names no Drupal config type.

## Why the special-case exists (root cause)

- `resolve-filter` emits the display unit *inside the content-bundle slice*
  (`resolve-filter.md:66-68`): it carries `entity_type` (node / block_content), `bundle`, `def`.
- `transform.md`'s generic router (`transform.md:89`) routes by two branches: content-derived units
  (carry `entity_type`) → "the blueprint for `unit.entity_type`"; config-slice units (carry
  `config_key`) → "the config-type blueprint."
- A display unit carries `entity_type`, so the generic rule falls into the **entity-type branch** —
  the wrong branch for a display. DESIGNBOOK-2 papered over this with the extension-gated special
  clause.

## Facts that shape the fix (verified)

1. **Blueprint→unit routing is a prose/name convention, not a machine selector.** Data-mapping
   blueprints are picked by matching `blueprint.name` to a `template` value (`map-entity`) or to a
   `unit.config_key` (config-slice, e.g. `image_style`). `transform.md`'s "config-type blueprint"
   phrase has no machine backing (`workflow-resolve.ts` `matchBlueprintFiles()` dedups by
   `type+name`, never by config).
2. **`layout-builder-display.md` is already loaded when appropriate.** It declares
   `trigger.domain: data-mapping` + `filter.extensions: layout_builder`. The TS resolver evaluates
   `filter.extensions` at **workflow-create time** against project config: `layout_builder` active ⇒
   blueprint loaded into transform's context; inactive ⇒ not loaded. So the extension-gating the
   acceptance criteria need already works via the existing `filter`.
3. **The TS resolver has no trigger/filter allow-list** (`workflow-resolve.ts:736-759`
   `matchConditionKey()`): a new `trigger.config_name` key is accepted and, at create time (no unit
   exists yet), simply defers/no-ops. There is no closed frontmatter schema in
   `designbook-skill-creator`. ⇒ **No TypeScript/addon change is required.** The change is
   markdown-authoring only.

## Design — a config-name discriminator, matched by a generic router

The missing piece is not *loading* (already gated) but **per-unit routing**: at runtime `transform`
must know that among the loaded data-mapping blueprints, `layout-builder-display.md` is the one that
authors `core.entity_view_display.*` units. Today that knowledge is hardcoded in `transform.md`.
Move it onto the blueprint as a machine-readable key, and make the router match it generically.

### 1. Blueprint declares the config-name it authors (designbook-drupal)

`layout-builder-display.md` frontmatter gains a `trigger.config_name` glob; `filter.extensions`
stays:

```yaml
trigger:
  domain: data-mapping
  config_name: 'core.entity_view_display.*'   # NEW — self-selects for display units
filter:
  extensions: layout_builder                  # unchanged — gates loading
```

All Drupal display knowledge — the config name, the extension gate — lives on the designbook-drupal
blueprint. The neutral core learns nothing Drupal-specific.

### 2. transform.md becomes a pure, generic router (neutral core)

Replace the entity-view-display-specific paragraph (`transform.md:89`, second half) with one generic
precedence rule that mentions no config type:

> For each unit, follow the `### to_drupal` of the loaded blueprint whose `trigger.config_name` glob
> matches `unit.config_name`, if any (such a blueprint is already extension-gated by its own
> `filter`). Otherwise route by `unit.entity_type` (+ the `field-types` prelude for field units) for
> content-derived units, or the config-type blueprint for config-slice units. With no matching
> blueprint, author from `prepared` (the live typed-config JSON Schema) alone.

The config-name branch takes **precedence** over the entity-type branch — that is what stops a
display unit (which also carries `entity_type`) from falling into the wrong branch, with no
`core.entity_view_display` literal anywhere in the core.

### 3. Document the new key (designbook-skill-creator)

Add `trigger.config_name` to `blueprint-files.md`'s trigger/filter documentation: a glob matched at
**sync-to transform time** against a unit's `config_name`, selecting that blueprint's `### to_drupal`
for the unit. Distinct from `trigger.domain`/`trigger.steps` (create-time loading) — it is a
runtime routing key. This keeps the authoring convention explicit and machine-readable per the
project's schema-first preference. Editing files under `designbook-skill-creator` requires loading
the `designbook-skill-creator` skill first (per CLAUDE.md).

## Behaviour against acceptance criteria

- **`transform.md` contains no `core.entity_view_display.*`-specific routing prose** — the config
  name lives only on the designbook-drupal blueprint; the core router is generic. ✓
- **Display unit resolves to `layout-builder-display.md` when `layout_builder` active, else a plain
  schema-driven display** — LB active ⇒ blueprint loaded (`filter.extensions`) + config-name matches
  ⇒ its `### to_drupal` is followed; LB inactive ⇒ blueprint not loaded ⇒ no config-name match ⇒
  author from `prepared`. Verified by the `sync-block-content` case. ✓
- **Backend-neutrality preserved** — all Drupal display knowledge stays in designbook-drupal
  (blueprint frontmatter + body); the core gains a generic key it matches but never a Drupal literal.
  ✓

## Scope / Non-Goals

- **In scope:** the display routing only. The generic router rewrite *naturally* supports any
  config-name-keyed blueprint (a good generalization at zero extra cost), but this ticket adds the
  key to exactly one blueprint (`layout-builder-display.md`).
- **Non-goal:** retro-fitting `trigger.config_name` onto `views.md` / `image_style` / other
  config-slice blueprints (they work by the existing name convention). YAGNI.
- **Non-goal:** any `ConfigNameUnit` schema change or `resolve-filter` change — the display unit
  already carries what the blueprint needs; `config_name` is already on every unit.
- **Non-goal:** any TypeScript/addon change — the resolver ignores unknown trigger keys; routing is
  runtime AI behaviour in `transform.md`.
- **No backwards-compat / migration** — from-scratch testing (CLAUDE.md).

## Decision log

- Discriminator = `trigger.config_name` glob on the blueprint (matches the ticket's "config-name /
  config-type-keyed blueprint trigger, gated by active extensions"; `config_name` chosen over
  `config_type` because `ConfigNameUnit` carries `config_name`, not a `config_type` field).
- Router precedence: config-name match > entity-type/field-types > config-type-by-name > schema-only.
- No TS change; verification via the `debo-test` `sync-block-content` case + the skill validator.
