## ADDED Requirements

### Requirement: Scene metadata extraction

The system SHALL provide a shared module (`scene-metadata.ts`) that extracts scene metadata from parsed YAML objects.

#### Scenario: Extract group name from scenes file
- **WHEN** a parsed YAML object has `name: "Designbook/Sections/Blog"`
- **THEN** `extractGroup(parsed, 'blog')` returns `"Designbook/Sections/Blog"`

#### Scenario: Fallback to file base name
- **WHEN** a parsed YAML object has no `name` property
- **THEN** `extractGroup(parsed, 'blog')` returns `"blog"`

#### Scenario: Build export name from scene name
- **WHEN** scene name is `"Ratgeber Detail"`
- **THEN** `buildExportName("Ratgeber Detail")` returns `"RatgeberDetail"`

#### Scenario: Build export name with hyphens
- **WHEN** scene name is `"pet-discovery-listing"`
- **THEN** `buildExportName("pet-discovery-listing")` returns `"PetDiscoveryListing"`

#### Scenario: Extract scenes array from new format
- **WHEN** parsed YAML has `scenes: [{ name: "A" }, { name: "B" }]`
- **THEN** `extractScenes(parsed)` returns the array `[{ name: "A" }, { name: "B" }]`

#### Scenario: Extract scenes from legacy flat format
- **WHEN** parsed YAML has no `scenes` key but has `name` and `layout`
- **THEN** `extractScenes(parsed)` returns `[parsed]`

### Requirement: Shared usage by indexer and loader

Both `preset.ts` (indexer) and `vite-plugin.ts` (loader) SHALL use `scene-metadata.ts` for group name derivation, export name generation, and scenes array extraction.

#### Scenario: Indexer uses shared metadata
- **WHEN** the Storybook indexer processes a `*.scenes.yml` file
- **THEN** it calls `extractGroup` and `buildExportName` from `scene-metadata.ts`
- **AND** produces identical results to the current inline logic

#### Scenario: Loader uses shared metadata
- **WHEN** the Vite plugin loads a `*.scenes.yml` file
- **THEN** it calls `extractGroup` and `buildExportName` from `scene-metadata.ts`
- **AND** produces identical results to the current inline logic
