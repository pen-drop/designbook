## MODIFIED Requirements

### Requirement: Scene handler interface
The `SceneHandler` interface in `src/renderer/scene-handlers.ts` SHALL define a pattern-to-type mapping for scene files. The interface SHALL NOT include docs-generation fields.

#### Scenario: Handler matches by file suffix
- **WHEN** `matchHandler('section-blog.listing.scenes.yml', handlers)` is called
- **THEN** it returns the handler whose `pattern` matches `.scenes.yml`

#### Scenario: No docs fields on handler
- **WHEN** the `SceneHandler` interface is inspected
- **THEN** it does NOT have `docsWhenPrefix` or `docsComponent` properties
- **AND** the handler `type` field only accepts `'canvas'`

#### Scenario: Default registry has no docs configuration
- **WHEN** `defaultHandlers` is imported
- **THEN** the single entry has `{ pattern: '.scenes.yml', type: 'canvas' }`
- **AND** no `docsWhenPrefix` or `docsComponent` keys are present

## REMOVED Requirements

### Requirement: Docs page generation on prefix match
**Reason**: Docs page generation from file prefixes couples the loader to Storybook's docs infrastructure and prevents builder-independent rendering. Canvas-only output is the new standard.
**Migration**: Remove `docsWhenPrefix` and `docsComponent` from any custom handler entries in project configuration. To document a scene group, create an MDX file alongside the scenes file.
