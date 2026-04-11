## ADDED Requirements

### Requirement: Stories SHALL have access to Storybook theme via useTheme()
The preview decorator chain SHALL wrap all story output in a `<ThemeProvider>` from `storybook/theming`, providing the active Storybook theme (light or dark) as React context. This enables any React component rendered within a story to call `useTheme()` and receive the current theme object.

#### Scenario: React story accesses theme via useTheme()
- **WHEN** a React story renders a component that calls `useTheme()` from `storybook/theming`
- **THEN** the hook SHALL return the active Storybook theme object (light or dark based on the current global setting)

#### Scenario: Theme updates when global theme changes
- **WHEN** the user switches the Storybook theme global from light to dark (or vice versa)
- **THEN** the ThemeProvider SHALL provide the updated theme on the next story render

#### Scenario: Addon-owned pages continue to work
- **WHEN** an addon-owned page (Foundation, Design System, Sections) renders via `mountReact()`
- **THEN** the page SHALL still receive the correct theme (the nested ThemeProvider from mountReact is harmless)
