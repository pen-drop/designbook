## 1. CLI Blueprint Scanner

- [ ] 1.1 In the workflow plan resolver (`packages/storybook-addon-designbook/`), locate the rule scanning logic that matches `rules/*.md` by `when` conditions
- [ ] 1.2 Duplicate the scanning logic for `blueprints/*.md` directories across all skills
- [ ] 1.3 Store matched blueprint paths in each resolved task's `blueprints[]` array
- [ ] 1.4 Merge scanned blueprints with any frontmatter-declared blueprints (deduplicate by absolute path)

## 2. Verification

- [ ] 2.1 Run `workflow create` + `workflow plan` for `design-screen` and verify `step_resolved.map-entity.blueprints` includes `canvas.md`
- [ ] 2.2 Verify `step_resolved.intake.blueprints` still includes frontmatter-declared blueprints (`section.md`, `grid.md`, `container.md`) plus any scanned matches
- [ ] 2.3 Run `/designbook design-screen home --research` in the test workspace and confirm the map-entity stage loads the canvas blueprint without manual grep
