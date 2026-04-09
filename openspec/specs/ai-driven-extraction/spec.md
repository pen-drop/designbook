# AI-Driven Extraction for Markup Comparison

Replaces the static, hard-coded element inspection in `compare-markup` with a three-phase approach: AI generates an extraction spec, Playwright executes it mechanically, AI evaluates the structured diff.

## Context

The current `compare-markup` task asks the AI to open Playwright, inspect elements, extract styles, and compare — all in one unstructured pass. Problems:

1. **Accuracy** — the AI picks generic selectors (`h1`, `section`) and generic properties, missing what actually matters for the specific page
2. **Unstructured output** — extraction results are free-form text, making diffs unreliable
3. **No baseline** — there is no persisted extraction spec, so re-runs may inspect different things

## Supersedes

This spec supersedes the `computedStyles` extraction approach in `browser-inspect` spec (scenarios "Computed style extraction" and "inspect-storybook.json format"). The structured inspect JSON format and session management from `browser-inspect` remain valid.

---

## Phase 1: AI Generates Extraction Spec

### Requirement: AI produces an extraction spec after inspecting the reference page

The AI SHALL inspect the reference URL visually (screenshot + DOM overview) and produce a YAML extraction spec tailored to the specific page.

#### Scenario: Extraction spec generation
- **GIVEN** a reference URL and its screenshot
- **WHEN** the `compare-markup` task begins
- **THEN** the AI opens a Playwright session on the reference URL
- **AND** retrieves a DOM summary (tag names, class names, landmark roles, nesting depth — no computed styles yet)
- **AND** produces an `extraction-spec.yml` file

#### Scenario: Extraction spec content
- **WHEN** the AI generates the extraction spec
- **THEN** the spec contains a list of `elements`, each with:

  | Field | Required | Description |
  |-------|----------|-------------|
  | `selector` | yes | CSS selector targeting the element(s) |
  | `label` | yes | Human-readable name for diff output |
  | `category` | yes | One of: `typography`, `interactive`, `layout`, `media`, `decoration` |
  | `extract` | yes | List of CSS computed style property names |
  | `content_check` | no | If `true`, also extract text content, link labels, or image sources |
  | `match_children` | no | If `true`, also extract styles from direct children matching the selector |

#### Scenario: AI chooses properties based on element role
- **WHEN** the AI selects `extract` properties for an element
- **THEN** it chooses properties relevant to that element's visual role:
  - Typography elements (headings, paragraphs): `fontSize`, `fontWeight`, `fontFamily`, `lineHeight`, `color`, `letterSpacing`, `textTransform`
  - Interactive elements (buttons, links, inputs): `backgroundColor`, `color`, `borderRadius`, `padding`, `fontSize`, `border`
  - Layout containers (sections, grids, flex): `display`, `flexDirection`, `gap`, `gridTemplateColumns`, `padding`, `maxWidth`
  - Media (images, video): `width`, `height`, `objectFit`, `aspectRatio`, `borderRadius`
  - Decorative properties: `boxShadow`, `opacity`, `transform` — only when visually prominent

#### Scenario: AI prioritizes design-critical elements
- **WHEN** the AI inspects the reference page
- **THEN** it focuses on:
  - Elements that define the page's visual identity (hero, headings, CTAs)
  - Elements where design-system tokens are expected (colors, spacing, typography)
  - Elements with distinct visual treatments (cards, badges, overlays)
- **AND** it skips:
  - Generic wrapper `div`s with no visual styling
  - Repeated identical elements (extract one representative, note count)
  - Browser-default styled elements with no custom treatment

#### Scenario: Extraction spec uses specific selectors
- **WHEN** the AI writes selectors
- **THEN** it prefers class-based or landmark-based selectors over tag-only selectors
- **AND** selectors are scoped to the visible content area (not Storybook chrome)
- **Example**: `.hero-section h1` instead of `h1`, `nav.main-nav` instead of `nav`

### Requirement: Extraction spec is persisted

The extraction spec SHALL be written to the workflow output directory so it can be reused and inspected.

#### Scenario: Spec file location
- **WHEN** `extraction-spec.yml` is generated
- **THEN** it is written to the step output directory alongside other compare artifacts
- **AND** it can be reviewed by the user to understand what was inspected

