## Context

The `designbook-drupal/data-model/` skill guides the AI when building Drupal data models. Currently, knowledge about which base fields each entity type requires lives scattered across multiple prose rule files (`drupal-data-model.md`, `drupal-field-naming.md`, extension rules). The AI must infer this from text, leading to inconsistency — missing required fields or inconsistent naming.

## Goals / Non-Goals

**Goals:**
- Structured YAML schema files per entity type — one file = one entity type
- Each schema declares `base_fields` with `required` boolean and `section` (content vs config)
- Extension-specific entity types carry an `extensions` condition
- The intake task enforces: required base fields always present, optional base fields prompted
- Easy to extend: adding a new entity type = adding a new file

**Non-Goals:**
- Bundle-level overrides (deferred to a future change)
- Mechanical/programmatic validation (KI-driven enforcement only)
- Changes to `data-model.yml` output format

## Decisions

### 1. YAML files, not markdown-with-YAML-blocks

Entity type schemas are data, not instructions. Keeping them as pure `.yml` files enforces structure — no prose drift, no inconsistency between files. The AI reads YAML reliably.

*Alternative*: embed YAML blocks in `.md` rule files (current pattern). Rejected because it mixes definition with behavior and allows inconsistent structure.

### 2. `required` on `base_fields` = field must appear in data-model.yml

`required: true` → AI always includes this field, no prompt needed.
`required: false` → AI asks the user whether this bundle uses it.
Fields marked `include: never` (Drupal-internal fields like `uid`, `created`) are omitted entirely — not listed in `base_fields`.

### 3. `section` key distinguishes content vs config entities

`section: content` → field goes under `content.<entity_type>.<bundle>`
`section: config` → field goes under `config.<entity_type>.<bundle>`

Views use `section: config` with no base_fields — only `view_modes` is required.

### 4. `extensions` condition mirrors existing rule file pattern

Extension-specific entity types (`block_content`, `canvas_page`) carry `extensions: [<id>]`. The intake task only applies these schemas when the matching extension is active in `designbook.config.yml`.

### 5. Intake task loads schemas explicitly

The data-model intake task (`designbook-data-model:intake`) gains a step: scan `designbook-drupal/data-model/entity-types/*.yml`, filter by backend + active extensions, apply base field enforcement to all bundles of each entity type.

## Risks / Trade-offs

- **KI drift**: KI may not always load schema files unless the intake task explicitly instructs it → Mitigation: intake task must name the scan step clearly
- **Schema staleness**: if Drupal base fields change, YAML files must be updated manually → acceptable, Drupal base fields are stable
- **view rows deferred**: `rows`, `items_per_page` etc. on `view` entity type are out of scope here → noted in schemas as "to be extended"
