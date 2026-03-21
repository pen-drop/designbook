# scene-conventions Specification

## Purpose
Defines authoring conventions for scenes: entity stage routing, listing vs detail patterns, unstructured inline composition, and shell scenes.

---

## Requirement: map-entity stage for structured entity rendering

`map-entity` covers all structured entity rendering: all view modes except `full` when `composition: unstructured`, and recursive entity references.

### Scenario: Recursive entity resolution
- **WHEN** a JSONata expression emits a `type: entity` node (e.g. a Paragraphs reference field)
- **THEN** the agent SHALL apply `map-entity` for that nested entity's view_mode — recursion MAY be arbitrarily deep

### Scenario: Non-full view mode always uses map-entity
- **WHEN** mapping any entity with `view_mode != full`
- **THEN** the agent uses `map-entity` regardless of `composition`

---

## Requirement: compose-entity stage for unstructured entity rendering

Two cases route to `compose-entity`:
1. `entity_type: view` — regardless of view_mode
2. `view_mode: full` AND `composition: unstructured` on a content entity

Extension-specific compose rules apply via `when: extensions: [...]`:
- `layout_builder` → `compose-layout-builder` rule (section components wrapping `block_content` entity refs in column slots)
- `canvas` → `compose-canvas` rule (flat component trees)
- `entity_type: view` → `compose-view-entity` rule (JSONata file with `{}` input, inline entity refs, wrapper component)

---

## Requirement: Listing scenes use config:list

Scene files for listing pages SHALL use a `config: list.*` node, not `entity + records` arrays. `records` is only valid for component demos or isolated entity previews.

### Scenario: Listing scene with config:list
- **WHEN** a scene is generated for a listing page
- **THEN** items contain a `config: list.<name>` node referencing a named list in `data-model.yml`

### Scenario: Detail scene with entity
- **WHEN** a scene is generated for a single-entity detail page
- **THEN** items use an `entity` node with a single `record` index

---

## Requirement: designbook-scenes skill resources are split by concern

- `field-reference.md` — YAML field tables only (file-level and scene-level fields)
- `entry-types.md` — all entry types: component, entity, records, config, scene-ref (notes that `records` is for demos only)
- `config-list.md` — full config:list contract: syntax, data-model mapping, sources structure, JSONata bindings (`$rows`, `$count`, `$limit`)

---

## Requirement: Entity nodes support inline component trees

An entity node in scenes.yml MAY carry a `components` array containing a static `RawNode[]` tree. When present, the entityBuilder returns it directly without loading a JSONata expression file.

### Scenario: Inline components bypass JSONata lookup
- **WHEN** an entity node has a `components` array
- **THEN** the entityBuilder returns that array as `RawNode[]` without attempting to load a `.jsonata` file

### Scenario: Nested entity refs in inline components are resolved
- **WHEN** an inline `components` array contains `entity` nodes
- **THEN** `resolveEntityRefs` recursively resolves them to `ComponentNode[]`

### Scenario: Entity node without components follows existing path
- **WHEN** an entity node has no `components` key
- **THEN** the entityBuilder follows the existing JSONata lookup path unchanged

---

## Requirement: Shell scenes — application layout container

Shell scenes compose a `page` component with `header`, `content`, and `footer` slots. Located at `designbook/design-system/design-system.scenes.yml`.

### Components
- **page**: slots `header`, `content`, `footer` — full viewport height, sticky header, content fills remaining space
- **header**: props `logo`, `nav_items`, `cta` — responsive hamburger on mobile
- **footer**: props `links`, `copyright`, `social`

### Storybook integration
- Title maps to `Designbook/Design System/{name}`
- `debo-design-shell.md` workflow produces `design-system.scenes.yml` + ensures page/header/footer components exist
- Section scenes reference shell layout via `layout: "design-system:shell"`