#### Scenario: Spec reuse on re-run
- **WHEN** `compare-markup` runs again for the same scene and breakpoint
- **AND** an `extraction-spec.yml` already exists
- **THEN** the AI MAY reuse or refine the existing spec instead of generating from scratch
- **AND** if it modifies the spec, it writes a new version (does not silently change)

---

## Phase 2: Mechanical Extraction via Playwright

### Requirement: Playwright executes the extraction spec deterministically

A Playwright script SHALL read `extraction-spec.yml` and extract computed styles from both reference and Storybook URLs, producing structured JSON.

#### Scenario: Extraction execution
- **GIVEN** an `extraction-spec.yml` and two URLs (reference, storybook)
- **WHEN** the extraction runs
- **THEN** for each element in the spec:
  1. `querySelectorAll(selector)` on both pages
  2. `getComputedStyle()` for each property in `extract`
  3. If `content_check: true`, also extract `textContent`, link `href`/labels, or `img.src`/`alt`
  4. If `match_children: true`, repeat for direct children
- **AND** results are written to `extraction-reference.json` and `extraction-storybook.json`

#### Scenario: Extraction output format
- **WHEN** extraction completes for one URL
- **THEN** the JSON output follows this structure:
  ```json
  {
    "url": "https://...",
    "viewport": { "width": 1440, "height": 1600 },
    "elements": [
      {
        "label": "Hero Heading",
        "selector": ".hero h1",
        "category": "typography",
        "matches": 1,
        "styles": {
          "fontSize": "3rem",
          "fontWeight": "700",
          "fontFamily": "\"Inter\", sans-serif",
          "lineHeight": "1.2",
          "color": "rgb(17, 24, 39)"
        }
      },
      {
        "label": "Main Navigation",
        "selector": "nav.main-nav",
        "category": "layout",
        "matches": 1,
        "styles": {
          "display": "flex",
          "gap": "24px",
          "alignItems": "center"
        },
        "content": {
          "links": ["Home", "About", "Services", "Contact"]
        }
      }
    ]
  }
  ```

#### Scenario: Missing elements
- **WHEN** a selector from the spec matches zero elements on one page but matches on the other
- **THEN** the element is included with `"matches": 0` and empty `styles`
- **AND** this is flagged as a structural difference in the diff

#### Scenario: Multiple matches
- **WHEN** a selector matches multiple elements
- **THEN** the first match is extracted as representative
- **AND** `matches` records the total count (count difference = structural issue)

### Requirement: Extraction runs within existing Playwright session

#### Scenario: Session reuse
- **WHEN** a Playwright session is already open (from screenshot capture)
- **THEN** extraction reuses the same session via `-s=<session-name>`
- **AND** sets the correct viewport before extraction

---

## Phase 3: Structured Diff and AI Evaluation

### Requirement: Mechanical diff before AI evaluation

A deterministic diff SHALL be computed between the two extraction JSONs before the AI sees the results.

#### Scenario: Diff computation
- **GIVEN** `extraction-reference.json` and `extraction-storybook.json`
- **WHEN** the diff runs
- **THEN** for each element (matched by `label`):
  - Each style property is compared
  - Identical values are marked `match`
  - Different values are marked `mismatch` with both values
  - Missing elements are marked `missing`
  - Count differences are marked `count_mismatch`
- **AND** the diff is written to `extraction-diff.json`

#### Scenario: Diff output format
- **WHEN** the diff completes
- **THEN** the output follows:
  ```json
  {
    "summary": { "total": 12, "match": 9, "mismatch": 2, "missing": 1 },
    "elements": [
      {
        "label": "Hero Heading",
        "status": "mismatch",
        "diffs": {
          "fontSize": { "reference": "3rem", "storybook": "2.5rem", "status": "mismatch" },
          "fontWeight": { "reference": "700", "storybook": "700", "status": "match" },
          "color": { "reference": "rgb(17, 24, 39)", "storybook": "rgb(17, 24, 39)", "status": "match" }
        }
      },
      {
        "label": "Card Image",
        "status": "missing",
        "side": "storybook"
      }
    ]
  }
  ```

### Requirement: AI evaluates the structured diff

The AI SHALL receive the structured diff (not raw extraction data) and produce a severity assessment.

#### Scenario: AI evaluation input
- **WHEN** the AI evaluation runs
- **THEN** it receives:
  1. The `extraction-diff.json`
  2. The reference screenshot (for visual context)
  3. The Storybook screenshot (for visual context)
  4. Design tokens (if available from `design-tokens.yml`)

