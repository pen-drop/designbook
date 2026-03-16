## 1. Remove Dashboard

- [x] 1.1 Delete `src/components/pages/DeboDashboardPage.jsx`
- [x] 1.2 Delete `src/components/ui/DeboStatusBox.jsx`
- [x] 1.3 Delete `src/pages/dashboard.scenes.yml`
- [x] 1.4 Remove `DeboDashboardPage` export from `src/components/pages/index.js`
- [x] 1.5 Remove page registration (`PAGE_ID`, `types.PAGE`) from `src/manager.tsx`
- [x] 1.6 Remove `PAGE_ID` from `src/constants.ts` if no longer used

## 2. Create Onboarding Guide Component

- [x] 2.1 Create `src/components/ui/DeboOnboardingGuide.jsx` — compact block with status badges (vision, tokens, data-model, shell, sections) and collapsible detail area
- [x] 2.2 Reuse `DeboBadge` for status indicators (green/yellow/gray)
- [x] 2.3 Sections badge: show summary count `sections (N/M)` — green if all ready, yellow if partial, gray if none
- [x] 2.4 Collapsible detail area: per-section badges (name + ready/not-ready state) and activity log using `DeboActionList`
- [x] 2.5 Poll `/__designbook/status` with 3s interval, extract badge states, section counts, and workflows

## 3. Register Onboarding Guide in Storybook

- [x] 3.1 In `src/manager.tsx`, render `DeboOnboardingGuide` in a visible location (Tool bar, sidebar header, or Panel header area) so it's always visible regardless of page/story
- [x] 3.2 Export `DeboOnboardingGuide` from `src/components/index.js`

## 4. Cleanup and Validation

- [x] 4.1 Run ESLint and fix any issues: `cd packages/storybook-addon-designbook && npx eslint --cache --fix .`
- [x] 4.2 Verify Storybook builds without errors: `npm run build`
- [x] 4.3 Verify the onboarding guide renders correctly in Storybook dev mode
