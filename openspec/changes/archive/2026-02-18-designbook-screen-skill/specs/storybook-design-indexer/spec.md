## ADDED Requirements

### Requirement: Design Component Story Glob

The Storybook addon SHALL include a glob that discovers `.component.yml` files inside `$DESIGNBOOK_DIST/design/` recursively, in addition to the existing `sections/*.section.yml` glob.

#### Scenario: Design components discovered by Storybook
- **WHEN** Storybook starts and `$DESIGNBOOK_DIST/design/` contains `.component.yml` files
- **THEN** those files are included in the stories list alongside section files and onboarding MDX

#### Scenario: No design components exist
- **WHEN** `$DESIGNBOOK_DIST/design/` directory does not exist or contains no `.component.yml` files
- **THEN** Storybook starts normally without errors, showing only existing sections

---

### Requirement: Design Component Indexer

The addon SHALL provide an indexer for `.component.yml` files located under the `design/` directory. This indexer creates Storybook story index entries with sidebar titles derived from the directory structure.

The indexer SHALL NOT match `.component.yml` files in other locations (e.g., `$DESIGNBOOK_DRUPAL_THEME/components/`).

#### Scenario: Shell component mapped to sidebar
- **WHEN** `design/shell/header/shell_header.component.yml` is indexed
- **THEN** it appears in the Storybook sidebar under `Design/Shell/Header`

#### Scenario: Entity component mapped to sidebar
- **WHEN** `design/entity/node/article/entity_node_article.component.yml` is indexed
- **THEN** it appears in the Storybook sidebar under `Design/Entity/Node/Article`

#### Scenario: Block component mapped to sidebar
- **WHEN** `design/entity/block/hero/entity_block_hero.component.yml` is indexed
- **THEN** it appears in the Storybook sidebar under `Design/Entity/Block/Hero`

#### Scenario: Section screen component mapped to sidebar
- **WHEN** `design/sections/news/article-list/section_news_article_list.component.yml` is indexed
- **THEN** it appears in the Storybook sidebar under `Sections/News/Article List` (nested under the existing section entry)

#### Scenario: Multiple pages per section in sidebar
- **WHEN** section `news` has pages `article-list` and `article-detail`
- **THEN** Storybook shows `Sections/News/Article List` and `Sections/News/Article Detail`

---

### Requirement: Directory-to-Title Mapping

The indexer SHALL derive the Storybook sidebar title from the directory path by:
1. Taking the path relative to `$DESIGNBOOK_DIST/`
2. Removing the filename
3. Capitalizing each directory segment
4. Joining with `/` as separator

The `design/` prefix SHALL be replaced with `Design/` in the title.

Exception: Components in `design/sections/` SHALL use `Sections/` prefix to group them with existing section entries.

#### Scenario: Path to title conversion
- **WHEN** file is at `design/entity/node/article/entity_node_article.component.yml` relative to `$DESIGNBOOK_DIST/`
- **THEN** the Storybook title is `Design/Entity/Node/Article`

#### Scenario: Sections prefix override
- **WHEN** file is at `design/sections/news/article-list/section_news_article_list.component.yml` relative to `$DESIGNBOOK_DIST/`
- **THEN** the Storybook title is `Sections/News/Article List` (not `Design/Sections/News/Article List`)

---

### Requirement: Design Component CSF Module Generation

The Vite plugin SHALL transform `.component.yml` files from `design/` directories into CSF (Component Story Format) modules. It SHALL read the companion `.story.yml` file alongside the `.component.yml` to generate story entries.

#### Scenario: CSF module with story variants
- **WHEN** `design/entity/node/article/entity_node_article.component.yml` is loaded by Vite
- **AND** `entity_node_article.story.yml` exists alongside with story variants `full` and `teaser`
- **THEN** the Vite plugin generates a CSF module with exports for each story variant

#### Scenario: Missing story file
- **WHEN** a `.component.yml` exists under `design/` but no `.story.yml` companion exists
- **THEN** the Vite plugin generates a CSF module with a single default story
