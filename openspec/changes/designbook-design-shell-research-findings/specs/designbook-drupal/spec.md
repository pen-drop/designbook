## MODIFIED Requirements

### Requirement: Unified Drupal/SDC skill root

A single skill root at `.agents/skills/designbook-drupal/` with six sub-directories: `data-model/`, `data-mapping/`, `sample-data/`, `components/`, `shell/`, and `components/blueprints/`. The four old roots (`designbook-data-model-drupal`, `designbook-scenes-drupal`, `designbook-sample-data-drupal`, `designbook-components-sdc`) SHALL be deleted.

Required structure:
- `designbook-drupal/SKILL.md`
- `designbook-drupal/{data-model,data-mapping,sample-data,components,shell}/`

#### Scenario: Old skill roots are absent

- **WHEN** the repository is inspected after migration
- **THEN** none of the four old skill root directories exist

---

### Requirement: All files preserved under sub-directories

Every rule, task, blueprint, and resource file SHALL be present under the corresponding sub-directory. Contents identical except updated relative path cross-references.

**data-model/** rules: `canvas.md`, `layout-builder.md`, `drupal-views.md`, `media-image-styles.md`
blueprints: `node.md`, `media.md`, `taxonomy_term.md`, `block_content.md`, `canvas_page.md`, `view.md`

**data-mapping/** blueprints: `field-map.md`, `canvas.md`, `layout-builder.md`, `views.md`

**sample-data/** rules: `canvas.md`, `layout-builder.md`, `formatted-text.md`, `image.md`, `link.md`

**components/** rules: `sdc-conventions.md`, `component-discovery.md`, `layout-constraints.md`
task: `create-component.md`
resources: `twig.md`, `story-yml.md`, `component-yml.md`, `component-patterns.md`, `container-reference.md`, `grid-reference.md`, `section-reference.md`
blueprints: `container.md`, `grid.md`, `section.md`, `header.md`, `footer.md`, `navigation.md`, `page.md`

**shell/** rules: `navigation.md`

#### Scenario: All rule files exist after migration

- **WHEN** the file system is inspected after migration
- **THEN** every rule file listed above exists at its expected path under `designbook-drupal/`

---

### Requirement: when conditions preserved on individual files

Each file retains its original `when:` front-matter condition:

| Location | `when:` condition |
|---|---|
| `data-model/`, `sample-data/` rules/blueprints | `backend: drupal` (+ appropriate `steps:`) |
| `data-mapping/blueprints/` | `steps: [map-entity]` |
| `components/` tasks/rules | `frameworks.component: sdc` or `backend: drupal` |
| `shell/` rules | `backend: drupal` |
| Root `SKILL.md` | **none** |

#### Scenario: Component rule loaded only for SDC framework

- **WHEN** the active framework is not SDC
- **THEN** rules under `components/` with `when: frameworks.component: sdc` are not loaded

---

### Requirement: Root SKILL.md is index-only

Conforms to `skill-md-index` spec: frontmatter with `name: designbook-drupal` and `description`, brief overview, one index section per sub-directory. No execution instructions, procedural steps, or skill-loading directives. Target ~60 lines, max 500.

#### Scenario: SKILL.md contains no procedural instructions

- **WHEN** `designbook-drupal/SKILL.md` is read
- **THEN** it contains only index entries and overview text — no step-by-step instructions or `when:` conditions

---

### Requirement: Entity-type blueprints under data-model/blueprints/

Blueprint files at `data-model/blueprints/<entity_type>.md` for: `node`, `media`, `taxonomy_term`, `block_content`, `canvas_page`, `view`. Each defines base fields and required status. Available during `data-model:intake` and `design-token:intake` steps.

#### Scenario: Node blueprint available during data-model intake

- **WHEN** the `data-model:intake` step runs with `backend: drupal`
- **THEN** `data-model/blueprints/node.md` is loaded and its base field definitions are available

---

### Requirement: Data-model content guidelines

1. **Entity Mapping**: content entities under `content:`, config entities under `config:` in data-model.yml
2. **Field Naming**: base fields have no prefix; custom fields use `field_` prefix
3. **Entity Type Blueprints**: structured markdown per entity type defining base fields and required status
4. **Bundle Purpose**: bundles MAY declare `purpose`; `purpose: landing-page` is the known value for layout-builder/canvas bundles

#### Scenario: Custom field uses field_ prefix

- **WHEN** a data model declares a custom field on a node bundle
- **THEN** the field name uses the `field_` prefix

---

### Requirement: Workflow integration

`debo-data-model` checks `DESIGNBOOK_TECHNOLOGY=drupal`. If true, reads and applies `designbook-drupal/data-model/` blueprints and rules during data model creation.

#### Scenario: Drupal blueprints applied when technology is drupal

- **WHEN** `DESIGNBOOK_TECHNOLOGY=drupal` is set
- **THEN** blueprints and rules under `designbook-drupal/data-model/` are applied during the data-model workflow

---

### Requirement: No executable code

The skill contains only markdown documentation, rules, and blueprint definitions — no executable scripts. Validation and saving remain in `designbook-data-model`.

#### Scenario: No scripts in skill directory

- **WHEN** the `designbook-drupal/` directory is inspected
- **THEN** no `.sh`, `.js`, `.ts`, or other executable script files are present

---

## ADDED Requirements

### Requirement: Drupal-specific scene constraints defined in designbook-drupal rules

Drupal-specific scene authoring constraints that were previously co-located in the core `scenes-constraints.md` rule SHALL be defined exclusively in rule files under `designbook-drupal/`. These constraints apply only when `backend: drupal` and SHALL NOT appear in the core designbook skill.

The following constraints SHALL be present in `designbook-drupal/` rules:

1. **Entity type and bundle format**: Entity references in scene YAML MUST use the `entity_type.bundle` format (e.g., `node.article`, `taxonomy_term.tags`). This format is Drupal-specific and does not apply to other backends.

2. **Image node format**: Image references in scene YAML for Drupal MUST use the `image` key with a media entity reference in `entity_type.bundle` format (e.g., `image: media.image`). Bare file paths or URL strings are not valid for Drupal image nodes.

3. **Listing scene conventions**: Listing pages in a Drupal backend SHALL use an `entity: listing.*` node whose JSONata declares entity refs inline. Detail pages SHALL use an `entity` node with a single `record` index. The `records: [0, 1, 2]` shorthand is for component demos only and MUST NOT be used for listing scenes in a Drupal context.

#### Scenario: Entity reference uses entity_type.bundle format

- **WHEN** a scene YAML file for a Drupal backend project declares an entity reference
- **THEN** the entity type and bundle are expressed as `entity_type.bundle` (e.g., `node.article`), and the Drupal rule flags any reference that uses a different format

#### Scenario: Image node uses media entity reference

- **WHEN** a scene YAML file for a Drupal backend project includes an image node
- **THEN** the image key references a media entity in `entity_type.bundle` format (e.g., `media.image`), and bare file paths or URLs are not used

#### Scenario: Listing page uses listing.* entity node

- **WHEN** a scene YAML file for a Drupal backend project defines a listing page
- **THEN** the scene uses `entity: listing.*` with inline JSONata entity refs, and `records: [0, 1, 2]` shorthand is absent

#### Scenario: Drupal constraints absent from non-Drupal projects

- **WHEN** the active backend is not Drupal
- **THEN** no `designbook-drupal/` rules are loaded and the Drupal-specific entity format, image node, and listing scene constraints do not apply
