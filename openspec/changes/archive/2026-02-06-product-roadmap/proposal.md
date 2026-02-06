## Why

The product roadmap is the natural next step after defining the product vision. In Design OS, `/product-roadmap` directly builds on `/product-vision` by breaking the product into 3-5 development sections. In Designbook, the roadmap should appear as a section below the product vision on the same page — not as a separate page — because it's a continuation of the same "Product" context.

Additionally, the existing components (`ProductOverviewCard`) contain repeated patterns (cards, collapsible sections, empty states, data loaders) that should be extracted into a shared component library. Before building more workflow-specific components, we need central base components that all current and future workflows can reuse.

## What Changes

- **Shared component library**: Extract reusable base components from existing code into `.storybook/source/components/` — `DeboCard`, `DeboCollapsible`, `DeboSection`, `DeboEmptyState`, `DeboNumberedList`, and a `useDesignbookData` hook for the common load/reload pattern
- **Refactor existing components**: Rewrite `ProductOverviewCard` and the MDX inline code to use the new base components
- **New AI command**: Create `/product-roadmap` command in `.cursor/commands/` that reads the existing product vision from `designbook/product/product-overview.md`, proposes 3-5 sections, and saves the result to `designbook/product/product-roadmap.md`
- **Extend existing MDX page**: Add a "Product Roadmap" section below the product vision display on `.storybook/onboarding/product-vision.mdx` — using shared components, following the same read-only pattern (AI command reference + data display)
- **Reuse existing infrastructure**: Same Vite plugin middleware (`/__designbook/load`), same `debo:` CSS prefix, same architectural pattern (AI writes, Storybook reads)

## Capabilities

### New Capabilities
- `designbook-shared-components`: Central component library with reusable base components for all Designbook workflows:
  - `DeboCard` — Card wrapper with consistent styling (border, shadow, body padding)
  - `DeboCollapsible` — Expandable/collapsible section with title, count badge, and chevron toggle
  - `DeboSection` — Page section that loads data from `designbook/`, shows empty state or content, with reload and AI command reference
  - `DeboEmptyState` — Empty state display with AI command reference and instructions
  - `DeboNumberedList` — Numbered list of items with title and description (for roadmap sections, steps, etc.)
  - `useDesignbookData` — React hook for the common fetch/parse/reload pattern from `/__designbook/load`
- `product-roadmap-workflow`: AI command-driven workflow that reads the product vision, proposes development sections, and saves the roadmap to `designbook/product/product-roadmap.md`. Displayed as a read-only section on the existing product vision MDX page using shared components.

### Modified Capabilities
- `product-vision-workflow`: The MDX page at `.storybook/onboarding/product-vision.mdx` is extended with a roadmap section and refactored to use shared components. No changes to existing product vision functionality.
- `product-vision-react-components`: `ProductOverviewCard` is refactored to use `DeboCard` and `DeboCollapsible` base components instead of inline implementations.

## Impact

- **Shared component files** (new):
  - `.storybook/source/components/DeboCard.jsx`
  - `.storybook/source/components/DeboCollapsible.jsx`
  - `.storybook/source/components/DeboSection.jsx`
  - `.storybook/source/components/DeboEmptyState.jsx`
  - `.storybook/source/components/DeboNumberedList.jsx`
  - `.storybook/source/hooks/useDesignbookData.js`
- **Workflow files** (new):
  - `.cursor/commands/product-roadmap.md` — AI command
  - `designbook/product/product-roadmap.md` — Saved roadmap data (created by AI command)
- **Refactored files**:
  - `.storybook/source/components/ProductOverviewCard.jsx` — Rewritten with `DeboCard` + `DeboCollapsible`
  - `.storybook/onboarding/product-vision.mdx` — Refactored with `DeboSection` + extended with roadmap section
  - `.storybook/source/components/index.js` — Export new shared components
- **Dependencies**: None new — reuses existing Vite plugin middleware and React/Tailwind setup
- **Design OS reference**: `source/design-os/.claude/commands/design-os/product-roadmap.md` serves as the workflow template
