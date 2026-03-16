## ADDED Requirements

### Requirement: Scenes loader produces only canvas CSF entries
All `*.scenes.yml` files SHALL produce only canvas-type CSF story entries. No file pattern prefix SHALL trigger automatic docs page generation.

#### Scenario: spec.* file produces canvas stories only
- **WHEN** the Vite plugin loads a file named `spec.blog.scenes.yml`
- **THEN** the output CSF module contains only named story exports (canvas entries)
- **AND** the module does NOT contain a docs page entry (`parameters.docs.page` or `__namedExportsOrder` with a docs entry)

#### Scenario: Regular scenes file produces canvas stories only
- **WHEN** the Vite plugin loads a file named `section-blog.listing.scenes.yml`
- **THEN** the output CSF module contains only named story exports
- **AND** no docs-related exports or parameters are injected

#### Scenario: Indexer emits canvas entries for all scene files
- **WHEN** the Storybook indexer encounters any `*.scenes.yml` file
- **THEN** it emits only `type: 'story'` index entries (one per scene)
- **AND** it does NOT emit any `type: 'docs'` index entries for any file
