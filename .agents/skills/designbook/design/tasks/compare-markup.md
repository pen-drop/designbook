---
name: designbook:design:compare-markup
title: "Compare Markup: {scene}"
when:
  steps: [compare]
priority: 10
params:
  scene: ~
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Compare Markup

Inspects both the reference URL and Storybook URL via Playwright, extracts structured data (CSS, fonts, computed styles, DOM), and compares them. Only runs when the reference source has `hasMarkup: true`.

The check passes only when both visual AND markup comparison pass (if both references are available).

## Params (from DeboStoryCheck test item)

| Param | Source | Description |
|---|---|---|
| `scene` | test item | Scene reference in `group:sceneName` format |

## Execution

1. **Load story entity** to get reference URL and breakpoints:
   ```bash
   _debo story --scene ${scene}
   ```
   Read `reference.url` and `reference.hasMarkup`. If `hasMarkup` is not true, skip.

2. **For each breakpoint** from the story's checks:

   a. **Open Playwright session for reference URL**
   ```bash
   npx playwright-cli -s=compare open "${referenceUrl}"
   ```
   Set viewport to `${viewportWidth}x1600`. Wait for page load.

   b. **Extract reference data**:
   - CSS custom properties (`--*` variables)
   - Font loading status
   - Computed styles on key elements (h1-h4, p, section, header, footer, nav)

   c. **Navigate to Storybook URL** (reuse session)
   Set same viewport width. Wait for page load.

   d. **Extract Storybook data**: same properties as above.

   e. **Compare** both data sets:
   - CSS custom properties: diff values
   - Fonts: flag unloaded fonts
   - Computed styles: compare color, fontSize, fontFamily, fontWeight per element
   - Content: check for missing elements

   f. **Close session**

## Output

Structured comparison report per breakpoint. This report is consumed by the `polish` task alongside `compare-screenshots` results.

## Update meta.yml

After comparison, persist the result per breakpoint:

```bash
_debo story check --scene ${scene} --json '{"breakpoint":"<breakpoint>","region":"markup","status":"pass|fail","issues":["missing logo","wrong font"]}'
```

- `status`: pass if no critical/major issues, fail otherwise
- `issues`: list of differences (CSS + fonts + computed styles + missing content)

## Content Verification

Check for missing content by comparing both DOMs:

1. **Images** — `<img>` elements in reference: check if corresponding `<img>` exists in Storybook and loads. Label by nearest landmark or alt text.
2. **Navigation** — compare nav link counts and labels.
3. **Text blocks** — headings and major text areas present in reference should have corresponding content in Storybook.
4. **Sample-data assets** — if scene uses sample-data, verify referenced images/URLs render.

Only flag content as `missing` when the element is clearly present in the reference DOM but absent or broken in Storybook.
