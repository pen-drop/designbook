## 1. Variant Style Map

- [x] 1.1 Define style objects for `card`, `action-summary`, `action-item` in `DeboCollapsible.jsx` — container styles (background, border, radius, shadow, left-border)
- [x] 1.2 Define summary style objects per variant (padding, font-size, font-weight)
- [x] 1.3 Define content style objects per variant (padding, border-top)

## 2. Status Prop

- [x] 2.1 Add `status` prop (`done` | `running` | `pending`) with color mapping: `#D0FAE5`, `#FEF3C7`, `#F1F5F9`
- [x] 2.2 Apply status color as left-border on `action-summary` (3px) and `action-item` (2px) variants
- [x] 2.3 Ensure `status` is ignored on `card` variant

## 3. Progress Prop

- [x] 3.1 Add `progress` prop (`{ done, total }`) to `DeboCollapsible`
- [x] 3.2 Render bottom progress bar on `action-summary` via `border-image: linear-gradient(to right, #D0FAE5 ${pct}%, #F1F5F9 ${pct}%)` with `border-bottom: 3px`
- [x] 3.3 Ensure progress is ignored on `card` and `action-item` variants

## 4. Refactor & Verify

- [x] 4.1 Replace hardcoded inline styles with variant-driven style lookups
- [x] 4.2 Verify existing usages (DeboSectionPage, DeboDesignTokens, DeboDataModel, etc.) render unchanged with default `variant="card"`
