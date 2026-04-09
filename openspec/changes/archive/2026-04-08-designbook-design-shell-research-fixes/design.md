## Context

The `design-shell` workflow's `--research` post-run audit uncovered systematic issues across the skill file hierarchy. The most impactful problems are:

1. **Workflow sequencing bug**: Calling `workflow done --task intake` before `workflow plan` causes immediate archival because no other tasks exist yet. This is a documentation/convention issue in `workflow-execution.md`.

2. **Token color mapping**: The tokens workflow derives dark-theme semantic colors using Material Design 3 conventions (`primary → light variant`), but the Stitch reference renders vivid blues on dark backgrounds. Result: button colors are washed-out periwinkle instead of electric blue.

3. **Broken links and missing declarations**: Blueprint files link to wrong paths, tasks don't declare their resource file dependencies in `reads:`.

4. **Stale Storybook**: The `storybook-preview` task checks if Storybook is running but not if its index is current — new components require a restart.

## Goals / Non-Goals

**Goals:**
- Eliminate the done-before-plan archival bug by documenting the correct sequencing (plan before done)
- Fix token mapping so visual output matches the Stitch reference colors
- Repair all broken file references in blueprints
- Add missing `reads:` declarations to task frontmatter
- Ensure Storybook restarts when new components are detected
- Remove duplication between task and rule files

**Non-Goals:**
- Redesigning the token derivation pipeline
- Adding new workflow stages or capabilities
- Changing the Storybook addon UI code

## Decisions

### D1: Implicit plan in `workflow done --task intake`

**Decision**: Extend the CLI's `workflow done` command to accept `--params '<json>'` when completing the intake task. The CLI internally runs plan logic (expanding iterables into tasks) before marking intake as done, returning the expanded task list. This eliminates the separate `workflow plan` step entirely.

**Why CLI change over documentation fix**: A documentation fix still leaves room for agent error (calling done before plan). Making plan implicit in the done call makes the wrong sequence impossible. The CLI already owns the plan logic — combining it with done is a natural consolidation.

The standalone `workflow plan` CLI command is removed entirely — plan logic only runs via `workflow done --task intake --params`. This reduces the API surface and eliminates the sequencing problem at its root. Singleton workflows (no params) auto-plan with `{}`.

### D2: Stitch token mapping — brand override priority

**Decision**: Fix `stitch-tokens.md` rule to prevent Delta-E approximation from overriding brand-aligned semantic roles. The root cause: the Delta-E rule (line 39) allows ANY namedColor to match ANY existing primitive if RGB distance < 8. This means a light-mode `primary` (#004fa8) can be approximated to `blue-200` (#aec6ff) instead of using the brand override primitive from `overridePrimaryColor` (#0366D6).

**Fix**: Restrict Delta-E approximation to non-brand roles (surfaces, outlines, etc.). Brand roles (`primary`, `secondary`, `tertiary` and their families) MUST always derive from the brand override primitive. Add explicit brand-role-to-namedColor family mapping.

**Why skill fix, not token file fix**: `design-tokens.yml` and `css/tokens/color.src.css` are generated outputs. Fixing them directly would be overwritten on next `debo tokens` run. The fix must be in the skill rule that controls derivation.

**Alternative considered**: Adding a post-processing validation step. Rejected — fixing the mapping logic at the source is cleaner.

### D3: Blueprint link fixes

**Decision**: Fix the relative paths in all three blueprint files. Current: `../components/resources/<name>-reference.md`. Correct: `../resources/<name>-reference.md`. The `components/` segment is spurious.

### D4: Storybook restart on new components

**Decision**: Update `storybook-preview.md` to compare the current component count against the running Storybook's known component count. If components were added since last start, issue `_debo storybook stop && _debo storybook start`.

**Alternative considered**: Hot-reload via Vite HMR. Rejected — Storybook's module federation requires a full restart for new component directories.

### D5: Constraint deduplication

**Decision**: Remove duplicated component-reuse constraint from `create-component.md` (already in `sdc-conventions.md`). Replace DaisyUI-specific class examples in `sdc-conventions.md` with generic token-based references.

## Risks / Trade-offs

- **[Token mapping rule change]** → Next `debo tokens` run will produce different color mappings. Mitigation: This is the intended fix — colors will match the Stitch reference.
- **[Storybook restart]** → Adds ~5-10 seconds per restart. Mitigation: Only triggers when component count changes, not on every preview step.
- **[CLI API change]** → **BREAKING**: `workflow plan` command removed. Agents using the old API must switch to `workflow done --task intake --params`. Since this is an internal tool (not public API), the migration scope is limited to skill files.
