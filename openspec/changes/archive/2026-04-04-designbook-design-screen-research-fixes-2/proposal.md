## Why

A `--research` audit of the `design-screen` workflow revealed systematic skill file quality issues: CLI commands with wrong prefixes, self-contradicting examples, absolute constraints misplaced in blueprints, duplicated `when:` entries, and type boundary violations. These cause confusion during workflow execution and make the skill system harder to maintain.

## What Changes

- **Fix canvas rule self-contradiction** — replace fictional component names (`canvas_section`, `canvas_card`) in examples with real component references and use `slots` instead of `children`.
- **Fix canvas blueprint** — same fictional component and `children` vs `slots` issue.
- **Move absolute constraints from blueprints to rules** — `grid.md` ("RULE: Never create domain-specific layout components") and `container.md` ("No other component should apply its own max-width") contain hard constraints that belong in rule files.
- **Remove duplicate `when.steps` entries** — `design-shell:intake` appears twice in section, grid, and container blueprints.
- **Fix misleading titles** — 4 data-mapping blueprints use "Rule:" prefix in their titles despite being blueprints.
- **Fix link rule incoherence** — description says "object with `uri` and `title`" but example shows HTML string.
- **Simplify devtools rule** — `devtools-context.md` contains full JS implementation code; reduce to pseudocode. Add visible user-facing warning when DevTools MCP server is not running instead of silently skipping.
- **Remove HOW-guidance from create-component task** — "MANDATORY: Change the app css" is implementation detail, not output declaration.

## Capabilities

### New Capabilities
- `skill-file-consistency`: Fixes to ensure all skill files respect type boundaries (task=WHAT, rule=constraint, blueprint=overridable), have correct CLI references, and contain no self-contradicting examples.

### Modified Capabilities

## Impact

- **Skill files affected:** 11 files across `designbook/`, `designbook-drupal/`, `designbook-devtools/`
- **No runtime behavior change** — these are documentation/instruction fixes that improve AI execution quality
- **No TypeScript/CLI changes required**
