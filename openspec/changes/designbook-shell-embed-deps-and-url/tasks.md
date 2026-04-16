## 1. Blueprint `embeds:` Frontmatter

- [x] 1.1 Add `embeds: [container]` to `.agents/skills/designbook-drupal/components/blueprints/header.md` frontmatter
- [x] 1.2 Add `embeds: [container]` to `.agents/skills/designbook-drupal/components/blueprints/footer.md` frontmatter
- [x] 1.3 Verify all other blueprints in `designbook-drupal/components/blueprints/` — add `embeds:` where `{% embed %}` usage is described in the body text (e.g., `section.md` if it embeds container)

## 2. Intake Task — Dependency Resolution and Build Order

- [x] 2.1 In `.agents/skills/designbook/design/tasks/intake--design-shell.md`, replace the hardcoded line "The `container` component MUST always be included" (line 89) with a dependency resolution step: load blueprints for proposed components, collect `embeds:` entries, auto-add missing dependencies
- [x] 2.2 In the same file, add build-order sorting instruction: components with no `embeds:` first, then dependents. Reference the `blueprint-embed-deps` spec
- [x] 2.3 In the same file, fix terminology: change "apply the `extract-reference` rule" to "apply the `extract-reference` resource" (line 33)

## 3. Storybook URL Resolution

- [x] 3.1 In `.agents/skills/designbook/design/resources/extract-reference.md`, add instruction: before taking screenshots, call `_debo storybook status` and use the `url` field from the response. Do not use `$DESIGNBOOK_URL` directly
- [x] 3.2 In `.agents/skills/designbook-drupal/components/tasks/create-component.md`, update "Verify Storybook renders" step to specify: obtain URL via `_debo storybook status`
- [x] 3.3 In `.agents/skills/designbook/design/tasks/capture-storybook.md`, verify that URL resolution already uses `_debo story` (which internally resolves URL) — update if it references `$DESIGNBOOK_URL` directly

## 4. Scene Task — Reference Data Flow

- [x] 4.1 In `.agents/skills/designbook/design/tasks/create-scene--design-shell.md`, add `$STORY_DIR/design-reference.md` to the `reads:` declaration (optional: true)
- [x] 4.2 In the same file, add instruction to read `design-reference.md` for the `Source:` URL and use it to populate the scene's `reference:` array

## 5. Loading Scope Fixes

- [x] 5.1 In `.agents/skills/designbook-drupal/scenes/rules/scenes-constraints.md`, change `when.steps` from including intake steps to only `[design-shell:create-scene, design-screen:create-scene]`
- [x] 5.2 In `.agents/skills/designbook-drupal/components/blueprints/section.md`, remove `design-shell:intake` from `when.steps` (keep `design-screen:intake`, `tokens:intake`)
- [x] 5.3 In `.agents/skills/designbook-drupal/components/blueprints/grid.md`, remove `design-shell:intake` from `when.steps` (keep `design-screen:intake`)

## 6. Rule Content Fixes

- [x] 6.1 In `.agents/skills/designbook-css-tailwind/rules/component-source.md`, add a conditional: only add per-component `@source` if `app.src.css` does not already have a wildcard `@source` covering the components directory
- [x] 6.2 In `.agents/skills/designbook-drupal/components/tasks/create-component.md`, correct the reference to `SKILL.md` as "single source of truth for classes" — either update the reference to point to the correct source or remove the misleading claim

## 7. Verification

- [x] 7.1 In the workspace, run `_debo workflow create --workflow design-shell` and verify `stage_loaded` contains corrected loading scopes: no `scenes-constraints` in intake, no `section.md`/`grid.md` in shell intake, blueprints show `embeds:` fields
- [x] 7.2 Verify that `_debo storybook status` returns the correct URL and that no task references `$DESIGNBOOK_URL` as primary URL source
