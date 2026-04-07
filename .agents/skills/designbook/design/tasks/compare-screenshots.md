---
name: designbook:design:compare-screenshots
when:
  steps: [compare]
priority: 20
each: reference.breakpoints
params:
  scene: ~
files:
  - key: meta
    path: designbook/stories/{storyId}/meta.yml
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

4. **For each breakpoint** (from `each: reference.breakpoints`):

   a. Read both images:
   - `designbook/stories/${storyId}/screenshots/reference/${breakpoint}.png`
   - `designbook/stories/${storyId}/screenshots/current/${breakpoint}.png`

   If either image is missing, skip with a warning.

   b. **Compare visually** using multimodal capabilities. Evaluate:
   - Layout and structure
   - Colors and theming
   - Typography
   - Spacing and alignment

   c. **Determine PASS/FAIL** based on `threshold`:
   - Estimate diff percentage
   - Below threshold → PASS
   - Above threshold → FAIL

   d. **Write results to meta.yml** via write-file:
   Read current `meta.yml`, update `reference.breakpoints.{breakpoint}` with results, write back:
   ```bash
   cat <<'EOF' | _debo workflow write-file $WORKFLOW_NAME $TASK_ID --key meta
   reference:
     source:
       ...existing source...
     breakpoints:
       {breakpoint}:
         threshold: 3
         lastDiff: 2.1
         lastResult: pass
   EOF
   ```

5. **Produce comparison report** for the `polish` task:

| Breakpoint | Diff | Threshold | Result | Issues |
|-----------|------|-----------|--------|--------|
| sm | 2.1% | 3% | PASS | — |
| xl | 4.8% | 3% | FAIL | Color mismatch in header |

Severity: **Critical** (structure wrong), **Major** (colors/fonts off), **Minor** (spacing/opacity).

## Output

The full comparison report, consumed by the `polish` task.

> **Note**: This is an AI-based visual comparison using multimodal capabilities, not a pixel-level diff. This is more flexible for early design stages where components are still evolving.
