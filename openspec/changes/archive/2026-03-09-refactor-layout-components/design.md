## Context

Current `layout` component handles 6 concerns: max-width, grid, background, spacing, theming, header. `layout_columns` is a thin wrapper with 8 fixed slots. Both need refactoring into cleaner, composable pieces.

Inspired by Drupal Mercury Editor's approach (Section + Grid split).

## Goals / Non-Goals

**Goals:**
- Three composable components: container, grid, section
- padding_top / padding_bottom as enum props (not attribute classes)
- Grid with responsive presets (4→2→1 pattern)
- Section delegates to container internally (DRY)
- Clean migration from layout/layout_columns

**Non-Goals:**
- No runtime code changes (Vite plugin, renderer engine)
- No new CSS framework tokens (uses existing Tailwind v4 values)
- Grid above 4 columns (keep simple for now)

## Decisions

### 1. Three-component split
**Decision:** container + grid + section instead of one overloaded component.

**Rationale:** Container is needed everywhere (header, footer, modals, sections). Grid is a standalone arrangement pattern. Section is the Layout Builder adapter. Each has a clear single responsibility.

**Alternative rejected:** One component with ifs — creates complex Twig, bloated Layout Builder UI.
**Alternative rejected:** Two components (container + section) — grid presets need a component for Layout Builder discoverability.

### 2. Padding as props, not attributes
**Decision:** `padding_top` and `padding_bottom` are enum props (`none | sm | md | lg`), resolved via `var(--section-spacing-*)`.

**Rationale:** In Layout Builder, enum props render as dropdowns — much better UX than freeform CSS class inputs. Also enforces consistency via the design token scale.

### 3. Grid responsive presets
**Decision:** `columns` prop maps to responsive breakpoint patterns:
- `"1"` → `grid-cols-1`
- `"2"` → `grid-cols-1 md:grid-cols-2`
- `"3"` → `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- `"4"` → `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

**Rationale:** These cover 95% of use cases. Custom patterns use Twig/CSS directly.

### 4. Section delegates to container
**Decision:** `section.twig` includes `container` internally and passes grid content as the content slot.

**Rationale:** Props appear in both component.yml files (required for Layout Builder), but logic exists only in container and grid. Zero duplication of Twig logic.

## Risks / Trade-offs

- **Breaking change** → All scenes.yml and view-mode references to `layout`/`layout_columns` must be updated. Mitigation: search-and-replace, limited scope.
- **Prop duplication in component.yml** → Section repeats container and grid props. Mitigation: unavoidable for SDC, but Twig delegates so logic is DRY.
