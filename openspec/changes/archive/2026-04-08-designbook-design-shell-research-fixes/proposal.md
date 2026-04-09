## Why

The `design-shell` workflow's `--research` audit revealed systematic issues across skill files: broken blueprint links, missing `reads:` declarations, a workflow-execution sequencing bug (done-before-plan causes premature archival), token mapping that produces wrong colors (MD3 dark-theme derivation vs. Stitch's actual rendering), and a stale Storybook instance missing new components. These issues degrade output quality and cause friction during execution.

## What Changes

- **Fix workflow-execution sequencing**: Auto-call `workflow plan` when intake is marked done, eliminating the done-before-plan archival bug
- **Fix Stitch token mapping rule**: Restrict Delta-E approximation in `stitch-tokens.md` so brand-aligned roles always use brand override primitives instead of approximating to lighter variants
- **Fix broken blueprint links**: Correct `../components/resources/` → `../resources/` in section, grid, container blueprints
- **Deduplicate constraints**: Remove component-reuse duplication, fix DaisyUI reference in sdc-conventions
- **Fix Storybook preview freshness**: `storybook-preview` task should detect stale index and restart when new components were added
- **Deduplicate constraints**: Remove component-reuse duplication between `create-component.md` and `sdc-conventions.md`
- **Fix DaisyUI reference in sdc-conventions.md**: Replace framework-specific class example with generic token-based reference

## Capabilities

### New Capabilities

- `auto-plan-after-intake`: Workflow engine automatically calls `plan` when intake task completes, preventing premature archival and eliminating a manual sequencing step

### Modified Capabilities

- `workflow-execution`: Intake-done triggers plan automatically; removes manual plan-after-done sequencing
- `tailwind-css-tokens`: Fix `stitch-tokens.md` rule — brand override primitives take precedence for semantic roles, Delta-E approximation restricted to non-brand roles
- `layout-components`: Fix broken blueprint reference links (section, grid, container)
- `scene-conventions`: Storybook preview task detects and restarts stale instances

## Impact

- **Skill files**: ~16 files across `designbook/`, `designbook-drupal/`, `designbook-stitch/`, `designbook-devtools/`
- **CSS tokens**: `css/tokens/color.src.css` — semantic color variable remapping
- **Design tokens**: `designbook/design-system/design-tokens.yml` — primitive-to-semantic mapping
- **Workflow execution**: `resources/workflow-execution.md` — phase 1 step ordering
- **No breaking changes**: All fixes are backward-compatible refinements
