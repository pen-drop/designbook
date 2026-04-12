## Context

Design workflows (tokens, design-shell, design-screen) need to understand the reference source's visual structure — colors, fonts, layout patterns, component hierarchy — but currently have no structured mechanism. The AI either browses manually (unreliable) or guesses from the product vision text (inaccurate).

The Playwright-based DOM extraction pipeline already exists in `compare-markup` (design-verify) as a 3-phase approach: AI generates an extraction spec → Playwright extracts mechanically → AI evaluates the diff. However, this runs **after** components are built — too late. The extraction capability must be available **during each intake**, because each workflow targets different URLs and needs different structural aspects.

### Current intake behavior

| Intake | How it gets reference info today | Problem |
|--------|----------------------------------|---------|
| `tokens:intake` | AI reads vision.md, may browse URL manually | Guesses colors/fonts instead of extracting computed styles |
| `design-shell:intake` | Resolves reference URL (Step 1), then AI "analyzes structure" from screenshot | No DOM data — produces generic layouts instead of matching the reference |
| `design-screen:intake` | Resolves reference URL (Step 2), then AI "derives components from HTML structure" | No actual HTML extraction — AI imagines component structure |

### Existing extraction architecture

- **compare-markup task** (`.agents/skills/designbook/design/tasks/compare-markup.md`): 3-phase extraction with spec YAML → Playwright JSON → AI diff. Writes to `stories/{storyId}/extractions/`.
- **playwright-capture rule** (`.agents/skills/designbook/design/rules/playwright-capture.md`): Constraints for Playwright sessions (viewport 1600px, wait 3000ms, staged file flow).
- **provide-stitch-url rule** (`.agents/skills/designbook-stitch/rules/provide-stitch-url.md`): Resolves Stitch screen ID → preview URL + `hasMarkup: true/false`. Triggered during intake steps.

### Provider landscape

| Provider | hasMarkup | hasAPI | Extraction strategy |
|----------|-----------|--------|---------------------|
| Direct URL | true | false | Playwright DOM + computed styles |
| Stitch | true | true | Playwright DOM + computed styles (same as URL — Stitch serves HTML) |
| Figma (future) | false | true | Figma MCP API for nodes/styles |
| Image only | false | false | AI vision analysis of screenshot |

## Goals / Non-Goals

**Goals:**
- Provide each design intake with structured, machine-readable reference data (DOM structure, computed styles, navigation items, content patterns) extracted from the actual reference source
- Reuse the proven Playwright extraction pattern from compare-markup, adapted for intake-time focus modes
- Support provider-agnostic extraction: strategy selected by provider capabilities (`hasMarkup`, `hasAPI`), not by provider identity
- Each intake invokes extraction independently with its own URL and focus — no shared pre-extraction step

**Non-Goals:**
- Replacing the compare-markup extraction pipeline in design-verify (it continues to use its own comparison-focused extraction)
- Supporting Figma or other API-based providers in the initial implementation (architecture supports it, but only Playwright path is implemented now)
- Extracting every possible style from the page — focus modes intentionally scope what gets extracted
- Modifying the provider rule interface (provide-stitch-url pattern stays unchanged)

## Decisions

### Decision 1: Extraction as a context rule, not a task

**Choice:** A new rule file `extract-reference.md` under `.agents/skills/designbook/design/rules/` that provides structured reference data to any intake task that has a reference URL.

**Why not a separate task?** Extraction is a prerequisite for intake decisions, not an independent unit of work. The intake task needs extraction output to make informed choices (colors, layout, components). Making it a rule means it activates automatically when `when.steps` matches the intake step, and the AI uses it as context — the same pattern as `playwright-capture.md` or `vision-context.md`.

**Why not modify compare-markup?** compare-markup extracts for a different purpose (post-build comparison with severity classification). Intake extraction needs different focus, different output format (no diff), and targets different URLs. Sharing the spec YAML format is enough — no need to share the task.

**Alternative considered:** A shared extraction library/utility. Rejected because the skill system operates through markdown instructions, not shared code modules. The extraction spec YAML format IS the shared interface.

### Decision 2: Three focus modes sharing one extraction spec format

**Choice:** The extraction rule supports three focus modes that determine which elements and properties to extract:

| Focus | Used by | What it extracts |
|-------|---------|------------------|
| `styles` | tokens:intake | Global computed styles: colors used across the page, font families, font sizes, spacing values, border radii. Targets `body`, headings (h1-h6), links, buttons, containers. |
| `structure` | design-shell:intake | Shell landmarks: header, nav, footer, content area. Navigation items (labels + links). Component hierarchy within landmarks. Layout patterns (flex/grid). |
| `content` | design-screen:intake | Content area patterns: sections, grids, cards, lists, hero areas. Content types and their visual treatment. Component boundaries within the content region. |

All three use the same extraction spec YAML format from compare-markup (elements with selector, label, category, extract properties). The focus mode determines which elements the AI includes in the spec and which CSS properties are listed in `extract`.

**Why not one exhaustive extraction?** Different intakes need different things. tokens:intake doesn't need navigation items. design-shell:intake doesn't need content section patterns. Focused extraction is faster (fewer elements to query) and produces cleaner output for the consuming intake.

**Alternative considered:** Letting each intake define its own ad-hoc extraction. Rejected because the Playwright execution logic would be duplicated three times. The rule centralizes the mechanical extraction while letting the focus parameter scope the AI's spec generation.

### Decision 3: Extraction output as structured JSON (not spec YAML)

**Choice:** The extraction rule outputs a single JSON file that the intake task reads. The extraction spec YAML is an intermediate artifact (may be persisted for debugging, but the intake consumes the JSON).

