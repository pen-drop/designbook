---
when:
  steps: [screenshot, visual-compare]
---

# DevTools Context Collection

Collects extra rendering context via Chrome DevTools MCP to enrich visual comparison with actual computed values.

## Prerequisites

- Chrome DevTools MCP server must be configured in `.mcp.json` as `devtools`
- Storybook must be running and accessible

## Availability Check

Before executing any DevTools step, verify that `mcp__devtools__*` tools are available. If the DevTools MCP server is not configured or not responding:

> ⚠️ **DevTools MCP not available.** Computed style collection is skipped — visual comparison will rely on screenshots only. For precise token compliance checking, configure the DevTools MCP server in `.mcp.json`.

Display this warning visibly to the user. Do not silently skip.

## What to Collect

When DevTools MCP is available, collect the following context after the Storybook page has been screenshotted:

1. **Navigate** to the Storybook iframe URL via `mcp__devtools__navigate_page`
2. **DevTools screenshot** via `mcp__devtools__take_screenshot` — pixel-accurate rendering (captures fonts, shadows that Playwright may miss)
3. **Computed styles** via `mcp__devtools__evaluate_script` — extract `getComputedStyle()` values for semantic elements (`header`, `footer`, `main`, `nav`, `h1`–`h4`, `p`, `a`, `button`, containers, grids, sections, heroes, cards). Collect: colors, fonts (family, size, weight, line-height), spacing (padding, margin, gap), layout (display, grid-template-columns, max-width, dimensions)
4. **DOM snapshot** via `mcp__devtools__take_snapshot` — full DOM tree for structural comparison
5. **Console errors** — check for `.sb-errordisplay` or error-class elements in the DOM
6. **Accessibility quick check** — scan for images without `alt`, buttons/links without accessible text, missing landmarks (`header`, `main`, `footer`, `nav`), invisible text

## How to Use in Visual Compare

Compare collected computed values against design tokens:

| Token | Expected | Computed | Match |
|-------|----------|----------|-------|
| `color.primary` | `#004fa8` | from computed colors | ✓/✗ |
| `typography.heading` | `Inter` | from computed fonts | ✓/✗ |
| `layout-width.xl` | `1280px` | from computed layout | ✓/✗ |

Report any:
- Color mismatches vs. design tokens
- Font mismatches vs. design tokens
- Accessibility violations
- Console errors
- Missing DOM elements vs. reference
