## Context

The `compare-markup` task runs during the `compare` step of the `design-verify` workflow. It receives a `scene` param (e.g., `home:landing`) and iterates over breakpoints. For each breakpoint it opens the reference URL and Storybook URL, extracts data, compares, and writes the result to `_debo story check`.

Currently this is one monolithic AI pass — the AI opens Playwright, decides what to inspect on the fly, extracts values, and compares. The output is unstructured text that the `polish` task must interpret.

The `compare-screenshots` task (sibling in the same step) already uses `_debo story check` with structured `issues` arrays. The `browser-inspect` spec defines the Playwright session management pattern (`-s=<session-name>`).

## Changes (2026-04-09)

- Replaced `extraction-diff.json` with unified issue model
- Checks and issues are separate CLI concepts: `story check` (container) vs `story issues` (individual problems)
- All read/write goes through CLI — tasks never touch meta.yml directly
- Issues have a lifecycle: `open` → `done` with `result: pass|fail`
- Added `extractions/` directory under story path
- Polish reads issues via `story issues --open`, updates via `story issues --update`
- Verify re-evaluates, updates issues, closes check

## Goals / Non-Goals

**Goals:**
- Separate mechanical extraction from AI judgment
- AI decides WHAT to inspect (Phase 1) based on page context
- Playwright measures deterministically (Phase 2)
- AI evaluates structured diff (Phase 3) with severity classification
- Extraction spec persisted as reusable YAML artifact
- **Checks and issues as separate CLI concepts**: checks are containers, issues are individual problems
- **All operations via CLI**: tasks use `story check`, `story issues`, `story checks` — never read/write meta.yml directly
- **Issue lifecycle**: compare creates `open` issues → polish resolves → verify confirms with `pass|fail`

**Non-Goals:**
- Building a generic extraction framework or library
- Changing the `compare-screenshots` task logic (but it adopts the same issue format)
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

Phase 3: Diff → AI evaluation → check + issues via CLI
         Mechanical diff of the two JSONs (in memory)
         AI classifies severity per mismatch
         Creates check via story check, adds issues via story issues
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
- `label`: human-readable name used in issues
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

### Decision 4: Checks and issues are separate CLI concepts

**Checks** = containers at breakpoint/region level, with lifecycle status.
**Issues** = individual problems within a check, with their own status and result.

```bash
# Checks
_debo story check --scene ${scene} --json '{"breakpoint":"xl","region":"header","status":"open"}'
_debo story --scene ${scene} checks
_debo story --scene ${scene} --checks-open checks
_debo story check --scene ${scene} --json '{"breakpoint":"xl","region":"header","status":"done","result":"pass"}'

# Issues
_debo story issues --scene ${scene} --check xl--header --add --json '[...]'
_debo story issues --scene ${scene} --check xl--header
_debo story issues --scene ${scene} --open
_debo story issues --scene ${scene} --check xl--header --update 0 --json '{"status":"done","result":"pass"}'
```

Tasks never read/write meta.yml directly — all access goes through these CLI commands.

### Decision 5: Issue lifecycle

```
compare  → story check (status: open) + story issues --add
polish   → story issues --open (read), story issues --update (mark done)
recapture → re-captures screenshots
verify   → story issues --update (result: pass|fail), story check (status: done)
```

- Compare creates a check with `status: open` and adds issues
- Polish reads open issues, fixes what it can, marks fixed issues as `status: done`
- Verify re-evaluates after recapture, writes `result: pass|fail` per issue, closes the check
- Only `critical` and `major` issues become issues (minor/info are dropped)

### Decision 6: Severity classification

| Severity | Meaning |
|----------|---------|
| `critical` | Fundamental breakage (missing section, wrong font family, nav absent) |
| `major` | Visible deviation (font size >4px off, wrong brand color, broken grid) |
| `minor` | Small deviation — dropped, not written as issue |
| `info` | Notable but acceptable — dropped, not written as issue |

### Decision 7: Storage layout

```
stories/{storyId}/
  meta.yml                                    ← checks + issues (via CLI only)
  screenshots/
    reference/{bp}--{region}.png              ← baseline (committed)
    current/{bp}--{region}.png                ← latest capture (gitignored)
  extractions/
    {bp}--spec.yml                            ← extraction plan
    {bp}--reference.json                      ← reference measurements
    {bp}--storybook.json                      ← storybook measurements
```

Extraction files follow the same `{bp}--{name}` naming convention as screenshots. The `extractions/` directory is gitignored (workflow artifacts).

### Decision 8: Iterative refinement (optional)

After Phase 3, if the AI sees mismatches in an area that wasn't deeply inspected, it MAY generate a supplementary extraction spec targeting that area and run Phase 2 again. Maximum 2 refinement rounds. Each round targets a specific area, not the entire page.

### Decision 9: Spec reuse on re-run

When `compare-markup` re-runs for the same scene+breakpoint and `extraction-spec.yml` already exists, the AI MAY reuse or refine it. If modified, a new version is written.

## Risks / Trade-offs

- **[AI spec quality]** → The extraction spec is only as good as the AI's understanding of the page. Mitigation: the spec is visible and can be manually refined. Iterative refinement (Decision 8) lets the AI drill deeper on problem areas.
- **[Selector brittleness]** → Class-based selectors may break if the reference changes. Acceptable — the spec is regenerated per run when needed.
- **[Extra files]** → Three new files per breakpoint in `extractions/`. Acceptable — they're workflow artifacts, gitignored.
- **[CLI extension]** → New `story issues` command. The `story check` interface changes minimally (gains `status`/`result` fields).