#### Scenario: AI severity classification
- **WHEN** the AI evaluates a mismatch
- **THEN** it classifies each as:

  | Severity | Meaning | Example |
  |----------|---------|---------|
  | `critical` | Fundamental design breakage | Missing hero section, wrong font family, navigation absent |
  | `major` | Visible design deviation | Font size off by >4px, wrong brand color, broken grid |
  | `minor` | Small deviation, likely acceptable | 1px rounding difference, slightly different line-height |
  | `info` | Notable but not an issue | Different fallback font in stack, extra wrapper div |

#### Scenario: AI does NOT re-extract
- **WHEN** the AI evaluation phase runs
- **THEN** the AI works only with the provided diff and screenshots
- **AND** it does NOT open Playwright or extract additional data
- **AND** its role is purely evaluative: classify severity, explain impact, suggest fixes

### Requirement: AI persists check result via _debo story check

After evaluation, the AI SHALL persist the markup comparison result to the DeboStory entity, using the same mechanism as `compare-screenshots`.

#### Scenario: Persist markup check result
- **WHEN** the AI completes severity evaluation for a breakpoint
- **THEN** it writes the result:
  ```bash
  _debo story check --scene ${scene} --json '{"breakpoint":"<breakpoint>","region":"markup","status":"pass|fail","issues":["Hero Heading fontSize 2.5rem vs 3rem","Card Image missing"]}'
  ```
- **AND** `status` is `pass` if no `critical` or `major` issues exist
- **AND** `status` is `fail` if any `critical` or `major` issue exists
- **AND** `issues` contains a human-readable summary per mismatch/missing element, derived from `extraction-diff.json`

#### Scenario: Issues reference extraction labels
- **WHEN** the AI writes the `issues` array
- **THEN** each issue references the element `label` from the extraction spec
- **AND** includes the concrete values (e.g., "Hero Heading fontSize: expected 3rem, got 2.5rem")
- **AND** `minor` and `info` issues are excluded from the array (they don't affect pass/fail)

### Requirement: Iterative refinement

The AI MAY request a second extraction round with a refined spec.

#### Scenario: Refinement trigger
- **WHEN** the initial diff shows mismatches in a specific area (e.g., "Card Grid has layout issues")
- **AND** the extraction spec did not include detailed child-element properties
- **THEN** the AI MAY generate a supplementary extraction spec targeting that area
- **AND** Phase 2 runs again with the supplementary spec only
- **AND** results are merged into the existing diff

#### Scenario: Refinement limit
- **WHEN** iterative refinement is used
- **THEN** at most 2 refinement rounds are allowed
- **AND** each round targets a specific area, not the entire page

---

## Integration with Existing Pipeline

### Requirement: compare-markup task delegates to three phases

The `compare-markup` task definition SHALL orchestrate the three phases sequentially.

#### Scenario: Task execution flow
- **WHEN** `compare-markup` runs for a scene + breakpoint
- **THEN** it executes:
  1. Phase 1 — AI inspects reference, writes `extraction-spec.yml`
  2. Phase 2 — Playwright extracts from both URLs, writes JSON
  3. Phase 3 — Diff is computed, AI evaluates, persists result via `_debo story check`

#### Scenario: Fallback without reference markup
- **WHEN** `hasMarkup` is not `true` on the reference source
- **THEN** `compare-markup` is skipped entirely (unchanged from current behavior)

### Requirement: Output consumed by polish task

The structured diff and severity assessment SHALL be available to the `polish` task.

#### Scenario: Polish reads extraction diff
- **WHEN** the `polish` task runs after `compare-markup`
- **THEN** it reads `extraction-diff.json` and the AI severity assessment
- **AND** it has actionable, specific issues to fix (e.g., "Hero Heading fontSize is 2.5rem, should be 3rem")
- **AND** it does not need to re-inspect the page to understand what's wrong

---

## File Artifacts

| File | Phase | Content |
|------|-------|---------|
| `extraction-spec.yml` | 1 | AI-generated extraction plan |
| `extraction-reference.json` | 2 | Computed styles from reference URL |
| `extraction-storybook.json` | 2 | Computed styles from Storybook URL |
| `extraction-diff.json` | 3 | Structured diff with match/mismatch/missing |
| `meta.yml` update | 3 | Pass/fail status + issues list (existing format) |
