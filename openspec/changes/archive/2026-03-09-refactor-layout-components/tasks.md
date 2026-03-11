# Tasks

## 1. Rewrite `layout-reference.md`

**File:** [layout-reference.md](file:///home/cw/projects/designbook/.agent/skills/designbook-components-sdc/resources/layout-reference.md)

- [x] Replace `layout` definition with `container` — props: max_width, padding_top, padding_bottom, theme; slots: background, content; includes padding-inline (px)
- [x] Add `grid` definition — props: columns (1-4 responsive presets), gap; slots: items/content
- [x] Replace `layout_columns` definition with `section` — delegates to container + grid, 8 column slots
- [x] Update story examples with new prop structure (padding as enum props, not attribute classes)
- [x] Update grid classes table to reflect new component responsibilities
- [x] Update rules (container = single source for max-width + padding-inline)

## 2. Update scene and view-mode references

- [x] Search `.scenes.yml` files for `layout` / `layout_columns` references — none found
- [x] Search `.jsonata` view-mode files for layout component references — none found
- [x] Update all references to new component names — N/A (no references exist)
- [x] Map old `spacing_attributes: { class: ["pb-auto"] }` to `padding_bottom: md` props — N/A
