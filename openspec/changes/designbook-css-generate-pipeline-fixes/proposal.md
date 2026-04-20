## Why

The css-generate workflow auto-archives after the intake stage because the `each: group` task expansion mechanism fails when intake produces no data results. This leaves the generate, transform, and index stages unexecuted, requiring full manual intervention. Additionally, the Tailwind css-mapping blueprint is missing standard token groups (spacing, breakpoints), and there is no task for preparing custom/local font files — only a Google Fonts extension task exists.

## What Changes

- Fix the css-generate intake task to produce the group list needed for `each:` expansion of subsequent stages
- Add `spacing` and `breakpoints` groups to the Tailwind css-mapping blueprint
- Create a new `prepare-fonts` task for custom/local font files (not dependent on google-fonts extension)
- Scaffold the missing `prepare-icons` task as a no-op placeholder to prevent "step skipped" warnings

## Capabilities

### New Capabilities
- `local-fonts-css`: Task for generating @font-face CSS from local font files (woff2/woff/otf) placed in a project fonts directory. Complements the existing `google-fonts-css` capability.

### Modified Capabilities
- `css-generate-stages`: Intake stage must produce group data to enable `each:` task expansion. Spacing and breakpoints groups must be standard in the Tailwind mapping.
- `tailwind-css-tokens`: Add `spacing` (`--spacing-*`) and `breakpoints` (`--breakpoint-*`) as standard Tailwind v4 `@theme` groups.

## Impact

- **Skill files**: `designbook/css-generate/tasks/intake--css-generate.md` (modified), `designbook-css-tailwind/blueprints/css-mapping.md` (modified), new task file for local fonts
- **Addon CLI**: May need engine fix if `each:` expansion is an engine-level bug rather than a task data issue
- **Existing workflows**: No breaking changes — additional groups are additive, local-fonts task only activates when fonts directory exists
