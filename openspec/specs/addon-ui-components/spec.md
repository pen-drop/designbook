# addon-ui-components Specification

## Purpose
Defines the Debo React component library used in the Storybook addon's display layer. All components use `debo:` prefixed Tailwind CSS classes for CSS isolation.

---

## Requirement: CSS isolation via debo: prefix

All `Debo*` components SHALL use `debo:` prefixed Tailwind classes exclusively. The CSS entry point uses `@import "tailwindcss" prefix(debo)`. No unprefixed Tailwind classes in component source.

### Scenario: Dark mode support
- **WHEN** dark theme is active
- **THEN** all `Debo*` components use `debo:dark:` variant classes — all UI elements remain readable

---

## Requirement: Component catalog

### DeboCard
Location: `packages/storybook-addon-designbook/src/components/ui/DeboCard.jsx`

Displays an entity bundle as a structured card with title, type badge, description, and metadata tags.

Props: `title` (required), `badge`, `description`, `entityPath`, `fieldCount`, `className`, `children`

Styling: `debo:bg-white debo:rounded-lg debo:shadow-sm debo:p-5` — all classes `debo:` prefixed. Under 50 lines, no data fetching.

### DeboCollapsible
Location: `packages/storybook-addon-designbook/src/components/ui/DeboCollapsible.jsx`

Expandable section with title, optional count badge, and chevron toggle. Collapsed by default; `defaultOpen` prop overrides.

### DeboSection
Location: `packages/storybook-addon-designbook/src/components/DeboSection.jsx`

Combines data loading, empty state, content rendering, reload button, and AI command reference into a single page section wrapper.

Props: `dataPath`, `parser`, `renderContent`, `command`, `emptyMessage`

Loads data via `GET /__designbook/load?path=<path>`. Shows `DeboEmptyState` on 404.

### DeboEmptyState
Displays empty state with AI command reference and instructions. Props: `message`, `command`, `filePath`.

### DeboNumberedList
Ordered list of items with numbered indicators, titles, and descriptions.

### DeboSceneCard
Location: `packages/storybook-addon-designbook/src/components/ui/DeboSceneCard.jsx`

Card with circular letter icon (first char of scene name), scene title, optional modified date. Uses `data-theme` for DaisyUI theme, letter circle uses `bg-primary` / `text-primary-content`.

### DeboSceneGrid
Display component. Accepts parsed scenes.yml data, renders each scene as a `DeboSceneCard` in a responsive grid (1 col on small, 2-3 on wider).

### DesignTokensCard
Location: `packages/storybook-addon-designbook/src/components/display/DeboDesignTokens.jsx`

Displays color swatches (primary/secondary/neutral, 3-shade each) and typography (heading/body/mono fonts) in collapsible sections. Handles partial data gracefully.

### ShellSpecCard
Displays application shell spec (overview, navigation, layout pattern, responsive) using `DeboCard` + `DeboCollapsible` sections.

### DeboDataModelCard
Displays data model entities grouped by entity type using `DeboCard` + `DeboCollapsible`. Read-only indicator. Renders nothing when no data.

### ProductOverviewCard
Displays product vision (name, description, problems/solutions, key features) using `DeboCard` + `DeboCollapsible`. ~30 lines after refactoring from inline card.

### DeboDesignGuidelines
Location: `packages/storybook-addon-designbook/src/components/display/DeboDesignGuidelines.jsx`

Renders guidelines.yml data: references (clickable links), design file, principles, component patterns, naming conventions, MCP, skills. Uses `styled` from `storybook/theming` — no Tailwind.

---

## Requirement: useDesignbookData hook

`useDesignbookData(path, parser)` encapsulates fetch/parse/reload for loading from `designbook/`.

Returns `{ data, loading, error, reload }`. Fetches on mount. Reload refetches and reparses.

---

## Requirement: Export structure

- UI components exported from `components/ui/index.js`
- Display components from `components/display/index.js`
- All re-exported from `components/index.js`

---

## Requirement: DeboSectionPage Design step uses DeboSceneGrid

The Design step in `DeboSectionPage` SHALL use `DeboSceneGrid` instead of `DeboSampleData`. Parser returns `null` for empty/missing `scenes` array (so `DeboSection` shows empty state).
