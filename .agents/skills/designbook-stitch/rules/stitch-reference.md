---
when:
  steps: [resolve-reference]
  design_tool.type: stitch
---

# Stitch Reference Resolution

Resolves `type: stitch` references by fetching screenshots from Stitch via MCP.

## Instructions

For each reference URL (either single `reference.url` or per-breakpoint `reference.screens`):

1. Parse the Stitch reference URL (e.g. `stitch://project-id/screen-id` or `projects/xxx/screens/yyy`)

2. Call `mcp__stitch__get_screen` with the screen resource name to get screen metadata

3. Read `screenshot.downloadUrl` from the response

4. Fetch the screenshot image from `downloadUrl` using `WebFetch` or `Read`

5. Save to `designbook/screenshots/${storyId}/reference/${breakpoint}.png`

## Per-Breakpoint Resolution

When `reference.screens` maps breakpoints to different Stitch screens:

```yaml
reference:
  type: stitch
  screens:
    xl: stitch://project/screen-desktop
    sm: stitch://project/screen-mobile
```

Resolve each screen separately — call `mcp__stitch__get_screen` for each, save each screenshot under its breakpoint name.

## Single Reference

When only `reference.url` is provided (no `screens`), save the single screenshot as `default.png`:

```
designbook/screenshots/${storyId}/reference/default.png
```

## Error Handling

If `mcp__stitch__get_screen` returns an error (MCP unavailable, screen not found):
- Report a warning: "Stitch reference unavailable: {error}"
- Continue without reference — visual compare will run in token-compliance-only mode
