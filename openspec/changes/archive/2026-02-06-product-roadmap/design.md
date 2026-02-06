## Context

The product-vision migration established the core Designbook architecture: read-only Storybook display, AI command input, `debo:` CSS isolation, Vite plugin middleware, and file-based storage in `designbook/`. The existing implementation works but has all logic inlined — `ProductOverviewCard` contains its own card/collapsible patterns, and the MDX file has ~100 lines of inline fetch/loading/error/empty-state logic.

Now, adding a second workflow (product roadmap) to the same page would duplicate these patterns. Before building more workflow-specific components, the repeated patterns should be extracted into shared base components that all current and future workflows reuse.

The product roadmap in Design OS (`source/design-os/.claude/commands/design-os/product-roadmap.md`) reads the product overview, proposes 3-5 development sections, and saves a numbered list. In Designbook, this appears as a section below the product vision on the same MDX page.

## Goals / Non-Goals

**Goals:**
- Create a shared component library (`Debo*` components) that eliminates pattern duplication
- Refactor `ProductOverviewCard` and MDX inline code to use shared components
- Add product roadmap as a section on the existing `product-vision.mdx` page
- Create `/product-roadmap` AI command following the established conversational pattern
- Keep components composable, props-based, and display-only

**Non-Goals:**
- Changing the architecture established in product-vision (read-only Storybook, AI commands, Vite middleware)
- Creating a separate MDX page for the roadmap
- Building a layout/grid system (keep it simple — sections stack vertically in MDX)
- Adding new CSS/theming infrastructure (reuse existing `debo:` prefix setup)
- Building components for workflows beyond product roadmap (but design for reuse)

## Decisions

### Decision 1: Shared Component Naming Convention (`Debo*`)

**Choice:** All shared base components use the `Debo` prefix: `DeboCard`, `DeboCollapsible`, `DeboSection`, `DeboEmptyState`, `DeboNumberedList`. Workflow-specific components (like `ProductOverviewCard`) keep descriptive names and compose from `Debo*` components.

**Rationale:**
- Clear namespace: `Debo*` = Designbook base component, instantly recognizable
- Distinguishes generic base components from workflow-specific ones
- Mirrors the `debo:` CSS prefix — consistent naming across the system
- Short enough for comfortable JSX usage

**Alternatives Considered:**
- No prefix (just `Card`, `Collapsible`): Rejected — too generic, could conflict with DaisyUI or other libraries
- `Designbook*` prefix: Rejected — too long for frequent JSX usage

### Decision 2: `useDesignbookData` Hook for Data Loading

**Choice:** Extract the common fetch → parse → loading → error → reload pattern into a custom React hook `useDesignbookData(path, parser)`.

```jsx
const { data, loading, error, reload } = useDesignbookData(
  'product/product-overview.md',
  parseProductOverview
);
```

**Rationale:**
- The current MDX has ~30 lines of inline state/effect/fetch logic that would be duplicated per section
- A hook makes the MDX drastically simpler — one line instead of 30
- `parser` function as parameter keeps it generic — each workflow provides its own Markdown parser
- `reload()` function returned for the reload button pattern
- Consistent loading/error states across all sections

**Alternatives Considered:**
- Keep inline in MDX: Rejected — leads to massive duplication when adding roadmap section
- Context/Provider pattern: Rejected — overkill, no shared state between sections needed
- Render-props component: Rejected — hooks are simpler and more idiomatic React

### Decision 3: `DeboSection` as the Page Section Wrapper

**Choice:** `DeboSection` is the primary building block in MDX pages. It combines data loading, empty state, content rendering, and the AI command footer into one component.

```jsx
<DeboSection
  title="Product Roadmap"
  dataPath="product/product-roadmap.md"
  parser={parseRoadmap}
  command="/product-roadmap"
  emptyMessage="No product roadmap defined yet"
  renderContent={(data) => <DeboNumberedList items={data.sections} />}
/>
```

**Rationale:**
- Eliminates all boilerplate from MDX — each workflow section is ~8 lines of JSX
- Encapsulates the full pattern: load → loading spinner → error → empty state → content + reload + AI command ref
- `renderContent` prop gives full control over how to display the data
- Consistent UX across all sections (same loading, error, empty, footer patterns)

**Alternatives Considered:**
- Separate components per concern (loader, empty, footer): Rejected — leads to more JSX boilerplate in MDX, and the pattern is always the same
- HOC pattern: Rejected — less readable in MDX context

