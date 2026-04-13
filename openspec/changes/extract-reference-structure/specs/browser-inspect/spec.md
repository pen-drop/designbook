# browser-inspect (delta)

Extension of the extraction JSON output format to support the reference-extraction rule's needs.

## MODIFIED Requirements

### Requirement: compare-markup task delegates to three phases

The `compare-markup` task definition SHALL orchestrate the three phases sequentially.

#### Scenario: Task execution flow
- **WHEN** `compare-markup` runs for a scene + breakpoint
- **THEN** it executes:
  1. Phase 1 — AI inspects reference, writes `extractions/{bp}--spec.yml`
  2. Phase 2 — Playwright extracts from both URLs, writes `extractions/{bp}--reference.json` and `{bp}--storybook.json`
  3. Phase 3 — Diff is computed in memory, AI evaluates, creates check via `story check` (open), adds issues via `story issues --add`

#### Scenario: Fallback without reference markup
- **WHEN** `hasMarkup` is not `true` on the reference source
- **THEN** `compare-markup` is skipped entirely (unchanged from current behavior)

#### Scenario: Extraction JSON format extended with children field
- **WHEN** Playwright extraction produces JSON output (Phase 2)
- **THEN** each element in the `elements` array MAY include a `children` field
- **AND** the `children` field SHALL be an array of element objects with the same structure (selector, label, category, styles, content)
- **AND** `children` extraction is triggered by `match_children: true` in the extraction spec
- **AND** maximum nesting depth SHALL be 3 levels

#### Scenario: Extraction JSON format extended with focus field
- **WHEN** Playwright extraction produces JSON output
- **THEN** the JSON SHALL include a `focus` field at the root level
- **AND** for compare-markup, `focus` SHALL be `"comparison"`
- **AND** for reference-extraction rule, `focus` SHALL be one of `"styles"`, `"structure"`, `"content"`

#### Scenario: Extraction JSON format extended with strategy field
- **WHEN** extraction produces JSON output
- **THEN** the JSON SHALL include a `strategy` field at the root level
- **AND** valid values are `"playwright"`, `"api"`, `"vision"`
- **AND** for compare-markup (which always uses Playwright), `strategy` SHALL be `"playwright"`
