## 1. Shared Base Components

- [x] 1.1 Create `DeboCard` component at `.storybook/source/components/DeboCard.jsx` with `title` (optional) and `children` props, using `debo:card` styling
- [x] 1.2 Create `DeboCollapsible` component at `.storybook/source/components/DeboCollapsible.jsx` with `title`, `count` (optional), `defaultOpen` (optional), and `children` props — manages own toggle state, chevron icon, count badge
- [x] 1.3 Create `DeboEmptyState` component at `.storybook/source/components/DeboEmptyState.jsx` with `message`, `command`, and `filePath` (optional) props — displays AI command reference card
- [x] 1.4 Create `DeboNumberedList` component at `.storybook/source/components/DeboNumberedList.jsx` with `items` prop (`[{ title, description }]`) — renders numbered list with visual indicators

## 2. Data Loading Hook

- [x] 2.1 Create `useDesignbookData` hook at `.storybook/source/hooks/useDesignbookData.js` with `path` and `parser` parameters — returns `{ data, loading, error, reload }`
- [x] 2.2 Hook fetches from `GET /__designbook/load?path=<path>`, handles 404 (returns `data: null`), errors, and loading state
- [x] 2.3 Hook calls `parser(markdownText)` to transform response, provides `reload()` function for refetching

## 3. DeboSection Component

- [x] 3.1 Create `DeboSection` component at `.storybook/source/components/DeboSection.jsx` with `dataPath`, `parser`, `command`, `emptyMessage`, and `renderContent` props
- [x] 3.2 DeboSection uses `useDesignbookData` internally and renders: loading spinner → error alert → `DeboEmptyState` → content via `renderContent(data)` + reload button + AI command footer

## 4. Refactor ProductOverviewCard

- [x] 4.1 Rewrite `ProductOverviewCard` at `.storybook/source/components/ProductOverviewCard.jsx` to use `DeboCard` for the card wrapper and `DeboCollapsible` for problems and features sections
- [x] 4.2 Verify refactored component renders identically to the original (same data, same visual output)

## 5. Update Barrel Exports

- [x] 5.1 Update `.storybook/source/components/index.js` to export `DeboCard`, `DeboCollapsible`, `DeboSection`, `DeboEmptyState`, `DeboNumberedList`, and `useDesignbookData`
- [x] 5.2 Verify existing exports (`ProductOverviewCard`, `StepIndicator`, `ProductForm`) remain intact

## 6. Roadmap Markdown Parser

- [x] 6.1 Create roadmap parser function that extracts `{ sections: [{ title, description }] }` from the `### N. Title` / description format in `product-roadmap.md`

## 7. Refactor Product Vision MDX Page

- [x] 7.1 Refactor `.storybook/onboarding/product-vision.mdx` to replace inline `useState`/`useEffect`/`fetch` logic with `DeboSection` component for product vision display
- [x] 7.2 Add a "Product Roadmap" section below product vision using a second `DeboSection` with `DeboNumberedList` as `renderContent`
- [x] 7.3 Verify both sections load data independently (one can show data while other shows empty state)

## 8. AI Command for Product Roadmap

- [x] 8.1 Create `/product-roadmap` AI command at `.cursor/commands/product-roadmap.md` — reads `designbook/product/product-overview.md` for context
- [x] 8.2 AI command proposes 3-5 sections based on product vision, iterates with user, saves to `designbook/product/product-roadmap.md`
- [x] 8.3 AI command handles missing product vision (suggests running `/product-vision` first)

## 9. Validation with Agent Browser

- [x] 9.1 Start Storybook and validate product vision section renders correctly with `DeboSection` (data display + empty state)
- [x] 9.2 Validate product roadmap section renders empty state with `/product-roadmap` AI command reference
- [x] 9.3 Create test roadmap file at `designbook/product/product-roadmap.md` and validate `DeboNumberedList` displays sections correctly
- [x] 9.4 Validate both sections coexist on the same page with independent data loading
- [x] 9.5 Validate CSS isolation — `debo:` prefixed classes do not leak to Drupal components
