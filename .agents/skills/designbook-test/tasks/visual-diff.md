---
params:
  scene: ~
files: []
reads:
  - path: $DESIGNBOOK_DIST/design-system/guidelines.yml
---

# Visual Diff

Screenshots a Storybook scene, downloads its design reference, generates a pixel diff, and reports differences.

## Step 1: Screenshot + Reference + Diff

Run the CLI screenshot command with `--diff`:

```bash
$DESIGNBOOK_CMD screenshot --scene ${scene} --diff
```

This outputs JSON with paths to three files:
- `screenshotPath` — Storybook screenshot
- `referencePath` — Design reference image
- `diffPath` — Pixel diff overlay (red = different)
- `diff.mismatch` — Mismatch percentage
- `diff.dimensions` — Image dimensions comparison

If the scene has no `reference` field, the command errors. In that case, fall back to reading `guidelines.yml` → `design_file.url` to find the design source, list screens via MCP, and ask the user to select one.

## Step 2: Compare

Read all three images with the `Read` tool. Use the diff overlay to focus on areas of difference. Report:

| Element | Match | Issue |
|---------|-------|-------|
| Layout  | ✓/✗   | ...   |
| Colors  | ✓/✗   | ...   |
| Fonts   | ✓/✗   | ...   |
| Icons   | ✓/✗   | ...   |
| Spacing | ✓/✗   | ...   |

Include the mismatch percentage and dimension comparison from the CLI output.

Severity: **Critical** (structure wrong), **Major** (colors/fonts off), **Minor** (spacing/opacity).
