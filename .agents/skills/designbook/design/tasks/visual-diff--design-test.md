---
params:
  scene: ~
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/guidelines.yml
---

# Visual Diff

Screenshots a Storybook scene and compares it against its design reference. The agent handles both steps — the CLI only takes screenshots.

## Step 1: Screenshot Storybook Scene

Run the CLI screenshot command (without `--diff`):

```bash
$DESIGNBOOK_CMD screenshot --scene ${scene}
```

This outputs JSON with the screenshot path:
- `screenshotPath` — Storybook screenshot (PNG)

Read the screenshot with the `Read` tool to see the rendered scene.

## Step 2: Get Design Reference

The reference image must be fetched by the agent, NOT by the CLI. The CLI cannot resolve `stitch://` protocol URLs or other MCP-based references.

1. Read the scene file to find the `reference` field
2. Based on reference type:
   - **`stitch`**: Use `mcp__stitch__get_screen` to get the screen metadata, then read the `screenshot.downloadUrl` with the `Read` tool or `WebFetch`
   - **URL**: Fetch the image directly with `WebFetch`
   - **No reference**: Read `guidelines.yml` → `design_file` or `mcp` entries. List screens via MCP, ask the user to select one.
3. Read the reference image with the `Read` tool

## Step 3: Compare

Visually compare the Storybook screenshot against the design reference. Report:

| Element | Match | Issue |
|---------|-------|-------|
| Layout  | ✓/✗   | ...   |
| Colors  | ✓/✗   | ...   |
| Fonts   | ✓/✗   | ...   |
| Icons   | ✓/✗   | ...   |
| Spacing | ✓/✗   | ...   |

Severity: **Critical** (structure wrong), **Major** (colors/fonts off), **Minor** (spacing/opacity).

> **Note**: Pixel-level diff is not available in this mode. The agent performs a visual comparison using its multimodal capabilities. This is more flexible than pixel diff for early design stages where components are still evolving.
