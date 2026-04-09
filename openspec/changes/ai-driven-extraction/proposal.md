## Why

The current `compare-markup` task asks the AI to open Playwright, extract CSS/fonts/styles, and compare — all in one unstructured pass. This causes three problems:

1. **Accuracy** — the AI picks generic selectors (`h1`, `section`) and generic properties, missing what actually matters for the specific page
2. **Unstructured output** — extraction results are free-form text, making diffs unreliable and non-reproducible
3. **No baseline** — there is no persisted extraction spec, so re-runs may inspect different elements with different properties

The AI is doing mechanical work (measuring CSS values) and cognitive work (deciding what matters) simultaneously. Separating these concerns yields better results for both.

## What Changes

- **Rewrite `compare-markup` task** to use a three-phase approach instead of a single unstructured pass
- Phase 1: AI inspects the reference page and generates an `extraction-spec.yml` — a YAML file declaring which elements to inspect and which CSS properties to extract
- Phase 2: Playwright executes the spec mechanically on both reference and Storybook URLs, producing structured JSON
- Phase 3: A deterministic diff is computed, then the AI evaluates severity and persists the result via `_debo story check`
- The extraction spec is persisted and reusable across re-runs
- The structured diff feeds directly into the `polish` task with actionable, specific issues

## Capabilities

### Modified Capabilities

- `compare-markup`: Rewritten task file with three-phase extraction/diff/evaluation flow. Extraction spec as intermediate artifact. Structured JSON diff instead of free-form comparison. Severity classification (critical/major/minor/info). Result persisted via `_debo story check --region markup`.

### New Capabilities

_(none — this modifies the existing compare-markup task)_

## Impact

- **compare-markup task**: Complete rewrite of the task instructions
- **polish task**: Now receives structured `extraction-diff.json` with labeled elements and concrete values instead of unstructured notes
- **File artifacts**: New files per breakpoint: `extraction-spec.yml`, `extraction-reference.json`, `extraction-storybook.json`, `extraction-diff.json`
- **_debo story check**: Uses `region: "markup"` (unchanged) but issues now contain labeled element references with concrete values
