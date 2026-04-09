# AI-Driven Extraction for Markup Comparison

Replaces the static, hard-coded element inspection in `compare-markup` with a three-phase approach: AI generates an extraction spec, Playwright executes it mechanically, AI evaluates and writes structured checks to `meta.yml`.

## Changes (2026-04-09)

- **Removed** `extraction-diff.json` as separate artifact — diff results written as structured issues to `meta.yml`
- **Added** `extractions/` directory under story path for raw extraction artifacts
- **Added** unified issue model: both `compare-screenshots` and `compare-markup` write issues to `meta.yml`
- **Added** issue lifecycle: `status: open` → polish resolves → `status: done` with `result: pass|fail`
- **Updated** polish: reads issues from `meta.yml`, works through all `open` issues regardless of source
- **Updated** verify: re-compares, confirms resolution, writes final result per issue
- **Added** CLI `story issues`: separate command for adding, reading, and updating issues
- **Updated** CLI `story check`: gains `status` (open/done) and `result` (pass/fail) fields
- **Separated** checks (container, breakpoint/region) from issues (individual problems) as distinct CLI concepts

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

## Phase 3: Diff, Evaluation, and Check Writing

### Requirement: Mechanical diff of extraction results

A deterministic diff SHALL be computed between the two extraction JSONs.

#### Scenario: Diff computation
- **GIVEN** `extraction-reference.json` and `extraction-storybook.json`
- **WHEN** the diff runs
- **THEN** for each element (matched by `label`):
  - Each style property is compared
  - Identical values → `match`
  - Different values → `mismatch` with both values
  - Missing elements → `missing`
  - Count differences → `count_mismatch`

### Requirement: AI evaluates the diff and classifies severity

The AI SHALL receive the computed diff and produce a severity assessment.

#### Scenario: AI evaluation input
- **WHEN** the AI evaluation runs
- **THEN** it receives:
  1. The computed diff (in memory, not a separate file)
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

### Requirement: Check and issues written via CLI

After evaluation, the AI SHALL use the CLI to create a check and add issues. Checks and issues are separate CLI concepts.

#### Scenario: Create check and add issues
- **WHEN** the AI completes severity evaluation for a breakpoint
- **THEN** it creates the check:
  ```bash
  _debo story check --scene ${scene} --json '{"breakpoint":"<breakpoint>","region":"markup","status":"open"}'
  ```
- **AND** adds issues to that check:
  ```bash
  _debo story issues --scene ${scene} --check <breakpoint>--markup --add --json '[
    {"source":"extraction","severity":"major","label":"Hero Heading","category":"typography","property":"fontSize","expected":"3rem","actual":"2.5rem"},
    {"source":"extraction","severity":"critical","label":"Card Image","category":"media","property":null,"expected":"present","actual":"missing"}
  ]'
  ```
- **AND** only `critical` and `major` issues are added (minor/info are dropped)

#### Scenario: Check lifecycle
- **WHEN** a check is created with `status: open`
- **THEN** it remains `open` until verify closes it
- **WHEN** verify completes
- **THEN** it updates the check: `status: done`, `result: pass|fail`

#### Scenario: Issues reference extraction labels
- **WHEN** the AI writes issues
- **THEN** each issue references the element `label` from the extraction spec
- **AND** includes concrete values (`expected`, `actual`)
- **AND** includes `category` and `severity` for prioritization

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
  1. Phase 1 — AI inspects reference, writes `extractions/{bp}--spec.yml`
  2. Phase 2 — Playwright extracts from both URLs, writes `extractions/{bp}--reference.json` and `{bp}--storybook.json`
  3. Phase 3 — Diff is computed in memory, AI evaluates, creates check via `story check` (open), adds issues via `story issues --add`

#### Scenario: Fallback without reference markup
- **WHEN** `hasMarkup` is not `true` on the reference source
- **THEN** `compare-markup` is skipped entirely (unchanged from current behavior)

### Requirement: Polish stage iterates over issues

The `design-verify` workflow SHALL use `each: issues` for the polish stage.

#### Scenario: Workflow structure
- **GIVEN** the design-verify workflow
- **THEN** it uses:
  ```yaml
  test:
    each: checks                # capture + compare per breakpoint/region
    steps: [capture, compare]
  polish:
    each: issues                # polish + recapture + verify per issue
    steps: [polish, recapture, verify]
  ```
- **AND** `story issues --open` provides the iteration items for the polish stage
- **AND** each issue gets its own polish → recapture → verify cycle

### Requirement: Polish consumes issues via CLI

The `polish` task SHALL read issues via CLI — never by reading meta.yml directly.

