## ADDED Requirements

### Requirement: Components SHALL use theme properties instead of hardcoded hex colors
All addon components in `packages/storybook-addon-designbook/src/components/` SHALL reference Storybook theme properties (`theme.color.*`, `theme.background.*`, `theme.appBorderColor`, etc.) for colors, backgrounds, and borders instead of hardcoded hex values.

#### Scenario: Text colors use theme tokens
- **WHEN** a component renders text
- **THEN** it SHALL use `theme.color.defaultText` for primary text, `theme.color.mediumdark` for secondary text, and `theme.color.medium` for muted/placeholder text

#### Scenario: Background colors use theme tokens
- **WHEN** a component renders a background
- **THEN** it SHALL use `theme.background.content` for content areas, `theme.background.hoverable` for subtle/hover backgrounds, and `theme.background.app` for app-level backgrounds

#### Scenario: Border colors use theme tokens
- **WHEN** a component renders borders or dividers
- **THEN** it SHALL use `theme.appBorderColor` or `theme.color.lighter` instead of hardcoded hex border colors

### Requirement: Status colors SHALL adapt to light and dark mode
Semantic status colors (success, error, warning) SHALL remain visually distinct and readable in both light and dark modes.

#### Scenario: Status colors in light mode
- **WHEN** `theme.base` is `'light'`
- **THEN** success SHALL render as green, error as red, and warning as amber with values appropriate for light backgrounds

#### Scenario: Status colors in dark mode
- **WHEN** `theme.base` is `'dark'`
- **THEN** success, error, and warning colors SHALL use lighter variants that are readable on dark backgrounds

### Requirement: Components SHALL render correctly in both light and dark Storybook themes
All converted components SHALL produce readable, visually consistent output in both Storybook's light and dark themes.

#### Scenario: Dark mode rendering
- **WHEN** the Storybook theme is set to dark
- **THEN** all addon components (panels, pages, UI elements) SHALL render with appropriate dark-mode colors derived from the theme object

#### Scenario: Light mode rendering
- **WHEN** the Storybook theme is set to light
- **THEN** all addon components SHALL render identically to their current appearance (no visual regression)
