---
name: designbook:design:compare-markup
when:
  steps: [compare]
  source.hasMarkup: true
priority: 10
each: reference.breakpoints
params:
  scene: ~
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Compare Markup

Inspects both the reference URL and Storybook URL via Playwright, extracts structured data (CSS, fonts, computed styles, DOM), and compares them. Only runs when the reference source has `hasMarkup: true`.

## Params (per iteration)

| Param | Source | Description |
|---|---|---|
| `referenceUrl` | `meta.yml` → `reference.source.url` | Reference URL to inspect |
| `storybookUrl` | `_debo story` | Storybook iframe URL |
| `breakpoint` | `each` iterator | Breakpoint name |
| `viewportWidth` | design-tokens.yml | Breakpoint pixel width |

## Execution

1. **Resolve URLs and breakpoints**
   ```bash
   _debo story --scene ${scene}
   ```
   Read `meta.yml` → `reference.source.url`.

2. **For each breakpoint** (from `each: reference.breakpoints`):

   a. **Open Playwright session for reference URL**
   ```bash
   npx playwright-cli -s=compare open "${referenceUrl}"
   ```
   Set viewport to `${viewportWidth}x1600`. Wait for page load.

   b. **Extract reference data**:
   - CSS custom properties (`--*` variables)
   - Font loading status
   - Computed styles on key elements (h1–h4, p, section, header, footer, nav)

   c. **Navigate to Storybook URL** (reuse session)
   ```bash
   npx playwright-cli -s=compare open "${storybookUrl}"
   ```
   Set same viewport width. Wait for page load.

   d. **Extract Storybook data**: same properties as above.

   e. **Compare** both data sets:
   - CSS custom properties: diff values
   - Fonts: flag unloaded fonts
   - Computed styles: compare color, fontSize, fontFamily, fontWeight per element
   - DOM structure: simplified tree comparison (optional)

   f. **Close session**
   ```bash
   npx playwright-cli -s=compare close
   ```

## Output

Structured comparison report per breakpoint:

```json
{
  "breakpoint": "sm",
  "customProperties": {
    "matching": 42,
    "differing": [
      { "name": "--color-primary", "reference": "#1a1a2e", "storybook": "#1a1a30" }
    ]
  },
  "fonts": {
    "reference": [{ "family": "Inter", "loaded": true }],
    "storybook": [{ "family": "Inter", "loaded": true }]
  },
  "computedStyles": {
    "differences": [
      { "selector": "h1", "property": "fontSize", "reference": "32px", "storybook": "30px" }
    ]
  }
}
```

This report is consumed by the `polish` task alongside `compare-screenshots` results.