Output path: `$DESIGNBOOK_DATA/design-system/extractions/{focus}--{url-hash}.json`

Format follows the existing `extraction-reference.json` schema from compare-markup:

```json
{
  "url": "https://leando.de/",
  "viewport": { "width": 1440, "height": 1600 },
  "focus": "structure",
  "elements": [
    {
      "label": "Site Header",
      "selector": "app-site-header",
      "category": "layout",
      "matches": 1,
      "styles": {
        "display": "block",
        "backgroundColor": "rgb(236, 236, 236)"
      },
      "content": {
        "links": ["Startseite", "Mein LEANDO", "Suche"]
      },
      "children": [
        {
          "label": "BIBB Logo Bar",
          "selector": ".topbar",
          "styles": { "backgroundColor": "rgb(236, 236, 236)", "height": "40px" }
        }
      ]
    }
  ]
}
```

**Extension over compare-markup format:** Added `children` array for nested element extraction (essential for `structure` and `content` focus to capture component hierarchy). Also added `focus` field to identify the extraction mode.

**Why not reuse the spec YAML directly?** The spec YAML describes WHAT to extract (selectors + properties). The JSON describes WHAT WAS FOUND (actual values). Intakes need the found values, not the extraction plan.

### Decision 4: Provider-agnostic strategy selection

**Choice:** The extraction rule reads provider capabilities from the reference source metadata (set by provider rules like `provide-stitch-url.md`) and selects the extraction strategy:

```
IF hasMarkup == true:
  → Playwright extraction (Phase 1: AI generates spec, Phase 2: Playwright executes)
ELSE IF hasAPI == true:
  → Provider MCP API extraction (future: Figma nodes/styles → same JSON output format)
ELSE:
  → AI vision analysis (screenshot → AI describes structure → same JSON output format)
```

The output JSON format is identical regardless of strategy. Consuming intake tasks don't know or care which strategy was used.

**Why this order?** Playwright extraction produces the most accurate data (actual computed styles). API extraction is next-best (design-time values, may differ from rendered). Vision analysis is the fallback (AI interpretation, least reliable).

**Provider rule interface (unchanged):**
- `reference.url` — the URL to extract from
- `reference.hasMarkup` — whether the source serves inspectable HTML
- `reference.hasAPI` — whether a provider MCP API is available (new field, optional, defaults to false)

### Decision 5: Per-intake invocation, not cached across workflows

**Choice:** Each intake invokes extraction independently, even if multiple intakes target the same URL. No cross-workflow caching.

**Why?** 
1. Different focus modes extract different things — a `styles` extraction is not useful for `structure` intake
2. The reference page may change between workflow runs
3. Simplicity — no cache invalidation logic needed
4. Extraction is fast (single Playwright session, ~5s per page)

**When same-URL extraction IS reused:** Within a single workflow run, if the same URL + focus combination is requested again, the rule MAY skip re-extraction and read the existing JSON. This handles the case where design-screen runs for multiple sections that share a reference URL with the same focus.

### Decision 6: Intake task modifications are minimal

**Choice:** Each intake task gets a small addition to its reference resolution step: "After resolving the reference URL, invoke the extraction rule with the appropriate focus. Read the extraction JSON before proceeding to subsequent steps."

The intake tasks are NOT rewritten. They continue to ask the user for preferences and make design decisions. The difference is that their decisions are now informed by actual extracted data instead of guesses.

Specific changes per intake:

| Intake | Current Step | Change |
|--------|-------------|--------|
| `tokens:intake` | Step 2 (Choose Colors) | Read `styles` extraction JSON. Use extracted color values as the starting palette instead of guessing from vision.md. |
| `tokens:intake` | Step 3 (Choose Typography) | Read `styles` extraction JSON. Use extracted font families and size scale instead of suggesting random Google Fonts. |
| `design-shell:intake` | Step 2 (Analyze Layout) | Read `structure` extraction JSON. Derive header/nav/footer structure from actual DOM landmarks instead of proposing generic options. |
| `design-shell:intake` | Step 3 (Plan Components) | Use `structure` extraction to determine exact component list from reference HTML structure. |
| `design-screen:intake` | Step 3 (Determine Screens) | Read `content` extraction JSON. Use content patterns to determine screen layout. |
| `design-screen:intake` | Step 5 (Plan Components) | Use `content` extraction to derive component list from actual reference content structure. |

## Risks / Trade-offs

**[Playwright availability]** → Playwright must be installed in the workspace. Mitigation: It's already a dependency for design-verify. The extraction rule reuses the same Playwright installation. For workspaces without Playwright (pure design-token work), the vision-fallback strategy handles it.

**[Angular SPA rendering]** → Sites like leando.de are Angular SPAs. The DOM may not be fully rendered at `networkidle`. Mitigation: The existing `waitForTimeout(3000)` from playwright-capture.md handles most SPA rendering. The extraction spec generation (Phase 1) happens after visual inspection of the screenshot — if the DOM looks incomplete, the AI can increase the wait or trigger navigation.

**[Extraction accuracy depends on AI spec quality]** → If the AI generates poor selectors in Phase 1, the extraction JSON will be incomplete. Mitigation: This is the same risk as compare-markup, which has been validated. Focus modes help by narrowing what the AI needs to target. The intake task can also ask for clarification if extraction data seems incomplete.

**[hasAPI field is new and unused initially]** → Adding `hasAPI` to the provider interface without an implementation creates a placeholder. Mitigation: The field is optional and defaults to false. Provider rules that don't set it behave exactly as before. The Figma implementation can add it when ready.

**[Extraction adds time to intake]** → Each intake now waits for a Playwright extraction (~5-10s). Mitigation: This replaces manual browsing by the AI which takes longer and produces worse results. Net time savings expected.