### Decision 4: Composable Cards and Collapsibles

**Choice:** `DeboCard` wraps content in a consistent card style. `DeboCollapsible` provides the expand/collapse pattern. Both are small, composable primitives.

```jsx
<DeboCard title="Product overview: Designbook">
  <p>Description text...</p>
  <DeboCollapsible title="Problems & Solutions" count={3}>
    <ul>...</ul>
  </DeboCollapsible>
</DeboCard>
```

**Rationale:**
- `ProductOverviewCard` currently has ~130 lines because card + 2 collapsibles are all inline
- With `DeboCard` + `DeboCollapsible`, it shrinks to ~30 lines
- Same primitives reusable for future workflows (data model entities, design tokens, etc.)
- `DeboCollapsible` handles the toggle state, chevron icon, count badge internally

**Alternatives Considered:**
- DaisyUI `collapse` component: Considered, but DaisyUI's collapse uses checkbox/radio hacks that don't play well with React state; our implementation gives more control
- Keep inline: Rejected — already proven to cause code bloat

### Decision 5: `DeboNumberedList` for Roadmap Sections

**Choice:** A reusable numbered list component for displaying ordered items with title + description. Used for roadmap sections, but generic enough for any ordered list.

```jsx
<DeboNumberedList items={[
  { title: "Homepage", description: "Landing page with overview..." },
  { title: "About", description: "Company info and team..." },
]} />
```

**Rationale:**
- The roadmap is fundamentally a numbered list of sections
- Same pattern useful for future workflows: development phases, migration steps, etc.
- Simple props: `items` array with `title` and `description`
- Numbered indicator provides visual hierarchy

**Alternatives Considered:**
- Plain `<ol>` in MDX: Rejected — inconsistent styling with other Designbook components
- Roadmap-specific component: Rejected — the numbered list pattern is generic

### Decision 6: Product Roadmap as Section on Existing Page

**Choice:** The roadmap is a second `DeboSection` on `product-vision.mdx`, not a separate page. The page is renamed conceptually to "Product" (covering vision + roadmap).

**Rationale:**
- Product vision and roadmap are closely related — roadmap builds directly on the vision
- Avoids context switching between pages for related information
- In Design OS, they're separate steps but part of the same "Product" page
- Storybook navigation stays clean (one "Product" entry instead of two)

**Alternatives Considered:**
- Separate MDX page: Rejected by user — roadmap belongs below product vision
- Tabs within the page: Rejected — unnecessary complexity, both sections are short enough to stack

### Decision 7: AI Command Reads Product Vision Before Proposing Roadmap

**Choice:** The `/product-roadmap` AI command first reads `designbook/product/product-overview.md` (if it exists) and uses it to inform section proposals. If no product vision exists, it prompts the user to define one first.

**Rationale:**
- Design OS follows the same pattern: roadmap builds on the product overview
- Sections should reflect the product's problems, features, and goals
- Prevents orphaned roadmaps that don't align with the product vision
- AI can make informed proposals based on existing context

**Alternatives Considered:**
- Independent of product vision: Rejected — roadmap without vision context produces generic results
- Require product vision strictly: Rejected — too rigid, user might want to define roadmap first

## Risks / Trade-offs

### Risk: Refactoring Existing Working Code
**Mitigation:** The refactoring of `ProductOverviewCard` and MDX is straightforward extraction — no logic changes, just moving patterns into shared components. Validate with Agent Browser before and after to confirm identical behavior.

### Risk: Shared Components Too Opinionated
**Mitigation:** Keep `Debo*` components as thin wrappers with good prop defaults. Use `children` and `renderContent` patterns for flexibility. Don't bake in workflow-specific logic.

### Trade-off: More Files, Less Inline Code
**Acceptance:** Adding 5-6 new component files increases file count but dramatically reduces per-component complexity. Each file is small (<50 lines) and focused.

### Trade-off: Hook Couples to Vite Middleware API
**Acceptance:** `useDesignbookData` hardcodes the `/__designbook/load` endpoint. This is acceptable because all Designbook data loading goes through this middleware, and it's a single change point if the API evolves.

## Open Questions

- Should `DeboSection` render an `<h2>` for the section title, or should that be left to the MDX page? (Leaning towards: MDX handles headings, `DeboSection` handles the data display area only)
- Should the page MDX file be renamed from `product-vision.mdx` to `product.mdx` since it now covers vision + roadmap? (Depends on whether the Storybook navigation title matters)
