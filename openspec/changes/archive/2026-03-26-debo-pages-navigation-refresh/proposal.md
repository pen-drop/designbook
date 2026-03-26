## Why

The Debo pages (Foundation, Design System, Sections) use three inconsistent navigation mechanisms: duplicated `navigateStorybook()` functions that force full page reloads via `window.top.location`, fragile manual story ID construction, and hardcoded `/docs/` links to non-existent docs pages. The Sections overview also uses a static Vite virtual module (`virtual:designbook-sections`) that never refreshes when sections are added or removed.

## What Changes

- **New `DeboLink` component**: Centralized navigation using Storybook's `selectStory` channel event for SPA-internal navigation (no page reload). Supports both `storyId` and `title`+`name` props.
- **Replace all navigation mechanisms**: Remove duplicated `navigateStorybook()` from `DeboSceneCard.jsx` and `DeboNumberedList.jsx`, remove `toStoryId()` from `DeboSceneGrid.jsx`, replace hardcoded `/docs/` links in `DeboSectionsOverview.jsx`.
- **Sections data from `/__designbook/status`**: Replace static `virtual:designbook-sections` import with a `useSections` hook that fetches from the existing `/__designbook/status` endpoint and listens for `designbook:file-add/update/delete` channel events for live updates.
- **Headline fix**: Add section heading to the empty state in `DeboSectionsOverview` (currently missing when no sections exist).

## Capabilities

### New Capabilities
- `debo-link-navigation`: Centralized DeboLink component and useSections hook for Storybook-native navigation and live section data

### Modified Capabilities
- `addon-ui-components`: DeboSceneCard, DeboNumberedList, DeboSceneGrid lose their own navigation logic in favor of DeboLink

## Impact

- `packages/storybook-addon-designbook/src/components/ui/DeboSceneCard.jsx` — remove `navigateStorybook()`, use DeboLink
- `packages/storybook-addon-designbook/src/components/ui/DeboNumberedList.jsx` — remove `navigateStorybook()`, use DeboLink
- `packages/storybook-addon-designbook/src/components/display/DeboSceneGrid.jsx` — remove `toStoryId()`, use DeboLink with title+name
- `packages/storybook-addon-designbook/src/components/pages/DeboSectionsOverview.jsx` — replace `virtual:designbook-sections` with useSections hook, add heading, use DeboLink
- `packages/storybook-addon-designbook/src/vite-plugin.ts` — `virtual:designbook-sections` can be removed once no longer imported
