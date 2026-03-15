## 1. Remove CSS pipeline and dependencies

- [x] 1.1 Remove `build:css` script and Tailwind CLI invocation from `package.json`
- [x] 1.2 Delete `tailwind.config.ts` (or equivalent Tailwind config) — already absent
- [x] 1.3 Delete `src/index.css`
- [x] 1.4 Remove tailwindcss, daisyui, @tailwindcss/cli from devDependencies
- [x] 1.5 Remove `/\.css$/` from tsup externals in `tsup.config.ts`
- [x] 1.6 Remove `import '../index.css'` from `src/components/index.js`

## 2. Create shared manager-utils

- [x] 2.1 Create `src/components/manager-utils.tsx` with `relativeTime()`, `timeRange()`, and styled `ManagerBadge`, `ManagerActivityItem`

## 3. Migrate UI primitives

- [x] 3.1 `DeboBadge.jsx` — rewritten with styled() (SB Badge lacks custom hex color support)
- [x] 3.2 `DeboAlert.jsx` — rewritten with styled()
- [x] 3.3 `DeboCard.jsx` — rewritten with styled()
- [x] 3.4 `DeboLoading.jsx` — rewritten using Storybook `Loader`
- [x] 3.5 `DeboEmptyState.jsx` — rewritten using Storybook `Placeholder`
- [x] 3.6 `DeboPageLayout.jsx` — rewritten with styled()
- [x] 3.7 `DeboSourceFooter.jsx` — rewritten with styled()
- [x] 3.8 `DeboBulletList.jsx` — rewritten with styled()
- [x] 3.9 `DeboNumberedList.jsx` — rewritten with styled()
- [x] 3.10 `DeboMockupWindow.jsx` — deleted (usage fixed in DeboSectionPage)

## 4. Migrate UI composites

- [x] 4.1 `DeboCollapsible.jsx` — rewritten using Storybook `Collapsible`
- [x] 4.2 `DeboActionList.jsx` — rewritten with styled()
- [x] 4.3 `DeboStepIndicator.jsx` — rewritten with styled()
- [x] 4.4 `DeboSceneCard.jsx` — rewritten with styled()

## 5. Migrate display components to styled()

- [x] 5.1 `DeboProductOverview.jsx` — rewritten with styled()
- [x] 5.2 `DeboDesignTokens.jsx` — rewritten with styled()
- [x] 5.3 `DeboDataModel.jsx` — rewritten with styled()
- [x] 5.4 `DeboSampleData.jsx` — rewritten with styled() + SyntaxHighlighter
- [x] 5.5 `DeboSceneGrid.jsx` — rewritten with styled()

## 6. Migrate page components to styled()

- [x] 6.1 `DeboVisionPage.jsx` — already removed (merged into DeboFoundationPage)
- [x] 6.2 `DeboDesignSystemPage.jsx` — rewritten with styled()
- [x] 6.3 `DeboDataModelPage.jsx` — already removed (merged into DeboFoundationPage)
- [x] 6.4 `DeboSectionPage.jsx` — rewritten with styled() + Card replaces MockupWindow
- [x] 6.5 `DeboSectionsOverview.jsx` — rewritten with styled()
- [x] 6.6 `DeboSection.jsx` — rewritten with styled()
- [x] 6.7 `DeboFoundationPage.jsx` — added React import

## 7. Migrate manager components

- [x] 7.1 `DeboOnboardingGuide.jsx` — rewritten with styled() + manager-utils
- [x] 7.2 `Panel.tsx` — added TabsView (Workflows + Status tabs), imports from manager-utils

## 8. Update exports

- [x] 8.1 Update `src/components/ui/index.js` — removed DeboMockupWindow export
- [x] 8.2 Update `src/components/index.js` — removed deleted pages, added DeboFoundationPage
- [x] 8.3 Verify all `.jsx` files have `import React from 'react'` — all 24 confirmed

## 9. Cleanup and Validation

- [x] 9.1 Run ESLint — passed
- [x] 9.2 Build — passed
- [ ] 9.3 Verify all pages render in Storybook dev mode
- [ ] 9.4 Verify OnboardingGuide dropdown works
- [ ] 9.5 Verify Panel tabs work
