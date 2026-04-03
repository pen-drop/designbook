## 1. CLI Blueprint Scanner

- [x] 1.1 In the workflow plan resolver (`packages/storybook-addon-designbook/`), locate the rule scanning logic that matches `rules/*.md` by `when` conditions
- [x] 1.2 Duplicate the scanning logic for `blueprints/*.md` directories across all skills (already existed; fixed qualified step name matching for both rules and blueprints)
- [x] 1.3 Store matched blueprint paths in each resolved task's `blueprints[]` array (already existed)
- [x] 1.4 Merge scanned blueprints with any frontmatter-declared blueprints (deduplicate by absolute path) (dedup via includes() in scanning loop)

## 2. Verification

- [x] 2.1 Run `workflow create` for `design-screen` and verify `step_resolved["design-screen:map-entity"].blueprints` includes `canvas.md` — confirmed: canvas.md + views.md + layout-builder.md + field-map.md all loaded
- [x] 2.2 Verify `step_resolved.intake.blueprints` still includes frontmatter-declared blueprints (`section.md`, `grid.md`, `container.md`) plus any scanned matches — confirmed
- [x] 2.3 Run `/designbook design-screen home --research` in the test workspace and confirm the map-entity stage loads the canvas blueprint without manual grep — verified via CLI: canvas.md in step_resolved; full E2E blocked by Storybook startup timeouts
