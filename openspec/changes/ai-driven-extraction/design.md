## Context

The `compare-markup` task runs during the `compare` step of the `design-verify` workflow. It receives a `scene` param (e.g., `home:landing`) and iterates over breakpoints. For each breakpoint it opens the reference URL and Storybook URL, extracts data, compares, and writes the result to `_debo story check`.

Currently this is one monolithic AI pass — the AI opens Playwright, decides what to inspect on the fly, extracts values, and compares. The output is unstructured text that the `polish` task must interpret.

The `compare-screenshots` task (sibling in the same step) already uses `_debo story check` with structured `issues` arrays. The `browser-inspect` spec defines the Playwright session management pattern (`-s=<session-name>`).

## Goals / Non-Goals

**Goals:**
- Separate mechanical extraction from AI judgment
- AI decides WHAT to inspect (Phase 1) based on page context
- Playwright measures deterministically (Phase 2)
- AI evaluates structured diff (Phase 3) with severity classification
- Extraction spec persisted as reusable YAML artifact
- Structured diff consumable by `polish` task without re-inspection

**Non-Goals:**
- Building a generic extraction framework or library
- Changing the `compare-screenshots` task
- Modifying the `design-verify` workflow structure
- Real-time / interactive inspection from the Storybook panel

## Decisions

### Decision 1: Three-phase execution model

```
Phase 1: AI → extraction-spec.yml
         AI sees reference screenshot + DOM summary
         AI writes YAML declaring elements + properties to extract

Phase 2: Playwright → extraction-{reference,storybook}.json
         Reads extraction-spec.yml
         querySelectorAll + getComputedStyle on both URLs
         Pure measurement, no AI judgment

Phase 3: Diff → AI evaluation → _debo story check
         Mechanical diff of the two JSONs
         AI classifies severity per mismatch
         Writes pass/fail + issues via _debo story check
```

The key insight: the AI is good at deciding what matters (Phase 1) and evaluating meaning (Phase 3), but bad at precise CSS value extraction (Phase 2). Playwright is perfect for Phase 2 but can't decide what's important.

### Decision 2: Extraction spec format

```yaml
elements:
  - selector: ".hero-section h1"
    label: "Hero Heading"
    category: typography
    extract: [fontSize, fontWeight, fontFamily, lineHeight, color]

  - selector: "nav.main-nav"
    label: "Main Navigation"
    category: layout
    extract: [display, gap, alignItems]
    content_check: true

  - selector: ".card-grid"
    label: "Card Grid"
    category: layout
    extract: [display, gridTemplateColumns, gap]
    match_children: true
```

The AI generates this after inspecting the reference. Fields:
- `selector`: CSS selector scoped to visible content (not Storybook chrome)
- `label`: human-readable name used in diff output and issues
- `category`: one of `typography`, `interactive`, `layout`, `media`, `decoration`
- `extract`: list of CSS computed style property names relevant to the element's role
- `content_check` (optional): also extract text content, link labels, image sources
- `match_children` (optional): extract styles from direct children too

The AI prefers class-based/landmark selectors over generic tag selectors.

### Decision 3: Extraction JSON format

```json
{
  "url": "https://...",
  "viewport": { "width": 1440, "height": 1600 },
  "elements": [
    {
      "label": "Hero Heading",
      "selector": ".hero-section h1",
      "category": "typography",
      "matches": 1,
      "styles": {
        "fontSize": "3rem",
        "fontWeight": "700",
        "color": "rgb(17, 24, 39)"
      }
    }
  ]
}
```

One JSON per URL. `matches` records how many elements the selector found (0 = missing, >1 = count noted, first extracted as representative).

### Decision 4: Diff format

```json
{
  "summary": { "total": 12, "match": 9, "mismatch": 2, "missing": 1 },
  "elements": [
    {
      "label": "Hero Heading",
      "status": "mismatch",
      "diffs": {
        "fontSize": { "reference": "3rem", "storybook": "2.5rem", "status": "mismatch" },
        "fontWeight": { "reference": "700", "storybook": "700", "status": "match" }
      }
    }
  ]
}
```

Deterministic, mechanical diff. Each element matched by `label`. Statuses: `match`, `mismatch`, `missing`, `count_mismatch`.

### Decision 5: Severity classification

| Severity | Pass/Fail | Meaning |
|----------|-----------|---------|
| `critical` | fail | Fundamental breakage (missing section, wrong font family, nav absent) |
| `major` | fail | Visible deviation (font size >4px off, wrong brand color, broken grid) |
| `minor` | pass | Small deviation (1px rounding, slight line-height difference) |
| `info` | pass | Notable but acceptable (different fallback font, extra wrapper) |

Only `critical` and `major` issues cause `status: "fail"` in `_debo story check`.

### Decision 6: _debo story check integration

```bash
_debo story check --scene ${scene} --json '{"breakpoint":"xl","region":"markup","status":"fail","issues":["Hero Heading fontSize: expected 3rem, got 2.5rem","Card Image missing"]}'
```

Same mechanism as `compare-screenshots`. Issues reference element labels from the extraction spec with concrete values. `minor` and `info` issues excluded from the array.

### Decision 7: Iterative refinement (optional)

After Phase 3, if the AI sees mismatches in an area that wasn't deeply inspected, it MAY generate a supplementary extraction spec targeting that area and run Phase 2 again. Maximum 2 refinement rounds. Each round targets a specific area, not the entire page.

### Decision 8: Spec reuse on re-run

When `compare-markup` re-runs for the same scene+breakpoint and `extraction-spec.yml` already exists, the AI MAY reuse or refine it. If modified, a new version is written.

## Risks / Trade-offs

- **[AI spec quality]** → The extraction spec is only as good as the AI's understanding of the page. Mitigation: the spec is visible and can be manually refined. Iterative refinement (Decision 7) lets the AI drill deeper on problem areas.
- **[Selector brittleness]** → Class-based selectors may break if the reference changes. Acceptable — the spec is regenerated per run when needed.
- **[Extra files]** → Four new files per breakpoint. Acceptable — they're workflow artifacts in a step output directory, not committed to the repo.
