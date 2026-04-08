# Designbook Drupal Specification

## Purpose
Consolidated Drupal/SDC skill root structure with entity-type blueprints under a single skill at `.agents/skills/designbook-drupal/`.

---

## Requirement: Unified Drupal/SDC skill root
A single skill root at `.agents/skills/designbook-drupal/` with six sub-directories: `data-model/`, `data-mapping/`, `sample-data/`, `components/`, `shell/`, and `components/blueprints/`. The four old roots (`designbook-data-model-drupal`, `designbook-scenes-drupal`, `designbook-sample-data-drupal`, `designbook-components-sdc`) SHALL be deleted.

Required structure:
- `designbook-drupal/SKILL.md`
- `designbook-drupal/{data-model,data-mapping,sample-data,components,shell}/`

---

## Requirement: All files preserved under sub-directories
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

---

## Requirement: when conditions preserved on individual files
Each file retains its original `when:` front-matter condition:

| Location | `when:` condition |
|---|---|
| `data-model/`, `sample-data/` rules/blueprints | `backend: drupal` (+ appropriate `steps:`) |
| `data-mapping/blueprints/` | `steps: [map-entity]` |
| `components/` tasks/rules | `frameworks.component: sdc` or `backend: drupal` |
| `shell/` rules | `backend: drupal` |
| Root `SKILL.md` | **none** |

---

## Requirement: Root SKILL.md is index-only
Conforms to `skill-md-index` spec: frontmatter with `name: designbook-drupal` and `description`, brief overview, one index section per sub-directory. No execution instructions, procedural steps, or skill-loading directives. Target ~60 lines, max 500.

---

## Requirement: Entity-type blueprints under data-model/blueprints/
Blueprint files at `data-model/blueprints/<entity_type>.md` for: `node`, `media`, `taxonomy_term`, `block_content`, `canvas_page`, `view`. Each defines base fields and required status. Available during `data-model:intake` and `design-token:intake` steps.

---

## Requirement: Data-model content guidelines
1. **Entity Mapping**: content entities under `content:`, config entities under `config:` in data-model.yml
2. **Field Naming**: base fields have no prefix; custom fields use `field_` prefix
3. **Entity Type Blueprints**: structured markdown per entity type defining base fields and required status
4. **Bundle Purpose**: bundles MAY declare `purpose`; `purpose: landing-page` is the known value for layout-builder/canvas bundles

---

## Requirement: Workflow integration
`debo-data-model` checks `DESIGNBOOK_TECHNOLOGY=drupal`. If true, reads and applies `designbook-drupal/data-model/` blueprints and rules during data model creation.

---

## Requirement: No executable code
The skill contains only markdown documentation, rules, and blueprint definitions — no executable scripts. Validation and saving remain in `designbook-data-model`.
