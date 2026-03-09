## Architecture

`DeboCard` is a stateless UI primitive in the `ui/` layer — same tier as `DeboAlert`, `DeboCollapsible`, and `DeboEmptyState`. It receives all data via props and renders a structured card.

## Component Structure

```
DeboCard.jsx (~35 lines)
├── Header row: title + optional badge (flexbox, space-between)
├── Description: optional paragraph
├── Divider: conditional border-top (only if metadata present)
└── Footer: optional metadata tags (entityPath, fieldCount)
```

No sub-components needed — the card is simple enough to stay in a single file under the 50-line limit.

## Styling Decisions

### Pure Tailwind — no DaisyUI component classes

Use plain Tailwind utilities with `debo:` prefix throughout. No `debo:card`, `debo:badge`, or other DaisyUI component classes.

### Card container

`debo:bg-white debo:rounded-lg debo:shadow-sm debo:p-5` — simple white card with subtle shadow.

### Badge — extracted as `DeboBadge`

The badge is a reusable pattern, extracted into its own `DeboBadge` component (`ui/DeboBadge.jsx`). Supports color variants: `rose` (default), `slate`, `blue`, `amber`. Each variant maps to a Tailwind color pair (bg + text). `DeboCard` imports and renders `DeboBadge` when a `badge` prop is provided.

### Metadata tags

`debo:bg-slate-50 debo:text-slate-500 debo:text-xs debo:px-2.5 debo:py-1 debo:rounded` — lightweight inline tags.

### Divider

`debo:border-t debo:border-slate-100` — simple top border.

## Integration with DeboDataModel

Replace the `BundleSummary` inline component with `DeboCard`. The `EntityGroup` component passes entity type as the `badge` prop. Layout changes from vertical list (`debo:space-y-2`) to a card grid (`debo:grid debo:grid-cols-1 debo:md:grid-cols-2 debo:gap-4`). The `DeboCollapsible` wrapper stays — only the inner content changes.

## Props Graceful Degradation

- No `badge` → header shows title only, no tag
- No `description` → card skips directly to divider/footer
- No `entityPath` and no `fieldCount` → footer and divider are hidden entirely
- No `children` → nothing extra rendered
