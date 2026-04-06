---
name: designbook:design:visual-compare
when:
  steps: [visual-compare]
priority: 50
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

Read the scene's `reference` array from the `*.scenes.yml` file. Only compare breakpoints that have reference entries.

For each reference entry, locate:

- **Storybook screenshot**: `designbook/screenshots/${storyId}/storybook/${breakpoint}.png`
- **Reference image**: `designbook/screenshots/${storyId}/reference/${breakpoint}.png`

Read the `threshold` from each reference entry (default: 3% if not specified).

## Step 3: Collect Text Context

Read the following for comparison context:

1. **Scene definition** — the `*.scenes.yml` entry for this scene
2. **Design tokens** — `design-tokens.yml` (colors, fonts, spacing, breakpoints)
3. **Guidelines** — `guidelines.yml` (principles, component patterns)

## Step 4: Load Inspect Data

Check for `inspect-*.json` files from the prior `inspect` step:

```
designbook/workflows/<workflow>/steps/inspect/inspect-*.json
```

If inspect data exists, load all files and use them as structured context:
- **customProperties**: Verify CSS custom properties match design-tokens.yml values
- **fonts**: Verify expected fonts are loaded (loaded: true) — flag any that failed
- **computedStyles**: Compare actual rendered values against token values
- **consoleErrors**: Report any errors as Critical issues

If no inspect data exists (inspect step was skipped), degrade gracefully — rely on visual comparison only.

## Step 4b: Read Matched Rules for Extra Context

Read any matched rules for the `visual-compare` step. These may provide additional context for comparison.

## Step 5: Compare Per Breakpoint

For each reference entry, read both images and compare visually. Use the entry's `threshold` (default 3%) to determine PASS/FAIL. Produce a structured report:

| Element       | Breakpoint | Diff   | Threshold | Result | Issue |
|--------------|-----------|--------|-----------|--------|-------|
| Layout        | sm        | 1.2%   | 5%        | PASS   | ...   |
| Colors        | sm        | 4.8%   | 3%        | FAIL   | ...   |
| Fonts         | xl        | 0.5%   | 3%        | PASS   | ...   |

Include threshold context in the output: "2.1% diff, threshold 5% → PASS" or "4.8% diff, threshold 3% → FAIL".

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
