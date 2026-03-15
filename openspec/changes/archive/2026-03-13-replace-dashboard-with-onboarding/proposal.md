## Why

The Dashboard is a full Storybook page that duplicates information already visible on the individual pages (Vision, Design System, Data Model, Sections). It occupies a top-level navigation slot and its "overview of everything" approach doesn't match the actual user need: a quick glance at what's done and what's next. A compact onboarding guide block above the sidebar navigation would serve this purpose better — always visible, non-intrusive, and actionable.

## What Changes

- **BREAKING**: Remove the `DeboDashboardPage` component and `dashboard.scenes.yml` page registration
- **BREAKING**: Remove the `/designbook` page route from `manager.tsx`
- Add a new `DeboOnboardingGuide` React component — a compact block showing:
  - Status badges (vision, tokens, data-model, shell, sections) with green/gray state
  - Sections badge shows summary count (e.g. `sections (2/4)`) — green if all ready, yellow if partial, gray if none
  - Collapsible detail area with per-section badges and activity log
- Render the onboarding guide above the sidebar page navigation, not as a separate page
- Remove `DeboStatusBox` component (only used by dashboard)

## Capabilities

### New Capabilities
- `onboarding-guide`: Compact onboarding status block with badges and activity log, rendered above sidebar navigation

### Modified Capabilities
- `design-shell-react-components`: Dashboard page removed, onboarding guide replaces it in the addon registration

## Impact

- `packages/storybook-addon-designbook/src/components/pages/DeboDashboardPage.jsx` — deleted
- `packages/storybook-addon-designbook/src/components/pages/index.js` — remove dashboard export
- `packages/storybook-addon-designbook/src/components/ui/DeboStatusBox.jsx` — deleted
- `packages/storybook-addon-designbook/src/pages/dashboard.scenes.yml` — deleted
- `packages/storybook-addon-designbook/src/manager.tsx` — remove page registration, add onboarding guide
- `packages/storybook-addon-designbook/src/constants.ts` — remove PAGE_ID if no longer needed
- `packages/storybook-addon-designbook/src/vite-plugin.ts` — `/__designbook/status` endpoint stays (used by onboarding guide)
- `packages/storybook-addon-designbook/tsup.config.ts` — may need adjustment if dashboard was bundled separately
