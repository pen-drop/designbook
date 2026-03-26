## 1. Entity Type Schema Files

- [x] 1.1 Create `entity-types/node.yml` — base fields: title (required), status (required), body (optional)
- [x] 1.2 Create `entity-types/media.yml` — base fields: name (required), status (required)
- [x] 1.3 Create `entity-types/taxonomy_term.yml` — base fields: name (required), description (optional), weight (optional)
- [x] 1.4 Create `entity-types/block_content.yml` — extensions: [layout_builder], base fields: info (required), status (required)
- [x] 1.5 Create `entity-types/canvas_page.yml` — extensions: [canvas], base fields: title (required), components (required)
- [x] 1.6 Create `entity-types/view.yml` — section: config, base_fields: [], view_modes required

## 2. Intake Task Integration

- [x] 2.1 Add step to `designbook-data-model:intake` task to scan and load entity type schemas from `designbook-drupal/data-model/entity-types/` (filtered by active backend + extensions)
- [x] 2.2 Document enforcement rules in the intake task: required base fields always included, optional base fields prompted per bundle
- [x] 2.3 Document view entity type handling: no fields, view_modes required, error if missing

## 3. Cleanup — Remove Scattered Entity Type Knowledge

- [x] 3.1 `drupal-data-model.md` — remove entity mapping table and base field list; replace with: "Entity types and their base fields are defined in `entity-types/*.yml`"
- [x] 3.2 `drupal-field-naming.md` — remove entity type list and base field examples; keep only the `field_` prefix rule (that's behavior, not structure)
- [x] 3.3 `layout-builder.md` — remove the entity types table (node, block_content) and field examples; keep only view_mode template rules and structural rules
- [x] 3.4 `canvas.md` — remove the canvas_page field definitions and YAML example; keep only rules that aren't covered by the schema (e.g. "do NOT use node for Canvas pages")
- [x] 3.5 `drupal-views.md` — remove the view entity type description and YAML example; keep only template and sample data rules not covered by the schema
