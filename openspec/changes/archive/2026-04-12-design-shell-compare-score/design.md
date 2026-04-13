## Context

The design-shell and design-screen workflows currently delegate visual verification to a full design-verify child workflow (7 stages: intake → capture → compare-markup → compare → triage → polish → outtake). This is expensive for a first-pass quality check after initial component and scene creation.

The goal is to embed a lightweight capture + compare cycle directly into both workflows, reusing existing tasks, and replace the auto-launch of design-verify with a score-based diff summary in the outtake.

## Goals / Non-Goals

**Goals:**
- Give the user immediate visual quality feedback after scene creation
- Produce a numeric score per region so tooling (auto-research) can track improvement
- Reuse existing `capture` and `compare-screenshots` tasks unchanged
- Carry extracted design data (styles, fonts, content) directly as component params for better first-pass accuracy

**Non-Goals:**
- No new task files or rule files
- No triage or polish stages — the inline compare is observation-only
- No changes to the design-verify workflow itself
- No changes to the Storybook addon TypeScript code

## Decisions

### 1. Checks iterable: produced by a setup step between scene and capture

The `capture` and `compare` stages iterate over `checks` (breakpoint × region matrix). In design-verify, the intake creates the story entity and returns checks. Here, we need the same without a separate intake.

**Decision:** The outtake of the scene stage (or the scene task's done params) passes `reference` data. A new lightweight step `design-shell:setup-compare` between scene and capture calls `_debo story --scene <scene> --seed <meta-json>` to create the story entity and retrieve the checks array. This step returns `checks` as params for the capture/compare stages.

**Alternative considered:** Having the scene task also create the story entity. Rejected because the scene task (`create-scene--design-shell`) is about writing the scenes YAML — mixing in story entity creation conflates responsibilities.

**Alternative considered:** Hardcoding checks from breakpoints in intake. Rejected because checks include regions (full, header, footer) that depend on the scene structure, which isn't known until after scene creation.

### 2. Score formula: weighted severity sum

**Decision:** `score = critical × 3 + major × 2 + minor × 1` per region. Total score is the sum across all regions. Score of 0 means perfect visual match. This gives auto-research a single decreasing metric to optimize against.

**Alternative considered:** Percentage-based similarity score. Rejected because the compare-screenshots task outputs categorized issues, not a pixel diff — a weighted count is more natural.

### 3. Outtake reads draft JSON files directly

**Decision:** The outtake reads `designbook/stories/${storyId}/issues/draft/${breakpoint}--${region}.json` files that compare-screenshots already writes. No intermediate processing. The draft files are left in place (not cleaned up) so design-verify can reuse them if started afterward.

**Alternative considered:** Passing diffs through workflow params. Rejected because the draft JSON structure already contains everything needed (severity, description, file_hint).

### 4. Rich component params instead of separate `ref` field

**Decision:** The intake passes extracted design data directly as additional fields on each component param object — styles, fonts, content, nav items, etc. The workflow engine passes all params through regardless of what `create-component.md` declares in its `params:` frontmatter. No changes to `create-component.md` needed.

```json
{
  "component": "header",
  "slots": ["logo", "navigation", "actions"],
  "group": "Shell",
  "description": "ref=header — 2-row header: navy topbar + white nav row",
  "styles": {
    "row1": { "bg": "#00336a", "height": "48px", "padding": "0 1rem" },
    "row2": { "bg": "#ffffff", "height": "64px", "border-bottom": "1px solid #dee2e6" }
  },
  "fonts": { "heading": "Reef 100", "nav": "Sarabun 400" },
  "nav_items": ["Für Ausbildende", "Für Prüfende", "Themen", "Berufe"]
}
```

The AI executing `create-component` sees all these fields and has concrete values for colors, fonts, dimensions, and content — no re-interpretation of free-form Markdown needed.

**Alternative considered:** A separate `ref` object or per-component reference files. Rejected because the params ARE the reference — no indirection needed. The workflow engine passes all fields through without requiring declaration.

### 5. Shared outtake handles both workflows

**Decision:** The existing `outtake--design-screen.md` (already scoped to `[design-screen:outtake, design-shell:outtake]`) is extended with three behaviors:

1. If draft issue files exist → compute score table and display
2. Ask "Anything else you noticed?"
3. Ask "Start design-verify?" → if yes, launch as child workflow (existing behavior); if no, archive

This works for both design-shell (which will always have drafts after the new compare stage) and design-screen (same). If no drafts exist (e.g., capture/compare failed or was skipped), the outtake gracefully skips to step 2.

## Risks / Trade-offs

- **[Risk] Checks setup requires story entity creation** → The setup-compare step adds one extra CLI call but reuses the existing `_debo story --seed` mechanism. Mitigation: This is a lightweight metadata operation, not a capture.
- **[Risk] Draft files left behind after outtake** → If the user never runs design-verify, orphan draft files accumulate. Mitigation: They're small JSON files and design-verify's triage cleans them up. Acceptable trade-off for allowing design-verify to reuse the data.
- **[Risk] Score metric may not be stable across runs** → AI-based visual comparison can produce different issue counts. Mitigation: The score is directional (lower = better), not absolute. Auto-research should track trend, not exact value.

### 6. Design-verify runs full cycle, capture tasks auto-skip

**Decision:** When the outtake launches design-verify, it runs all stages normally — no `skip_capture` flag. The existing capture tasks already check whether screenshots are present and skip if they are (built-in skip condition: "exists and reference URL unchanged"). Since the inline compare already captured the screenshots, design-verify's capture stage marks tasks as done immediately without re-capturing.

This keeps design-verify's behavior unchanged and avoids special-casing.

### 7. Tasks ARE issues — eliminate the CLI issue layer

**Decision:** Remove the entire `_debo story issues` CLI roundtrip from design-verify. The current flow duplicates state:

```
compare → draft JSONs → triage → _debo story issues (publish to meta) → workflow params → polish tasks
                                        ↑ redundant ↑
```

The simplified flow:

```
compare → draft JSONs → triage (consolidate + pass as params) → polish tasks
```

What changes in each task:
- **triage**: Reads draft JSONs, consolidates, passes as `issues` params via `workflow done`. No `_debo story issues --add` / `--close` calls.
- **polish**: Fixes the code based on issue params. No `_debo story issues --update` call after fixing. The workflow task status (done) IS the issue status.
- **outtake (design-verify)**: Reads workflow task statuses to build the result table. No `_debo story issues --scene` call.

**Alternative considered:** Keep the CLI for Storybook panel display. Rejected because the workflow panel already shows task status — the issues tab in the panel can read draft JSONs directly if needed.

The `_debo story issues` CLI commands become dead code and can be removed from the addon.
