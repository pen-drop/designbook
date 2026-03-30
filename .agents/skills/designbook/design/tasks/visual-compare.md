---
params:
  scene: ~
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
  - path: $DESIGNBOOK_DATA/design-system/guidelines.yml
    optional: true
---

# Visual Compare

Performs AI visual comparison between Storybook screenshots and design references, per breakpoint.

## Step 1: Resolve storyId

Run `_debo resolve-url --scene ${scene}` to get the `storyId`.

## Step 2: Collect Images

Read the screenshot directories:

- **Storybook screenshots**: `designbook/screenshots/${storyId}/storybook/*.png`
- **Reference images**: `designbook/screenshots/${storyId}/reference/*.png`

Match by filename (breakpoint name). For each breakpoint that has both a Storybook screenshot and a reference image, perform a comparison.

## Step 3: Collect Text Context

Read the following for comparison context:

1. **Scene definition** — the `*.scenes.yml` entry for this scene
2. **Design tokens** — `design-tokens.yml` (colors, fonts, spacing, breakpoints)
3. **Guidelines** — `guidelines.yml` (principles, component patterns)

## Step 4: Read Matched Rules for Extra Context

Read any matched rules for the `visual-compare` step (e.g. `devtools-context` from designbook-devtools). These may provide:

- Computed styles (actual rendered CSS values)
- DOM structure snapshot
- Accessibility audit results
- Console errors

## Step 5: Compare Per Breakpoint

For each breakpoint with matching screenshot pairs, read both images and compare visually. Produce a structured report:

| Element       | Breakpoint | Match | Issue |
|--------------|-----------|-------|-------|
| Layout        | sm        | ✓/✗   | ...   |
| Colors        | sm        | ✓/✗   | ...   |
| Fonts         | sm        | ✓/✗   | ...   |
| Spacing       | sm        | ✓/✗   | ...   |
| Accessibility | sm        | ✓/✗   | ...   |

Severity: **Critical** (structure wrong), **Major** (colors/fonts off), **Minor** (spacing/opacity).

If no reference images exist, focus on **token compliance**: do rendered values match `design-tokens.yml`?

If extra context (DevTools) is available, include computed value verification (e.g. actual color vs. token value).

## Step 6: Compare Without Reference (Token Compliance Only)

If `designbook/screenshots/${storyId}/reference/` is empty or doesn't exist:

- Read each Storybook screenshot
- Compare visual rendering against design-tokens.yml values
- Report any visible deviations from token values

## Output

Output the full comparison report. This report is consumed by the `polish` task.

> **Note**: This is an AI-based visual comparison using multimodal capabilities, not a pixel-level diff. This is more flexible for early design stages where components are still evolving.