#### Scenario: Polish reads open issues
- **WHEN** the `polish` task runs for a breakpoint/region
- **THEN** it reads open issues via:
  ```bash
  _debo story issues --scene ${scene} --check ${breakpoint}--${region} --open
  ```
- **AND** the response contains structured issues with actionable details (label, property, expected, actual, severity)
- **AND** it processes issues from all sources (screenshots, extraction) uniformly

#### Scenario: Polish updates issues
- **WHEN** the `polish` task fixes an issue
- **THEN** it updates the issue via:
  ```bash
  _debo story issues --scene ${scene} --check ${breakpoint}--${region} --update <index> --json '{"status":"done"}'
  ```
- **WHEN** the `polish` task cannot fix an issue
- **THEN** it leaves the issue as `status: open` for verify to evaluate

### Requirement: Verify confirms issue resolution via CLI

The `verify` task SHALL re-compare after polish and write final results via CLI.

#### Scenario: Verify re-evaluates
- **WHEN** the `verify` task runs after recapture
- **THEN** it re-compares screenshots and/or re-runs extraction diff
- **AND** for each issue, it writes the result via:
  ```bash
  _debo story issues --scene ${scene} --check ${breakpoint}--${region} --update <index> --json '{"status":"done","result":"pass|fail"}'
  ```

#### Scenario: Verify closes the check
- **WHEN** all issues for a check have been evaluated
- **THEN** verify closes the check:
  ```bash
  _debo story check --scene ${scene} --json '{"breakpoint":"<breakpoint>","region":"<region>","status":"done","result":"pass|fail"}'
  ```
- **AND** `result` is `pass` if all issues have `result: pass`
- **AND** `result` is `fail` if any issue has `result: fail`

---

## Unified Issue Model

Checks and issues are separate CLI concepts. A **check** is a container (breakpoint/region) with a lifecycle status. **Issues** are individual problems within a check. Both `compare-screenshots` and `compare-markup` create issues using the same format.

### Check format

```json
{
  "breakpoint": "xl",
  "region": "header|markup",
  "status": "open|done",
  "result": "pass|fail (set by verify, null while open)"
}
```

### Issue format

```json
{
  "source": "screenshots|extraction",
  "severity": "critical|major",
  "description": "Human-readable summary",
  "label": "Element label (extraction only)",
  "category": "typography|layout|media|interactive|decoration",
  "property": "CSS property name or null",
  "expected": "expected value",
  "actual": "actual value",
  "status": "open|done",
  "result": "pass|fail (set by verify, null while open)"
}
```

### Lifecycle

```
compare  → story check (status: open) + story issues --add
polish   → story issues --open (read), story issues --update (mark done)
recapture → re-captures screenshots
verify   → story issues --update (result: pass|fail), story check (status: done)
```

### CLI commands

```bash
# --- CHECKS ---
# Create check (compare step)
_debo story check --scene ${scene} --json '{"breakpoint":"xl","region":"header","status":"open"}'

# List checks
_debo story --scene ${scene} checks
_debo story --scene ${scene} --checks-open checks

# Close check (verify step)
_debo story check --scene ${scene} --json '{"breakpoint":"xl","region":"header","status":"done","result":"pass"}'

# --- ISSUES ---
# Add issues to a check (compare step)
_debo story issues --scene ${scene} --check xl--header --add --json '[
  {"source":"screenshots","severity":"major","description":"Header diff 4.2% exceeds threshold 3%"},
  {"source":"extraction","severity":"major","label":"Hero Heading","property":"fontSize","expected":"3rem","actual":"2.5rem"}
]'

# Read issues (polish step)
_debo story issues --scene ${scene}                         # all issues
_debo story issues --scene ${scene} --check xl--header      # for one check
_debo story issues --scene ${scene} --open                  # only open

# Update issue (polish/verify step)
_debo story issues --scene ${scene} --check xl--header --update 0 --json '{"status":"done","result":"pass"}'
```

---

## File Artifacts

| File | Location | Content |
|------|----------|---------|
| `extraction-spec.yml` | `extractions/{bp}--spec.yml` | AI-generated extraction plan |
| `extraction-reference.json` | `extractions/{bp}--reference.json` | Computed styles from reference URL |
| `extraction-storybook.json` | `extractions/{bp}--storybook.json` | Computed styles from Storybook URL |
| `meta.yml` | `stories/{storyId}/meta.yml` | Issues, check status, and results |

All extraction files live under `stories/{storyId}/extractions/` and are gitignored (workflow artifacts).
Screenshots continue to live under `stories/{storyId}/screenshots/`.
