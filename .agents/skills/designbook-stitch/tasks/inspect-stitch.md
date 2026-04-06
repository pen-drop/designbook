---
name: designbook-stitch:inspect-stitch
priority: 30
when:
  steps: [inspect]
  extensions: stitch
requires: [inspect]
params:
  scene: ~
files: []
---

# Inspect Stitch

> **Requires an active Playwright session from the inspect step.** If no session is available, start one first via `npx playwright-cli -s=inspect open <url>`.

Extracts structured data from the Stitch design screen for comparison alongside Storybook inspect data. This is an additive task — it runs after `inspect-storybook` in the same step.

## Prerequisites

- The playwright-cli session (`-s=inspect`) is already open from `inspect-storybook`
- Stitch screen data is accessible via MCP

## Execution

1. **Resolve the Stitch screen URL**
   Read the scene's `reference` array. Find the entry with `type: stitch` and extract the screen ID.
   ```
   mcp__stitch__get_screen({ screenId: "<id>" })
   ```

2. **Navigate to Stitch preview** (reusing the inspect session)
   If the Stitch screen has an `htmlCode.downloadUrl`:
   ```bash
   npx playwright-cli -s=inspect open <stitch-preview-url>
   ```

3. **Extract CSS custom properties**
   ```bash
   npx playwright-cli -s=inspect eval "JSON.stringify(Object.fromEntries(Array.from(getComputedStyle(document.documentElement)).filter(p => p.startsWith('--')).map(p => [p, getComputedStyle(document.documentElement).getPropertyValue(p).trim()])))"
   ```

4. **Extract computed styles**
   Same elements as `inspect-storybook` for direct comparison.

5. **Compare HTML structure** (optional)
   If both Storybook and Stitch render HTML, extract a simplified DOM tree for structural comparison.

6. **Write inspect output**
   Save to: `designbook/workflows/<workflow>/steps/inspect/inspect-stitch.json`

   Format:
   ```json
   {
     "source": "inspect-stitch",
     "url": "<stitch-preview-url>",
     "customProperties": { ... },
     "fonts": [ ... ],
     "computedStyles": { ... },
     "consoleErrors": [],
     "htmlDiff": {
       "storybook": "<simplified-dom>",
       "stitch": "<simplified-dom>"
     }
   }
   ```

7. **Close session** (last task in inspect step)
   ```bash
   npx playwright-cli -s=inspect close
   ```

## Output

- `inspect-stitch.json` — structured data for cross-platform comparison in the `compare` step
