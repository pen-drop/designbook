## MODIFIED Requirements

### Requirement: Scenes indexer handles only files with scene content
The `experimental_indexers` export in `preset.ts` SHALL NOT contain a branch that checks for a `page` field and emits special index entries. The indexer SHALL only process `.scenes.yml` files that represent user section or shell content (files matched by `matchHandler`). Addon-internal pages are indexed natively by Storybook because they are now real CSF files.

#### Scenario: Indexer skips non-scene files
- **WHEN** the scenes indexer encounters a `.scenes.yml` file with no `scenes` array and no matching handler
- **THEN** it returns an empty array `[]`

#### Scenario: Indexer processes section scenes normally
- **WHEN** the scenes indexer encounters a `.section.scenes.yml` file with a `scenes` array
- **THEN** it returns docs + story index entries for each scene

#### Scenario: Page-field files are not indexed by custom indexer
- **WHEN** a `.scenes.yml` file with a `page` field is passed to the custom indexer (should not happen after deletion, but for robustness)
- **THEN** no index entries are emitted for it by the custom indexer (Storybook handles the `.stories.jsx` replacement natively)
