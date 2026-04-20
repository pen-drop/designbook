## Context

The css-generate workflow has a five-stage pipeline: intake → prepare → generate → transform → index. The `generate-jsonata` task uses an `each: group` directive to iterate over token groups from the css-mapping blueprint. Currently, intake completes without producing group data, causing the engine to auto-archive the workflow before the generate stage runs. This forces full manual intervention.

Additionally, the Tailwind css-mapping blueprint lacks `spacing` and `breakpoints` groups (both standard Tailwind v4 `@theme` namespaces), and there is no task for preparing @font-face CSS from local/custom font files.

## Goals / Non-Goals

**Goals:**
- Intake stage produces a group list so `each:` expansion works for generate stage
- Tailwind css-mapping includes all standard `@theme` namespaces
- Local font files in the project can generate @font-face CSS without the google-fonts extension

**Non-Goals:**
- Changing the engine's `each:` expansion mechanism itself (that's addon-level code)
- Handling font subsetting or optimization
- Adding support for icon fonts (prepare-icons remains a no-op placeholder)

## Decisions

### Decision 1: Intake produces group list by scanning css-mapping against design-tokens.yml

Intake reads the css-mapping blueprint's `groups:` block and checks which `path` values exist in design-tokens.yml. Each existing path becomes a group entry in the result. This feeds the `each: group` expansion.

**Why not hardcode groups?** Groups are defined by the active CSS framework's css-mapping blueprint. Hardcoding would break the self-registration architecture.

**Why not fix the engine?** The engine's `each:` mechanism works correctly when data is present — the problem is that intake doesn't provide it. Fixing intake is the minimal, correct change.

### Decision 2: Add spacing and breakpoints to Tailwind css-mapping

Both `--spacing-*` and `--breakpoint-*` are standard Tailwind v4 `@theme` namespaces. They were missing from the mapping, causing them to be skipped in the automated pipeline.

- `spacing: { prefix: spacing, wrap: "@theme", path: "semantic.spacing" }`
- `breakpoints: { prefix: breakpoint, wrap: "@theme", path: "semantic.breakpoints" }`

### Decision 3: Local fonts task uses extension-free activation

The existing `prepare-fonts` task requires `when: extensions: google-fonts`. The new local-fonts task activates when a fonts directory exists at the configured CSS fonts path (`$DESIGNBOOK_DIRS_CSS/fonts/`). No extension configuration needed — presence of font files is sufficient.

**Why not a new extension?** Custom/local fonts are a basic need, not an optional integration. Extension gating would add friction for a common case.

## Risks / Trade-offs

- **[Risk]** Intake scanning css-mapping at runtime adds a step → **Mitigation**: Scanning is fast (YAML parse + path existence check). The alternative is a broken pipeline.
- **[Risk]** Local-fonts task may duplicate Google Fonts @font-face for fonts available from both sources → **Mitigation**: Local-fonts task only runs when no google-fonts extension is active. If both are active, google-fonts takes priority for its managed fonts.
