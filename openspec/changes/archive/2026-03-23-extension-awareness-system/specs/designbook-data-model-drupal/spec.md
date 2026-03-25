## MODIFIED Requirements

### Requirement: Drupal data model rule is extension-aware

The `drupal-data-model.md` rule SHALL read active extensions from `designbook.config.yml` and apply extension-specific guidance dynamically, instead of using static conditional comments.

#### Scenario: No extensions configured

- **WHEN** `extensions` is empty or absent in config
- **THEN** the data model rule SHALL apply default Drupal entity mapping (node, media, taxonomy_term)
- **AND** SHALL NOT suggest `block_content` by default

#### Scenario: layout_builder extension active — entities and view_mode templates

- **WHEN** `extensions` contains an entry with `id: layout_builder`
- **THEN** the data model rule SHALL suggest `block_content` as a valid entity type for reusable layout sections
- **AND** node bundles used as landing pages SHALL have `view_modes.full.template: layout-builder` set in `data-model.yml`
- **AND** block_content bundles SHALL have `view_modes.default.template: field-map` (their own rendering uses field mapping)
- **AND** all non-full view modes (teaser, card, etc.) on landing page nodes SHALL use `template: field-map`

#### Scenario: canvas extension active — entities and view_mode templates

- **WHEN** `extensions` contains an entry with `id: canvas`
- **THEN** the data model rule SHALL suggest `canvas_page` as the entity type for Canvas-managed pages (not `node`)
- **AND** `canvas_page` bundles SHALL have `view_modes.full.template: canvas` set in `data-model.yml`
- **AND** `canvas_page` bundles in `data-model.yml` appear under `content.canvas_page.<bundle>`
- **AND** the `component_tree` field (or its confirmed machine name) stores the inline component tree — no intermediate entity needed
- **AND** SHALL NOT suggest `block_content` for Canvas pages

#### Scenario: paragraphs extension active

- **WHEN** `extensions` contains an entry with `id: paragraphs`
- **THEN** the data model rule SHALL suggest adding a `paragraph` entity type
- **AND** reference fields pointing to paragraphs SHALL use type `entity_reference_revisions`

#### Scenario: Extension with URL — AI fetches for context

- **WHEN** an active extension has a `url` declared
- **AND** no dedicated `skill` is linked
- **THEN** the data model intake SHALL fetch the URL before proposing entities and fields
- **AND** apply any extension-specific entity types or field types found in the documentation

#### Scenario: Extension rule loaded via when.extensions condition

- **WHEN** a rule file in `.agents/skills/` declares `when: extensions: canvas`
- **AND** `canvas` is present in `DESIGNBOOK_EXTENSIONS`
- **THEN** the CLI SHALL include that rule file automatically for the matching stages
- **AND** no explicit skill reference is needed in the extension config entry

#### Scenario: Extension with skill — full skill loaded as config_instruction

- **WHEN** an active extension has a `skill` declared (e.g. `skill: designbook-data-model-paragraphs`)
- **THEN** that skill SHALL be loaded automatically as a config_instruction during data model stages
- **AND** the skill's rules and task context take precedence over generic rule-file resolution
- **AND** this is appropriate for complex extensions with dedicated task files, not just constraint rules
