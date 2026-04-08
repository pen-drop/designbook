# addon-ui-components Specification

## Purpose
Debo React component library for the Storybook addon display layer. Manager-side components use `styled()` from `storybook/theming`. No Tailwind CSS.

## Requirements

### Requirement: CSS isolation via styled() theming
All `Debo*` manager components use `styled()` from `storybook/theming`, accessing theme tokens for colors/fonts/borders. Lightweight cases use inline styles. Dark mode supported via theme tokens (`theme.color.defaultText`, `theme.background.content`, etc.).

### Requirement: Component catalog

| Component | Location | Description |
|-----------|----------|-------------|
| **DeboCard** | `components/ui/DeboCard.jsx` | Entity card with title, badge (`DeboBadge`), description, metadata tags. Styled via `styled()`: `border-radius: 14px`, `padding: 20px`, shadow, theme bg/border. Title: `18px bold`, description: `15px/1.625`. |
| **DeboCollapsible** | `components/ui/DeboCollapsible.jsx` | `<details>`/`<summary>` with React state. Variants: `card` (default), `action-summary`, `action-item`, `action-inline`. Supports `status` and `progress` props. |
| **DeboSection** | `components/DeboSection.jsx` | Data loading + empty/error/content states + reload + command reference. Props: `dataPath`, `parser`, `renderContent`, `command`, `emptyMessage`, `title`, `filePath`, `bare`. Uses `useDesignbookData`. Shows `DeboEmptyState` (404), `DeboLoading`, `DeboAlert` (error). Non-bare wraps in `DeboPageLayout` with `DeboSourceFooter`. |
| **DeboEmptyState** | | Empty state with AI command reference. Props: `message`, `command`, `filePath`. |
| **DeboNumberedList** | | Ordered list with numbered indicators, titles, descriptions. |
| **DeboSceneCard** | `components/ui/DeboSceneCard.jsx` | Letter icon (first char, blue square 40px), title, optional date. `borderRadius: 14px`. Clickable via `DeboLink` when `storyId`/`storyTitle` present. |
| **DeboSceneGrid** | `components/display/DeboSceneGrid.jsx` | Renders scenes as `DeboSceneCard` in `DeboGrid` (`variant="auto"`, `gap="sm"`, `minWidth={220}`). |
| **DeboDesignTokens** | `components/display/DeboDesignTokens.jsx` | Color swatches + typography in collapsible sections. Exports `resolveTokenReferences`. |
| **DeboDataModel** | `components/display/DeboDataModel.jsx` | Entity display with selection. Props: `data`, `selectedEntity`, `onSelectEntity`. |
| **DeboProductOverview** | `components/display/DeboProductOverview.jsx` | Wraps `DeboSection`, loads `vision.md`, parses into `DeboCollapsible`+`DeboProse` sections. First open by default. |
| **DeboDesignGuidelines** | `components/display/DeboDesignGuidelines.jsx` | Renders guidelines.yml: references, principles, patterns, naming conventions, MCP card, auto-load skills. `styled()` only. |

### Requirement: useDesignbookData hook
`useDesignbookData(path, parser)` returns `{ data, loading, error, reload }`. Fetches via `GET /__designbook/load?path=<path>`. Reacts to file-change channel events for auto-refresh.

### Requirement: Export structure
- `components/ui/index.js` -- UI components
- `components/display/index.js` -- display components
- `components/pages/index.js` -- page components
- `components/index.js` -- re-exports all above + `DeboSection` + `useDesignbookData`

### Requirement: DeboSectionPage Design tab
Uses `DeboSceneGrid` for scene data. Parser returns `null` for empty/missing `scenes` array.
