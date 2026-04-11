## Why

All Debo components that use `styled()` already reference `theme.*` properties for colors, fonts, and backgrounds. However, 232 hardcoded hex color values remain across 26 component files — mostly in inline styles and style objects. These components render with light-mode colors regardless of the active Storybook theme, breaking the dark mode experience in both panels and story pages.

## What Changes

- Replace hardcoded hex color values with Storybook theme properties (`theme.color.*`, `theme.background.*`, `theme.barBg`, etc.) across all addon components
- Components using inline styles with hex values will be converted to `styled()` components or will access theme via `useTheme()`
- Semantic color mappings will be established where no direct theme property exists (e.g., status colors like success green, error red)

### Affected areas (by file count / hex occurrences)

- **Panels**: WorkflowPanel (37), EntityPanel (15) — biggest impact
- **UI components**: DeboFileViewer (17), DeboFacetFilter (12), DeboBadge (10), DeboSourceFooter (9), DeboActionList (7), DeboCollapsible (6), and 8 more
- **Display components**: DeboDesignTokens (33)
- **Other**: MappingDetail (20), VisualCompareTool (11), CompositionTree (4), manager-utils (7)

## Capabilities

### New Capabilities
- `theme-aware-components`: All addon components use Storybook theme properties instead of hardcoded hex colors, enabling consistent light/dark mode rendering

### Modified Capabilities

## Impact

- `packages/storybook-addon-designbook/src/components/` — 26 files modified
- Visual appearance changes in dark mode (components will now correctly adapt)
- No API or behavioral changes — purely visual theming
- Depends on `story-theme-provider` change for preview ThemeProvider
