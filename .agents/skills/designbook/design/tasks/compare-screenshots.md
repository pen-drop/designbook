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

Performs AI visual comparison between Storybook and reference screenshots per breakpoint/region. Persists results via `_debo story --scene` and the DeboStory entity.

## Params (from DeboStoryCheck test item)

| Param | Source | Description |
|---|---|---|
| `scene` | test item | Scene reference in `group:sceneName` format |
| `storyId` | test item | Story identifier |
| `breakpoint` | test item | Breakpoint name |
| `region` | test item | Region name |

## Execution

1. **Load story entity** to get check details and screenshot paths:
   ```bash
   _debo story --scene ${scene}
   ```
   Read the check for this breakpoint/region to get threshold, screenshot paths.

2. **Collect context** for comparison:
   - Scene definition from `*.scenes.yml`
   - Design tokens from `design-tokens.yml`
   - Guidelines from `guidelines.yml`

3. **Compare this breakpoint/region pair:**

   a. Read both images:
   - `${DESIGNBOOK_DATA}/stories/${storyId}/screenshots/reference/${breakpoint}--${region}.png`
   - `${DESIGNBOOK_DATA}/stories/${storyId}/screenshots/current/${breakpoint}--${region}.png`

   If either image is missing, skip with a warning.

   b. **Compare visually** using multimodal capabilities. Evaluate layout, colors, typography, spacing. Focus on the specific element for named regions (header, footer, etc.).

   c. **Determine PASS/FAIL** using region threshold. Persist the result to the DeboStory entity:
      ```bash
      _debo story check --scene ${scene} --json '{"breakpoint":"<breakpoint>","region":"<region>","status":"pass|fail","diff":<percentage>,"issues":["..."]}'
      ```
      The check's `threshold` field determines the pass/fail boundary.

4. **Produce comparison report** for the `polish` task:

| Breakpoint | Region | Diff | Threshold | Result | Issues |
|-----------|--------|------|-----------|--------|--------|
| sm | header | 2.1% | 3% | PASS | — |
| xl | header | 4.8% | 3% | FAIL | Color mismatch |

Severity: **Critical** (structure wrong), **Major** (colors/fonts off), **Minor** (spacing/opacity).

## Output

The full comparison report, consumed by the `polish` task.

> **Note**: This is an AI-based visual comparison using multimodal capabilities, not a pixel-level diff. This is more flexible for early design stages where components are still evolving.
