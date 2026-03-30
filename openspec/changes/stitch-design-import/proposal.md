## Why

When users have an existing Stitch project with designed screens, they manually re-enter colors, fonts, spacing, and design principles during `debo tokens` and `debo design-guidelines` intake. Stitch already holds this information in `designTheme` (colors, fonts, roundness) and in the screen HTML/CSS (component patterns, layout principles, atmosphere). Importing this automatically saves time and ensures consistency between Stitch designs and designbook implementation.

## What Changes

- Add `stitch-tokens` rule to `designbook-stitch` skill: during `tokens:intake`, fetch `designTheme` from Stitch project via `get_project` and propose token values (colors, fonts, roundness, color mode)
- Add `stitch-guidelines` rule to `designbook-stitch` skill: during `design-guidelines:intake`, fetch screen HTML via `get_screen` → `htmlCode.downloadUrl`, analyze component patterns, layout principles, and visual atmosphere, and propose guidelines values
- Both rules are optional — only active when `design_tool.type: stitch` is configured in `guidelines.yml`

## Capabilities

### New Capabilities
- `stitch-token-import`: Rule on `tokens:intake` that imports design token values from Stitch project's designTheme (customColor → primary, headlineFont → heading font, bodyFont → body font, roundness → border-radius, colorMode → light/dark context, override colors → secondary/tertiary)
- `stitch-guidelines-import`: Rule on `design-guidelines:intake` that analyzes Stitch screen HTML/CSS to extract component patterns, layout principles, and visual atmosphere as guidelines proposals

### Modified Capabilities
_(none)_

## Impact

- **Skills**: Two new rules added to existing `designbook-stitch` skill (created by visual-diff-integration change)
- **Dependencies**: Requires `designbook-stitch` skill directory to exist (from visual-diff-integration change)
- **Workflows**: No workflow changes — rules attach to existing intake steps
