---
when:
  steps: [resolve-reference]
  design_tool.type: stitch
---

# Stitch Reference Resolution

Resolves `type: stitch` references by fetching screenshots from Stitch via MCP.

## Instructions

For each `type: stitch` entry in the scene's `reference` array:

1. Parse the Stitch reference URL from the entry's `url` (e.g. `stitch://project-id/screen-id` or `projects/xxx/screens/yyy`)

2. Call `mcp__stitch__get_screen` with the screen resource name to get screen metadata

3. Read `screenshot.downloadUrl` from the response

4. Fetch the screenshot image from `downloadUrl` using `WebFetch` or `Read`

5. Save to `designbook/screenshots/${storyId}/reference/${entry.breakpoint}.png`

## Example

```yaml
reference:
  - type: stitch
    url: stitch://project/screen-desktop
    breakpoint: xl
    threshold: 3
  - type: stitch
    url: stitch://project/screen-mobile
    breakpoint: sm
    threshold: 5
```

Each entry is resolved independently — call `mcp__stitch__get_screen` for each, save each screenshot under its breakpoint name.

## Error Handling

If `mcp__stitch__get_screen` returns an error (MCP unavailable, screen not found):
- Report a warning: "Stitch reference unavailable: {error}"
- Continue without reference — visual compare will run in token-compliance-only mode
