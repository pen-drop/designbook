## MODIFIED Requirements

### Requirement: Vite plugin load hook handles only scene files
The `load()` hook in `designbookLoadPlugin` SHALL process `.scenes.yml` files that contain scenes (user content). It SHALL NOT contain any branch that checks for a `page` field or calls `buildPageModule()`. The function `buildPageModule()` and all helpers used exclusively by it (`extractPageType`, `capitalize`, `buildDocsPage`, `injectDocsPage`, `buildDocsOnlyModule`, `DocsPageCode` interface) SHALL be removed from `vite-plugin.ts`.

#### Scenario: Scene file with scenes is loaded normally
- **WHEN** the vite plugin `load()` hook receives a `.scenes.yml` path that contains a `scenes` array
- **THEN** it delegates to `loadSceneModule()` and returns the generated CSF module

#### Scenario: Page-field YAML files no longer intercepted
- **WHEN** a `.scenes.yml` file containing only a `page` field is passed to the `load()` hook
- **THEN** the hook does NOT call `buildPageModule()` (the function no longer exists)

#### Scenario: Non-matching files return undefined
- **WHEN** the `load()` hook receives a file path that does not match any scene handler
- **THEN** it returns `undefined` so Vite continues with its default resolution
