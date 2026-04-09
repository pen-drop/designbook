## Why

The current `compare-markup` task asks the AI to open Playwright, extract CSS/fonts/styles, and compare — all in one unstructured pass. This causes three problems:

1. **Accuracy** — the AI picks generic selectors (`h1`, `section`) and generic properties, missing what actually matters for the specific page
2. **Unstructured output** — extraction results are free-form text, making diffs unreliable and non-reproducible
3. **No baseline** — there is no persisted extraction spec, so re-runs may inspect different elements with different properties

The AI is doing mechanical work (measuring CSS values) and cognitive work (deciding what matters) simultaneously. Separating these concerns yields better results for both.

Additionally, `compare-screenshots` and `compare-markup` currently write results in different formats. Polish must handle both separately. A unified issue model with separate CLI commands for checks and issues simplifies this.

## What Changes

- **Rewrite `compare-markup` task** to use a three-phase approach instead of a single unstructured pass
- Phase 1: AI inspects the reference page and generates an `extraction-spec.yml`
- Phase 2: Playwright executes the spec mechanically on both URLs, producing structured JSON in `extractions/`
- Phase 3: Deterministic diff is computed, AI evaluates severity, creates check + adds issues via CLI
- **Separate CLI concepts**: `story check` (container, breakpoint/region) and `story issues` (individual problems)
- **All access via CLI**: tasks never read/write meta.yml directly
- **Issue lifecycle**: compare adds `open` issues → polish resolves → verify writes `result: pass|fail`
- **Polish stage iterates over issues**: `each: issues` instead of `each: checks`
- **Update `compare-screenshots`**: adopts same issue format via `story issues --add`
- **Update `polish` task**: reads open issues via `story issues --open`, updates via `story issues --update`
- **Update `verify` task**: re-evaluates, updates issues, closes check
- **New CLI command**: `story issues` for adding, reading, and updating issues

## Changes (2026-04-09)

- Replaced `extraction-diff.json` with unified issue model via CLI
- Checks and issues are separate CLI concepts
- All operations go through CLI (no direct meta.yml access)
- Polish stage uses `each: issues` instead of `each: checks`
- Workflow log sufficient for issue display (no separate UI tab needed)

## Capabilities

### Modified Capabilities

- `compare-markup`: Rewritten with three-phase extraction/diff/evaluation flow. Creates check + adds issues via CLI.
- `compare-screenshots`: Adopts same issue format — creates check + adds issues via CLI.
- `polish`: Reads open issues via `story issues --open`. Updates resolved issues via `story issues --update`.
- `verify`: Re-evaluates issues after recapture. Updates issues with `result: pass|fail`. Closes check.
- `design-verify` workflow: Polish stage changes from `each: checks` to `each: issues`.

### New Capabilities

- `_debo story issues` CLI command: add, read, update issues on checks.

## Impact

- **compare-markup task**: Complete rewrite of the task instructions
- **compare-screenshots task**: Issue format change — uses `story issues --add` instead of inline issues
- **polish task**: Reads/updates issues via CLI, gets individual issue as iteration item
- **verify task**: Re-evaluates and writes result per issue via CLI, closes check
- **design-verify workflow**: Polish stage `each: issues` instead of `each: checks`
- **CLI**: New `story issues` command; `story check` gains `status`/`result` fields
- **meta.yml schema**: `reference.checks` gains structured issues, `status`, `result` fields
- **File artifacts**: New `extractions/` directory per story
- **Removed**: `extraction-diff.json` (diff results live as issues via CLI)
