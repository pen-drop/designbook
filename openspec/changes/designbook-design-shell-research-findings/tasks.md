## 1. Embed Block Convention

- [x] 1.1 Update `designbook-drupal/components/rules/sdc-conventions.md` — add hard constraint: layout components (container, section, grid) MUST wrap each slot output in `{% block <slotname> %}` tags for embed compatibility
- [x] 1.2 Update `designbook-drupal/components/blueprints/container.md` — add `{% block %}` wrapping examples for all three slots (background, header, content)
- [x] 1.3 Update `designbook-drupal/components/blueprints/grid.md` — add `{% block %}` wrapping example for content slot
- [x] 1.4 Update `designbook-drupal/components/blueprints/section.md` — add `{% block %}` wrapping example for content slot

## 2. Split scenes-constraints.md

- [x] 2.1 Create `designbook-drupal/scenes/rules/scenes-constraints.md` — extract entity_type.bundle format, image node representation, listing scene conventions from core rule. Set `when: steps: [create-scene, design-shell:intake, design-screen:intake]`
- [x] 2.2 Create `designbook-css-tailwind/rules/scenes-constraints.md` — extract Tailwind @source/JIT reasoning for inline-styles-only requirement. Set `when: steps: [create-scene]`
- [x] 2.3 Update core `designbook/design/rules/scenes-constraints.md` — remove Drupal entity format, image node, listing scene, and Tailwind-specific content. Keep inline-styles-only, duck-typing format, $content rules

## 3. Remove compare-markup Stage

- [x] 3.1 Update `designbook/design/workflows/design-shell.md` — remove `compare-markup` from stages definition
- [x] 3.2 Update `designbook/design/workflows/design-screen.md` — remove `compare-markup` from stages definition (if present)
- [x] 3.3 Delete or archive `designbook/design/tasks/compare-markup.md`

## 4. Inspection Steps

- [x] 4.1 Update `designbook-drupal/components/tasks/create-component.md` — add inspection phase: read existing components that will be embedded/included, verify Storybook renders after generation
- [x] 4.2 Update `designbook/design/tasks/polish.md` — add inspection phase: read component files + scene YAML, open Storybook URL and verify rendering before applying fixes

## 5. Intake Component Extraction

- [x] 5.1 Update `designbook/design/tasks/intake--design-shell.md` — add component extraction criteria: identify atomic UI elements (button, badge, icon, search) as components when they appear 2+ times or are interactive. Include container as shell component.
- [x] 5.2 Remove hardcoded example param values (#00336a, Reef, etc.) from intake task

## 6. Setup-Compare Storybook Restart

- [x] 6.1 Update `designbook/design/tasks/setup-compare.md` — add mandatory `_debo storybook start --force` step before returning checks

## 7. Task Cleanups

- [x] 7.1 Fix `designbook-drupal/components/tasks/create-component.md` — change CLI prefix from `designbook workflow write-file` to `_debo workflow write-file`
- [x] 7.2 Move Tailwind `@source` logic from `create-component.md` to a new rule or hook in `designbook-css-tailwind/`
- [x] 7.3 Update `designbook/design/tasks/capture-reference.md` — remove stale Node API references, replace routing table with reference to `playwright-capture.md` rule
- [x] 7.4 Update `designbook/design/rules/typography-tokens.md` — replace Tailwind-specific terms (`text-sm`, `Tailwind utility classes`) with framework-agnostic language
- [x] 7.5 Rename `designbook/design/tasks/outtake--design-screen.md` → `outtake--design.md`, update `when:` to cover design-shell, design-screen, design-verify

## 8. Title Interpolation Fix

- [x] 8.1 Fix `expandParams` in `packages/storybook-addon-designbook/src/workflow-resolve.ts` — before `String(params[paramName])`, check if value is array/object. For arrays with `scene`/`storyId` elements, extract first element's field. For other objects, use `JSON.stringify()`.

## 9. component_design_hints Param

- [x] 9.1 Update `designbook/design/tasks/intake--design-shell.md` — add `design_hint` field to each component item in `--params` output. Each hint contains the landmark-specific extraction (rows/sections, fonts, interactive patterns) from design-reference.md.
- [x] 9.2 Update `designbook-drupal/components/tasks/create-component.md` — document that `design_hint` is available as a direct param (via `each: component` expansion), use it as primary design input when present
- [x] 9.3 Update `designbook/design/tasks/polish.md` — document access to `design_hint` via params, cross-reference hints when verifying fixes

## 10. Blueprint Constraint Cleanup

- [x] 10.1 Update `designbook-drupal/components/blueprints/grid.md` — replace MUST/never constraint language with advisory language, defer to `layout-constraints.md` rule
- [x] 10.2 Update `designbook-drupal/components/blueprints/container.md` — replace MUST/never constraint language with advisory language, remove auto-padding truth table (implementation detail)
- [x] 10.3 Update `designbook-drupal/components/blueprints/header.md` — remove "required slot" constraint for navigation (already enforced by `navigation.md` rule)

## 11. Verification

- [x] 11.1 Run `./scripts/setup-workspace.sh drupal-web` from worktree root to create fresh test workspace (manual verification step)
- [x] 11.2 Run `/designbook design-shell` in the workspace to verify zero friction (manual verification step)
