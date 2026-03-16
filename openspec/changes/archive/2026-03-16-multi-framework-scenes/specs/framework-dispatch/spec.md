# Framework Dispatch

> Config-driven builder resolution for multi-framework scene rendering.

## Requirement: Builder resolution from config

The vite plugin SHALL resolve the `ModuleBuilder` and `SceneNodeRenderer[]` based on `frameworks.component` in `designbook.config.yml`.

#### Scenario: React framework configured
- **GIVEN** `designbook.config.yml` contains `frameworks.component: react`
- **WHEN** the vite plugin initializes
- **THEN** it SHALL use `reactModuleBuilder` and `reactRenderers`

#### Scenario: Vue framework configured
- **GIVEN** `designbook.config.yml` contains `frameworks.component: vue`
- **WHEN** the vite plugin initializes
- **THEN** it SHALL use `vueModuleBuilder` and `vueRenderers`

#### Scenario: SDC framework configured (or default)
- **GIVEN** `designbook.config.yml` contains `frameworks.component: sdc` or no `frameworks.component`
- **WHEN** the vite plugin initializes
- **THEN** it SHALL use `sdcModuleBuilder` and `sdcRenderers`

## Requirement: Dynamic import for builders

Builder modules SHALL be loaded via dynamic `import()` so unused framework builders are not bundled.

#### Scenario: React project does not bundle SDC code
- **GIVEN** `frameworks.component: react`
- **WHEN** the addon is built
- **THEN** `builders/sdc/` code SHALL NOT be included in the bundle

## Requirement: Framework guard on drupal.theme

The `drupal.theme` config key SHALL only be required when `frameworks.component` is `sdc`.

#### Scenario: React project without drupal.theme
- **GIVEN** `frameworks.component: react` and no `drupal.theme` key
- **WHEN** the addon loads config
- **THEN** it SHALL NOT error or warn about missing `drupal.theme`

#### Scenario: SDC project without drupal.theme
- **GIVEN** `frameworks.component: sdc` and no `drupal.theme` key
- **WHEN** the CLI runs `validate component`
- **THEN** it SHALL error with a message indicating `drupal.theme` is required for SDC

## Requirement: Framework guard on vitest plugins

The SDC-specific vitest plugin (`sdcDedupPlugin`) SHALL only be loaded when `frameworks.component` is `sdc`.

#### Scenario: React project skips SDC dedup
- **GIVEN** `frameworks.component: react`
- **WHEN** vitest plugins are resolved
- **THEN** `sdcDedupPlugin` SHALL NOT be included

## Requirement: Framework-aware .storybook directory

The preset SHALL resolve the `.storybook` config directory based on framework:
- SDC: derived from `drupal.theme` path
- React/Vue: project root (where `designbook.config.yml` lives)

#### Scenario: React project .storybook resolution
- **GIVEN** `frameworks.component: react` and config at `/project/designbook.config.yml`
- **WHEN** the preset resolves the storybook config directory
- **THEN** it SHALL use `/project/.storybook/`
