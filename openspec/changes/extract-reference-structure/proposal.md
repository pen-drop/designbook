## Why

Design workflows (tokens, design-shell, design-screen) need to understand the reference source's visual structure — colors, fonts, layout patterns, component hierarchy — but currently have no reliable, provider-agnostic mechanism to do so. The AI either uses browser extensions (unreliable, session-dependent) or guesses from the product vision text. The Playwright-based DOM extraction pipeline already exists in `compare-markup` (design-verify), but it runs **after** components are built — too late. The extraction must happen **in each intake**, because each workflow targets different URLs and needs different aspects of the reference.

## What Changes

- Add a provider-agnostic `extract-reference` rule that each design intake can invoke with a specific URL and extraction focus
- The extraction strategy adapts to the reference provider:
  - `hasMarkup: true` (URL, Stitch) → Playwright DOM + computed styles extraction
  - `hasMarkup: false` + design tool API (Figma, future) → provider MCP for nodes/styles
  - `hasMarkup: false` + image only → AI vision analysis of screenshot
- Each intake calls the extraction for **its specific URLs** with a **specific focus**:
  - `tokens:intake` → global styles focus (colors, fonts, sizes, spacing) from the design reference URL
  - `design-shell:intake` → structural focus (header, nav, footer landmarks, component hierarchy, navigation items) from the shell reference URL
  - `design-screen:intake` → content focus (sections, grids, cards, content patterns) from **the section-specific URL** (e.g. homepage vs. article page — each section may have a different reference URL)
- Provider rules (existing `provide-stitch-url.md` pattern) resolve the reference source to a URL + capabilities (`hasMarkup`, `hasAPI`) — the extraction rule consumes these
- The extraction output is a structured JSON that the intake task reads to drive its decisions instead of guessing

## Capabilities

### New Capabilities
- `reference-extraction`: Provider-agnostic reference extraction invoked per-intake with a specific URL and focus. Adapts strategy based on provider capabilities (Playwright for markup sources, MCP API for design tools, AI vision for images). Produces structured JSON with DOM structure, computed styles, navigation, and content patterns — scoped to what the calling intake needs.

### Modified Capabilities
- `tailwind-css-tokens`: `tokens:intake` uses extraction output (global computed styles) as primary input for primitive color palette and font discovery instead of relying on AI browsing the URL.
- `browser-inspect`: Extend the Playwright extraction to support focus-based extraction modes (`styles`, `structure`, `content`) in addition to the existing `comparison` mode used by design-verify.

## Impact

- `.agents/skills/designbook/design/rules/` — new `extract-reference.md` rule with focus-based extraction logic
- `.agents/skills/designbook/tokens/tasks/intake--tokens.md` — invokes extraction with `focus: styles`
- `.agents/skills/designbook/design/tasks/intake--design-shell.md` — invokes extraction with `focus: structure`
- `.agents/skills/designbook/design/tasks/intake--design-screen.md` — invokes extraction with `focus: content` per section URL
- Provider rules (`provide-stitch-url.md`, future `provide-figma-url.md`) — unchanged interface, extraction rule consumes their output
- No changes to design-verify compare-markup — it continues to use its own extraction pipeline for post-build comparison
