---
name: designbook:design:compare-screenshots
title: "Compare Screenshots: {scene} ({breakpoint}/{region})"
when:
  steps: [compare]
priority: 20
params:
  scene: ~
  storyId: ~
  breakpoint: ~
  region: ~
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
  - path: $DESIGNBOOK_DATA/design-system/guidelines.yml
    optional: true
---

# Compare Screenshots

Performs AI visual comparison between Storybook and reference screenshots per breakpoint. Writes results back to `meta.yml`.

## Params (per iteration)

| Param | Source | Description |
|---|---|---|
| `referencePath` | computed | `designbook/stories/{storyId}/screenshots/reference/{breakpoint}.png` |
| `currentPath` | computed | `designbook/stories/{storyId}/screenshots/current/{breakpoint}.png` |
| `threshold` | `meta.yml` → `reference.breakpoints.{bp}.threshold` | Diff threshold in % |
| `breakpoint` | `each` iterator | Breakpoint name |

## Execution

1. **Resolve storyId**
   ```bash
   _debo story --scene ${scene}
   ```

2. **Read meta.yml** for breakpoints and thresholds:
   ```
   designbook/stories/${storyId}/meta.yml
   ```

3. **Collect context** for comparison:
   - Scene definition from `*.scenes.yml`
   - Design tokens from `design-tokens.yml`
   - Guidelines from `guidelines.yml`

4. **Compare this breakpoint/region pair:**

   a. Read both images:
   - `designbook/stories/${storyId}/screenshots/reference/${breakpoint}--${region}.png`
   - `designbook/stories/${storyId}/screenshots/current/${breakpoint}--${region}.png`

   If either image is missing, skip with a warning.

   b. **Compare visually** using multimodal capabilities. Evaluate layout, colors, typography, spacing. Focus on the specific element for named regions (header, footer, etc.).

   c. **Determine PASS/FAIL** using region threshold (or breakpoint threshold as fallback). Update `meta.yml`:
   ```yaml
   regions:
     header:
       selector: "header"
       lastDiff: 2.1
       lastResult: pass
   ```

5. **Produce comparison report** for the `polish` task:

| Breakpoint | Region | Diff | Threshold | Result | Issues |
|-----------|--------|------|-----------|--------|--------|
| sm | header | 2.1% | 3% | PASS | — |
| sm | footer | 1.5% | 3% | PASS | — |
| xl | header | 4.8% | 3% | FAIL | Color mismatch |

Severity: **Critical** (structure wrong), **Major** (colors/fonts off), **Minor** (spacing/opacity).

## Output

The full comparison report, consumed by the `polish` task.

> **Note**: This is an AI-based visual comparison using multimodal capabilities, not a pixel-level diff. This is more flexible for early design stages where components are still evolving.
