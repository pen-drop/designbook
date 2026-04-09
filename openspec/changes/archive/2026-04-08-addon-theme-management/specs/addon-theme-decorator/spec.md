## ADDED Requirements

### Requirement: Addon exposes available themes via virtual module

The addon's Vite plugin SHALL parse `design-tokens.yml` and expose a `virtual:designbook-themes` module containing the list of available themes.

#### Scenario: Design tokens with one theme

- **WHEN** `design-tokens.yml` contains `themes: { dark: { ... } }`
- **THEN** the virtual module exports `themeNames` as `['light', 'dark']`
- **AND** exports `themes` as `{ light: 'light', dark: 'dark' }`
- **AND** exports `defaultTheme` as `'light'`

#### Scenario: Design tokens with multiple themes

- **WHEN** `design-tokens.yml` contains `themes: { dark: { ... }, brand-x: { ... } }`
- **THEN** the virtual module exports `themeNames` as `['light', 'dark', 'brand-x']`

#### Scenario: Design tokens with no themes section

- **WHEN** `design-tokens.yml` has no `themes:` key
- **THEN** the virtual module exports `themeNames` as `['light']`
- **AND** exports `defaultTheme` as `'light'`

#### Scenario: design-tokens.yml changes trigger virtual module invalidation

- **WHEN** `design-tokens.yml` is modified while Storybook is running
- **THEN** the `virtual:designbook-themes` module SHALL be invalidated
- **AND** the updated theme list is available without browser refresh

### Requirement: Addon configures withThemeByDataAttribute from virtual module

The addon's `preview.ts` SHALL import `@storybook/addon-themes` and register `withThemeByDataAttribute` using the theme list from the virtual module. Workspaces SHALL NOT need to configure theme switching themselves.

#### Scenario: Toolbar shows all available themes

- **WHEN** Storybook loads with the designbook addon
- **THEN** the `@storybook/addon-themes` toolbar SHALL display a theme selector with all themes from the virtual module
- **AND** `attributeName` SHALL be `'data-theme'`
- **AND** `defaultTheme` SHALL be `'light'`

#### Scenario: No withThemeByDataAttribute needed in workspace preview.js

- **WHEN** the addon is installed and configured
- **THEN** theme switching SHALL work without any `withThemeByDataAttribute` configuration in the workspace's `preview.js`
- **AND** existing hardcoded `withThemeByDataAttribute` in workspace `preview.js` MAY be removed
