## ADDED Requirements

### Requirement: Unified Drupal/SDC skill root
A single skill root at `.agents/skills/designbook-drupal/` SHALL contain all Drupal-backend and SDC-framework content organized in four sub-directories: `data-model/`, `scenes/`, `sample-data/`, `components/`. The four original skill roots (`designbook-data-model-drupal`, `designbook-scenes-drupal`, `designbook-sample-data-drupal`, `designbook-components-sdc`) SHALL be deleted.

#### Scenario: Old skill roots removed
- **WHEN** the change is applied
- **THEN** `.agents/skills/designbook-data-model-drupal/` SHALL NOT exist
- **AND** `.agents/skills/designbook-scenes-drupal/` SHALL NOT exist
- **AND** `.agents/skills/designbook-sample-data-drupal/` SHALL NOT exist
- **AND** `.agents/skills/designbook-components-sdc/` SHALL NOT exist

#### Scenario: New skill root exists with sub-directories
- **WHEN** the change is applied
- **THEN** `.agents/skills/designbook-drupal/SKILL.md` SHALL exist
- **AND** `.agents/skills/designbook-drupal/data-model/` SHALL exist
- **AND** `.agents/skills/designbook-drupal/scenes/` SHALL exist
- **AND** `.agents/skills/designbook-drupal/sample-data/` SHALL exist
- **AND** `.agents/skills/designbook-drupal/components/` SHALL exist

### Requirement: All rule and task files preserved under sub-directories
Every rule file, task file, and resource file from the four original skills SHALL be present under the corresponding sub-directory in `designbook-drupal/`. File contents SHALL be identical except for updated internal cross-references (relative paths).

#### Scenario: data-model rules present
- **WHEN** the skill root is scanned
- **THEN** `data-model/rules/drupal-data-model.md` SHALL exist
- **AND** `data-model/rules/canvas.md` SHALL exist
- **AND** `data-model/rules/layout-builder.md` SHALL exist
- **AND** `data-model/resources/drupal-views.md` SHALL exist

#### Scenario: scenes rules present
- **WHEN** the skill root is scanned
- **THEN** `scenes/rules/field-map.md` SHALL exist
- **AND** `scenes/rules/canvas.md` SHALL exist
- **AND** `scenes/rules/layout-builder.md` SHALL exist
- **AND** `scenes/resources/field-mapping.md` SHALL exist

#### Scenario: sample-data rules present
- **WHEN** the skill root is scanned
- **THEN** `sample-data/rules/sample-canvas.md` SHALL exist
- **AND** `sample-data/rules/sample-layout-builder.md` SHALL exist
- **AND** `sample-data/rules/sample-formatted-text.md` SHALL exist
- **AND** `sample-data/rules/sample-image.md` SHALL exist
- **AND** `sample-data/rules/sample-link.md` SHALL exist

#### Scenario: components files present
- **WHEN** the skill root is scanned
- **THEN** `components/rules/sdc-conventions.md` SHALL exist
- **AND** `components/rules/component-discovery.md` SHALL exist
- **AND** `components/tasks/create-component.md` SHALL exist
- **AND** `components/resources/` SHALL contain twig.md, story-yml.md, component-yml.md, component-patterns.md, layout-reference.md

### Requirement: when conditions preserved on individual files
Each rule and task file SHALL retain its original `when:` front-matter condition. Rules in `data-model/`, `scenes/`, and `sample-data/` SHALL have `when: backend: drupal`. Tasks and rules in `components/` SHALL have `when: frameworks.component: sdc`. No `when:` condition SHALL appear on the root `SKILL.md`.

#### Scenario: data-model rule retains drupal when condition
- **WHEN** `data-model/rules/drupal-data-model.md` is read
- **THEN** it SHALL declare `when: backend: drupal` in its front-matter

#### Scenario: components task retains sdc when condition
- **WHEN** `components/tasks/create-component.md` is read
- **THEN** it SHALL declare `when: frameworks.component: sdc` in its front-matter

#### Scenario: root SKILL.md has no when condition
- **WHEN** `designbook-drupal/SKILL.md` is read
- **THEN** it SHALL NOT declare any `when:` condition in its front-matter

### Requirement: Root SKILL.md is index-only
The root `SKILL.md` SHALL conform to the `skill-md-index` spec: frontmatter with `name: designbook-drupal` and `description`, a brief overview paragraph, and one index section per sub-directory listing files with brief descriptions. It SHALL contain no execution instructions, procedural steps, or skill-loading directives.

#### Scenario: SKILL.md passes index-only check
- **WHEN** `designbook-drupal/SKILL.md` is reviewed against the skill-md-index spec
- **THEN** it SHALL contain only: frontmatter, overview, and index links to sub-directory files
- **AND** it SHALL NOT contain CLI commands, step-by-step procedures, or directives to load other skills

#### Scenario: SKILL.md stays under 500 lines
- **WHEN** the line count of `designbook-drupal/SKILL.md` is measured
- **THEN** it SHALL be under 500 lines (target ~60 lines for a four-section index)
