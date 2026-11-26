# DESIGNBOOK-10 — `_formatted` companion fields in sample data

## Intent

A design often shows a field's value in display form: a formatted number, a date, a price with
currency. Sample data holds one raw value per field, so a design can't show that form today.
BAKERS-365 is blocked on this. Sample data gets a companion key `<field>_formatted` that holds
the display string. A mapping binds the companion like any field. On Drupal the binding becomes
a field formatter on `<field>`, so Drupal renders the display form itself.

## Revision (rework)

A mapping binds `<field>`, never `<field>_formatted`. Where `<field>` fills a slot, Storybook shows
the companion when the record has one; a prop keeps the raw value. The mapping and the Drupal export
stay unchanged: a slot-filled field is already a `field_block` with its formatter. The sections below
describe the first design; where they bind `<field>_formatted`, this revision wins.

## Goals (acceptance AC-1…AC-8)

- A record with a declared `<field>` and a string `<field>_formatted` validates. The data model
  declares no `_formatted` field (AC-1).
- `<field>_formatted` without a declared `<field>` fails validation and names the field (AC-2).
- A field-map binding to `<field>_formatted` passes `plan build`/`plan done`. Storybook renders
  the companion string (AC-3, AC-4).
- On Drupal the binding places `<field>` with a formatter. Nothing is created for
  `<field>_formatted` (AC-5). The formatter type comes from `<field>`'s type, and a per-view-mode
  setting can override it (AC-6).
- Data and mappings without companions behave exactly as today (AC-7).

## Non-goals

- Backend-native formatting for Vue or WordPress. Their bindings read the sample string only.
- Generating `_formatted` values automatically.
- Declaring companions in the data model.

## Approaches

1. **Suffix convention, recognised by validator and planner** (chosen). The key `<field>_formatted`
   is valid when `<field>` is declared. The JSONata compile is unchanged (`$fields.<field>_formatted`).
   The renderer already evaluates the mapping against the whole record. The change is small and
   leaves every existing artifact alone.
2. Structured value `{ value, formatted }` per field. Rejected: it changes the shape of every field,
   breaks existing mappings and the renderer, and violates AC-7.
3. A declared data-model field with `formatter_of: <field>`. Rejected: AC-1/D2 keep the data model
   unchanged, and sync would have to know not to create storage for it.

## Design

### Addon (TypeScript)

- New `src/shared/formatted-field.ts`: `FORMATTED_SUFFIX = '_formatted'` and
  `formattedBase(name): string | undefined`, which returns the base name for a suffixed key.
- `validation/data.ts`: a record key that is not in the data model and has a declared base:
  - accepted silently when it holds a string;
  - an error `Field "<key>" on <et>.<bundle> id=<id> must be a string` when it holds anything else.

  A suffixed key with an undeclared base is an error:
  `Field "<key>" on <et>.<bundle> id=<id> has no declared base field "<base>"`. Other unknown keys
  keep their current warning (AC-7).
- `workflow/plan-composition.ts`: a binding field that is not declared but whose base is declared
  counts as a known field of type `string`. The existing checks then apply unchanged: an `entity`
  descriptor is rejected as "not a reference field", and image rules don't apply. A companion with
  an undeclared base keeps the existing `unknown field` error.
- `plan-composition-result.ts`: no change. The compiled expression is `$fields.<field>_formatted`.

### Skills

- `designbook/skills/sample-data/resources/format.md`: new section "Formatted companions". It covers
  the key shape, string-only values, the declared-base requirement, and when to add one (a scene
  shows the field in display form).
- `designbook/skills/sample-data/blueprints/sample-records.md`: one line saying to add a companion
  when a planned binding names it.
- `designbook/design/schemas.yml` › `MappingBinding.field` description: it may name
  `<field>_formatted`, a sample-data companion of a declared field.
- `designbook-drupal/data-mapping/blueprints/field-map.md`: a section on binding a companion, and a
  new supported view-mode setting `formatters: { <field>: { type, settings } }` that overrides the
  derived formatter.
- `designbook-drupal/data-mapping/blueprints/layout-builder-display.md`: a `_formatted` binding
  becomes a `field_block` on `<field>` (`field_block:<et>:<bundle>:<field>`). The formatter table
  gains `integer → number_integer`, `boolean → boolean`, and `timestamp`/`created`/`changed` →
  `timestamp`. The view mode's `settings.formatters.<field>` wins over the table.
- New rule `designbook-drupal/data-mapping/rules/formatted-companion.md`, a hard constraint: a
  `<field>_formatted` binding never yields field storage, a field instance or a placement of its
  own. It places `<field>` with a formatter.

## Decisions (run's own calls under `auto`)

- **D4.** The override lives in the data model under `view_modes.<vm>.settings.formatters.<field>`,
  not in the plan's binding params. Plan params aren't on disk when `sync-to` runs later. The
  view-mode `settings` object is free-form and already documented per template
  (`primary_image_field`). So no schema change is needed, and the override still applies per
  binding (view mode × field).
- **D5.** A non-string companion is an error, not a warning. D2 says the value is string-valued, and
  a silent non-string would render wrongly.
- **D6.** Companions are allowed for any declared base type. The companion is always a plain string
  prop or slot value.

## Left to the builder

The exact test names. The wording of the skill-file additions, which must follow the
skill-creator rules.
