---
name: designbook:design:inspect-format
when:
  steps: [inspect, visual-compare]
---

# Inspect Output Format

Hard constraints for inspect task JSON output structure.

## Required Fields

Every `inspect-*.json` file MUST contain:

```json
{
  "source": "<task-name>",
  "url": "<inspected-url>",
  "customProperties": { ... },
  "fonts": [ ... ],
  "computedStyles": { ... },
  "consoleErrors": [ ... ]
}
```

### Field Definitions

- **source** (string, required): Name of the inspect task that produced this file (e.g., `"inspect-storybook"`)
- **url** (string, required): The URL that was inspected
- **customProperties** (object, required): CSS custom properties extracted from `:root` and `[data-theme]` elements. Keys are property names (e.g., `"--color-primary"`), values are computed strings.
- **fonts** (array, required): Font loading status. Each entry: `{ "family": string, "weight": string, "loaded": boolean }`
- **computedStyles** (object, required): Computed CSS styles for key elements. Keys are selectors (e.g., `"h1.title"`), values are objects with `color`, `fontFamily`, `fontSize`, `fontWeight`, `backgroundColor`, `borderRadius`.
- **consoleErrors** (array, required): Console errors captured during page load. Empty array if none.

## Extension Fields

Extension tasks MAY add additional fields (e.g., `htmlDiff`, `accessibility`). The compare task reads all fields but only the required fields are guaranteed to exist.

## Constraints

- All fields listed above are REQUIRED — use empty objects/arrays if no data is available
- Property values MUST be the computed (resolved) values, not the authored values
- Font families MUST be checked against the actual document, not assumed from CSS
