# addon-onboarding-pages Specification

## Purpose
Read-only Storybook pages displaying workflow outputs via `DeboSection`. All data entry via AI commands only. Three page components: `DeboFoundationPage`, `DeboDesignSystemPage`, `DeboSectionPage`.

## Requirements

### Requirement: DeboSection pattern
All pages SHALL use `DeboSection` with `dataPath`, `parser`, `renderContent`, `command`, `emptyMessage`. Internally uses `useDesignbookData(path, parser)`. No inline fetch logic.

States: 404 -> `DeboEmptyState` with AI command | loading -> `DeboLoading` | error -> `DeboAlert` | data -> `DeboSourceFooter` with reload button (refetch without navigation).

### Requirement: Vite middleware
`GET /__designbook/load?path=<path>` serves files from `designbook/` directory. Returns 404 when file not found.

### Requirement: DeboFoundationPage
Renders as `DeboTabs` with two tabs:

| Tab | id | Component | dataPath | Command |
|-----|----|----|----------|---------|
| Vision | `vision` | `DeboProductOverview` | `vision.md` | `/debo vision` |
| Data Model | `data-model` | `DeboDataModel` | `data-model.yml` | `/debo data-model` |

`DeboProductOverview` wraps `DeboSection` internally, parsing vision.md into sections rendered as `DeboCollapsible` with `DeboProse`. Entity selection resets to null on tab switch.

### Requirement: DeboDesignSystemPage
Renders as `DeboTabs` with three tabs (in order):

| Tab | id | Component | dataPath | Command |
|-----|----|----|----------|---------|
| Guidelines | `guidelines` | `DeboDesignGuidelines` | `design-system/guidelines.yml` | `/debo design-guideline` |
| Tokens | `tokens` | `DeboDesignTokens` | `design-system/design-tokens.yml` | `/debo tokens` |
| Shell | `shell` | `DeboSceneGrid` | `design-system/design-system.scenes.yml` | `/debo design-shell` |

Shell tab renders `DeboProse` description + `DeboSceneGrid`. Parser returns `null` for empty/missing `scenes` array.

### Requirement: DeboSectionPage
Renders as `DeboTabs` with four tabs:

| Tab | id | dataPath | Component |
|-----|----|----|-----------|
| Spec | `spec` | `sections/{id}/{id}.section.scenes.yml` | `DeboCollapsible` (Description, User Flows, UI Requirements) |
| Sample Data | `data` | `sections/{id}/data.yml` | `DeboSampleData` |
| Design | `design` | `sections/{id}/{id}.section.scenes.yml` | `DeboSceneGrid` |
| Screenshots | `screenshots` | `sections/{id}/screenshots.md` | `DeboGrid` |

Scenes parser returns `null` for empty/missing `scenes` array.

### Requirement: Guidelines dependency
Tasks for `debo-design-tokens`, `debo-design-component`, `debo-design-screen`, `debo-design-shell` SHALL declare `reads: design-system/guidelines.yml`. Missing -> stop and tell user to run `/debo-design-guideline`. Present -> apply naming/principles silently.
