## 1. Implicit Plan in Intake Done (CLI + Skill)

- [x] 1.1 Extend `workflow done` in addon CLI: when `--task intake --params '<json>'` is provided, run plan logic (expand iterables from `expected_params` + provided params) before marking intake done. Return expanded task list in response.
- [x] 1.2 Handle singleton workflows: when `--task intake` is called without `--params`, auto-plan with empty params `{}`
- [x] 1.3 Remove `workflow plan` CLI command entirely
- [x] 1.4 Simplify `workflow-execution.md` Phase 1: remove separate Plan step. Document `workflow done --task intake --params '<json>'` as the single call.
- [x] 1.5 Update `cli-reference.md`: remove `workflow plan` docs, add `--params` to `workflow done` docs

## 2. Stitch Token Color Mapping

- [x] 2.1 Update `designbook-stitch/rules/stitch-tokens.md` line 39: restrict Delta-E approximation to non-brand roles only. Brand-aligned roles (`primary`, `secondary`, `tertiary` and their families) MUST always reference the brand override primitive.
- [x] 2.2 Add explicit brand-role-to-namedColor family mapping in `stitch-tokens.md`: document which namedColor entries belong to each brand override (`overridePrimaryColor` → primary, primary_container, on_primary, etc.)

## 3. Blueprint Link Fixes

- [x] 3.1 Fix `designbook-drupal/components/blueprints/section.md`: change `../components/resources/section-reference.md` to `../resources/section-reference.md`
- [x] 3.2 Fix `designbook-drupal/components/blueprints/grid.md`: change `../components/resources/grid-reference.md` to `../resources/grid-reference.md`
- [x] 3.3 Fix `designbook-drupal/components/blueprints/container.md`: change `../components/resources/container-reference.md` to `../resources/container-reference.md`

## 4. Constraint Deduplication

- [x] 4.1 Remove "Component Reuse" section from `create-component.md` (already enforced by `sdc-conventions.md` rule)
- [x] 4.2 Replace DaisyUI class reference in `sdc-conventions.md` "No Hardcoded Colors" section with generic token-based example

## 5. Storybook Preview Freshness

- [x] 5.1 Update `storybook-preview.md`: add step to compare component directory modification time against Storybook start time, restart if newer components exist
