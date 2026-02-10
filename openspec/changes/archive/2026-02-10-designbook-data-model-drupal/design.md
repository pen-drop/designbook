## Context

Designbook needs to support technology-specific data models. Currently, it generates a generic JSON. For Drupal integration, we need to map this generic model to Drupal's entity system (Nodes, Media, Paragraphs, etc.) and adhere to its naming conventions (field prefixes). The `designbook.config.yml` now dictates the target technology, so we need a skill that activates when `technology: drupal`.

## Goals / Non-Goals

**Goals:**
- Create a `designbook-data-model-drupal` skill.
- Implement a script that transforms the generic data model JSON into a Drupal-compatible structure.
- Map "content" → "node", "assets" → "media".
- Prefix all fields with `field_` unless they are bundle keys.
- Store the resulting Drupal-specific data model (or an intermediate representation) where the Drupal integration can consume it.

**Non-Goals:**
- Actually generating PHP code or Drupal config files (YML) directly (that might be a further step, but this skill focuses on the *data model* representation in Designbook).
- Handling every possible Drupal entity type (focus on core Node and Media first).

## Decisions

- **Skill Selection**: The workflow (`debo-data-model`) will check `DESIGNBOOK_TECHNOLOGY`. If `drupal`, it invokes `designbook-data-model-drupal`. If `html` (default), it invokes the original `designbook-data-model`.
- **Field Naming**: All fields will be prefixed with `field_`. This is a hard requirement for Drupal configuration to avoid conflicts with base table fields (like `title`, `status`, `uid`).
- **Entity Mapping**:
    - `content` -> `node`
    - `assets` -> `media`
    - Any other root keys might need a default mapping or be ignored/warned.

## Risks / Trade-offs

- **Risk**: Over-simplification of Drupal's complex entity model.
- **Trade-off**: We are opinionated about the mapping (Content=Node) to keep the Designbook model simple for users. Advanced Drupal users might want more control (e.g., Block Content, Taxonomy), which we can add later.

## Migration Plan

- No migration needed for existing data models as this is a new technology option. Existing HTML projects are unaffected.

## Open Questions

- Should we strictly validate that the "bundle" names are valid machine names? (Yes, simple regex check).
