## ADDED Requirements

### Requirement: Scene module invalidation on file change
The Vite plugin SHALL invalidate `.scenes.yml` modules in Vite's module graph when the corresponding file changes, so that the next import triggers a fresh `load()` call.

#### Scenario: Story works after file change without browser refresh
- **WHEN** a `.scenes.yml` file is modified while Storybook is running
- **THEN** clicking the corresponding story in the sidebar renders the updated content without requiring a browser refresh

#### Scenario: New scene file works immediately
- **WHEN** a new `.scenes.yml` file is created while Storybook is running
- **THEN** the story appears in the sidebar and is clickable without error

### Requirement: Virtual sections module invalidation
The Vite plugin SHALL invalidate the `virtual:designbook-sections` module when any `.section.scenes.yml` file is added or changed, causing the sections overview to reflect the current state.

#### Scenario: First section appears in overview
- **WHEN** no `.section.scenes.yml` files exist at server start and the first one is created
- **THEN** the sections overview updates to show the new section without restarting Storybook

#### Scenario: Section metadata update reflected
- **WHEN** a `.section.scenes.yml` file's metadata (title, order) is changed
- **THEN** the sections overview reflects the updated metadata without restart

### Requirement: Clean debug output
The plugin SHALL NOT emit debug `console.log` statements during normal operation. Only warnings and errors SHALL be logged.

#### Scenario: No debug logs on story load
- **WHEN** a `.scenes.yml` file is loaded during normal Storybook operation
- **THEN** no `[Designbook] load()` debug messages appear in the console

#### Scenario: No debug logs on indexing
- **WHEN** the indexer processes `.scenes.yml` files
- **THEN** no `[Designbook] Indexing overview/scene` debug messages appear in the console
