## ADDED Requirements

### Requirement: Section-scoped data storage
The storage system SHALL partition test data by section ID. Each section's `data.json` SHALL be loaded under its section key, resulting in a store shaped `store[sectionId][entityType][bundle][]`.

#### Scenario: Two sections with the same entity type
- **WHEN** section "blog" has `data.json` with `{ "node": { "article": [{ "title": "Blog Post" }] } }` AND section "news" has `data.json` with `{ "node": { "article": [{ "title": "News Item" }] } }`
- **THEN** `store` SHALL contain `store.blog.node.article[0].title === "Blog Post"` AND `store.news.node.article[0].title === "News Item"`

#### Scenario: Single section loaded
- **WHEN** only section "blog" has a `data.json`
- **THEN** `store.blog` SHALL contain the parsed data AND no other section keys SHALL exist

### Requirement: Global section context from screen components
The Vite plugin `load()` hook SHALL set `globalThis.__designbook_section` when loading a `.component.yml` that contains `designbook.section` metadata.

#### Scenario: Screen component with section metadata
- **WHEN** the Vite plugin loads `section-blog-blog-detail.component.yml` containing `designbook: { section: blog }`
- **THEN** `globalThis.__designbook_section` SHALL be set to `"blog"`

#### Scenario: Non-screen component without section metadata
- **WHEN** the Vite plugin loads a `.component.yml` without `designbook.section`
- **THEN** `globalThis.__designbook_section` SHALL NOT be modified

### Requirement: Build-time field-to-path expansion
The Vite plugin SHALL rewrite `{type: ref, field: X}` nodes in entity `.story.yml` files to `{type: ref, path: <entityType>.<bundle>.[<record>.]X}` using the entity metadata from the sibling `.component.yml`.

#### Scenario: Entity with explicit record
- **WHEN** `entity-node-article.component.yml` has `designbook.entity: { type: node, bundle: article, record: 0 }` AND the story contains `{ type: ref, field: title }`
- **THEN** the Vite plugin SHALL rewrite it to `{ type: ref, path: node.article.0.title }`

#### Scenario: Entity without record (default)
- **WHEN** `entity-node-article.component.yml` has `designbook.entity: { type: node, bundle: article }` (no record) AND the story contains `{ type: ref, field: title }`
- **THEN** the Vite plugin SHALL rewrite it to `{ type: ref, path: node.article.title }`

#### Scenario: Nested field path
- **WHEN** the entity metadata is `{ type: node, bundle: article }` AND the story contains `{ type: ref, field: field_media.url }`
- **THEN** the Vite plugin SHALL rewrite it to `{ type: ref, path: node.article.field_media.url }`

#### Scenario: Non-entity component story is untouched
- **WHEN** a `.story.yml` belongs to a component WITHOUT `designbook.entity` metadata
- **THEN** the Vite plugin SHALL NOT modify the story content

### Requirement: Path references use existing path syntax
The Vite plugin SHALL NOT modify `{type: ref, path: X}` nodes — they are already fully qualified and SHALL be passed through unchanged.

#### Scenario: Explicit path reference in entity story
- **WHEN** the story contains `{ type: ref, path: block_content.contact_person.0.field_name }`
- **THEN** the Vite plugin SHALL NOT modify this node

### Requirement: Runtime path resolution with section scoping
`resolvePath()` SHALL read `globalThis.__designbook_section` and resolve paths against `store[section]`.

#### Scenario: Path resolution with active section
- **WHEN** `__designbook_section` is `"blog"` AND `resolvePath("node.article.0.title")` is called
- **THEN** it SHALL return `store.blog.node.article[0].title`

#### Scenario: No active section
- **WHEN** `__designbook_section` is not set AND `resolvePath("node.article.0.title")` is called
- **THEN** it SHALL return `undefined` AND log a warning

### Requirement: Random record selection for arrays
When `resolvePath()` encounters an array and the next path segment is NOT a numeric index, it SHALL pick a random element from the array.

#### Scenario: Path without record index hits an array
- **WHEN** `store.blog.node.article` is `[{title: "A"}, {title: "B"}, {title: "C"}]` AND `resolvePath("node.article.title")` is called
- **THEN** it SHALL return the `title` of a randomly selected element from the array

#### Scenario: Path with explicit record index
- **WHEN** `store.blog.node.article` is `[{title: "A"}, {title: "B"}]` AND `resolvePath("node.article.1.title")` is called
- **THEN** it SHALL return `"B"` (index 1, deterministic)

### Requirement: Remove entity context global
The system SHALL NOT use `globalThis.__designbook_entity_context`. The functions `setContext()`, `getContext()`, and `resolveField()` SHALL be removed from `designbookStorage.js`.

#### Scenario: Entity context functions removed
- **WHEN** `designbookStorage.js` is loaded
- **THEN** it SHALL NOT export `setContext`, `getContext`, or `resolveField`

### Requirement: refRenderer handles only path references
The `refStoryNodeRenderer` SHALL only handle `{type: ref, path: X}` nodes. It SHALL NOT check for `field:` since those are already expanded at build time.

#### Scenario: Ref with path
- **WHEN** the renderer receives `{ type: ref, path: "node.article.0.title" }`
- **THEN** it SHALL call `resolvePath("node.article.0.title")` and return the JSON-stringified result

#### Scenario: Ref with missing value
- **WHEN** `resolvePath()` returns `undefined`
- **THEN** the renderer SHALL return `"[missing: <path>]"` and log a warning
