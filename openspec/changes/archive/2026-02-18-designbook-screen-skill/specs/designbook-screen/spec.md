## ADDED Requirements

### Requirement: Screen Component Directory Convention

The skill SHALL place screen components under `$DESIGNBOOK_DIST/design/sections/[section-id]/[page-name]/`. Component files use uniquely prefixed names: `section_[sectionid]_[pagename]`.

#### Scenario: News article list screen
- **WHEN** the skill generates a screen for section "news", page "article-list"
- **THEN** the files are created at `$DESIGNBOOK_DIST/design/sections/news/article-list/section_news_article_list.component.yml`, `section_news_article_list.story.yml`, and `section_news_article_list.twig`

#### Scenario: Multiple pages per section
- **WHEN** section "news" has pages "article-list" and "article-detail"
- **THEN** two screen components are created: `section_news_article_list` and `section_news_article_detail`

---

### Requirement: Screen Components Are Structural Only

Screen component Twig templates SHALL NOT contain HTML markup. They SHALL only render three slot references: `header`, `content`, and `footer`.

#### Scenario: Screen Twig is structural
- **WHEN** the skill generates `section_news_article_list.twig`
- **THEN** the template contains only `{{ header }}{{ content }}{{ footer }}` with no HTML elements or CSS classes

---

### Requirement: Screen Components Compose Shell + Entity

Screen component stories SHALL populate the `header` slot with the `shell_header` design component, the `footer` slot with the `shell_footer` design component, and the `content` slot with the appropriate entity design component.

#### Scenario: Screen story composes components
- **WHEN** the skill generates the story for `section_news_article_list`
- **THEN** the story has:
  - `header` slot → `designbook_design:shell_header` component reference
  - `content` slot → `designbook_design:entity_node_article` component reference with view mode story
  - `footer` slot → `designbook_design:shell_footer` component reference

---

### Requirement: Parse Screen Designs

The skill SHALL read `$DESIGNBOOK_DIST/sections/[section-id]/screen-designs.md` to extract the page definitions for a section. Each page maps to a section-id + page-name + entity type + view mode.

#### Scenario: Screen design parsed for pages
- **WHEN** `screen-designs.md` for section "news" describes two pages: "Article List" and "Article Detail"
- **THEN** the skill extracts: `news/article-list → node/article (teaser)` and `news/article-detail → node/article (full)`

#### Scenario: Missing screen designs
- **WHEN** `screen-designs.md` does not exist for a section
- **THEN** the skill SHALL report an error and stop, listing `screen-designs.md` as a prerequisite

---

### Requirement: Section Selection

The skill SHALL accept an optional `section-id` parameter. If provided, only that section's screens are generated. If omitted, screens for all sections are generated.

#### Scenario: Generate single section
- **WHEN** the skill is invoked with `section-id: news`
- **THEN** only screen components for section "news" are generated

#### Scenario: Generate all sections
- **WHEN** the skill is invoked without `section-id`
- **THEN** screen components for all sections with `screen-designs.md` are generated

---

### Requirement: Prerequisite Check

The skill SHALL verify that required design components exist before generating screens. Specifically, it SHALL check that `shell_header` and `shell_footer` exist, and that the entity components referenced by screen-designs.md exist.

#### Scenario: Missing shell components
- **WHEN** `$DESIGNBOOK_DIST/design/shell/header/shell_header.component.yml` does not exist
- **THEN** the skill SHALL report an error: "Shell components not found. Run `designbook-shell` first."

#### Scenario: Missing entity components
- **WHEN** `screen-designs.md` references `node/article` but `entity_node_article` does not exist
- **THEN** the skill SHALL report an error: "Entity component `entity_node_article` not found. Run `designbook-entity` first."

---

### Requirement: Delegation to designbook-drupal-components

The skill SHALL delegate actual SDC file creation to `designbook-drupal-components`, passing the output directory as `$DESIGNBOOK_DIST/design/sections/[section-id]/[page-name]/` and the component name as `section_[sectionid]_[pagename]`.

#### Scenario: Screen files created via delegation
- **WHEN** the skill generates the screen for section "news", page "article-list"
- **THEN** it invokes `designbook-drupal-components` with `outputDir` set to `$DESIGNBOOK_DIST/design/sections/news/article-list/` and component name `section_news_article_list`
