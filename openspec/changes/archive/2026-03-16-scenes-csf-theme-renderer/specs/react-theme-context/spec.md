## ADDED Requirements

### Requirement: Global preview decorator provides ThemeProvider
The addon's `preview.ts` SHALL register a global decorator that wraps every story with `ThemeProvider` from `storybook/theming`. The decorator SHALL read the active theme preference from `useGlobals()` and select the matching Storybook base theme (`themes.light` or `themes.dark`). The project's Debo design tokens SHALL be merged on top of the base theme.

#### Scenario: Active theme is light
- **WHEN** `globals.theme` is `'light'` (or absent)
- **THEN** the decorator provides `ThemeProvider` with `{ ...themes.light, ...deboTokens }`
- **AND** `useTheme()` inside any `Debo*` component returns the merged object

#### Scenario: Active theme is dark
- **WHEN** `globals.theme` is `'dark'`
- **THEN** the decorator provides `ThemeProvider` with `{ ...themes.dark, ...deboTokens }`

#### Scenario: Decorator wraps all stories
- **WHEN** any story renders — including `pages/*.stories.jsx` and `*.scenes.yml` stories
- **THEN** the `ThemeProvider` is present as an ancestor in the React tree
- **AND** `useTheme()` returns the merged theme without any per-story setup

### Requirement: mountReact renders without ThemeProvider
`mountReact` SHALL render the component directly via `ReactDOM.createRoot`, with no `ThemeProvider` or `themes` import. Theme is provided by the global decorator.

#### Scenario: mountReact renders component into DOM element
- **WHEN** `mountReact(Component, props)` is called
- **THEN** it creates a DOM element, mounts `Component` with `props`, and returns the element
- **AND** no `ThemeProvider` wraps the component inside `mountReact`

#### Scenario: Theme is still available inside mounted component
- **WHEN** a component mounted via `mountReact` calls `useTheme()`
- **THEN** it receives the merged theme from the ancestor `ThemeProvider` provided by the global decorator
