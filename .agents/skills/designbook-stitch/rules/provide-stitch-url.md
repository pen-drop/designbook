---
provides: reference.url
trigger:
  domain: design.intake
  steps: [compare-observations, observe-website]
filter:
  extensions: stitch
---

# Resolve Stitch URL

When a reference source has `origin: stitch`, resolve the Stitch screen ID to a preview URL.

## When to Apply

This rule matches the design-verify and extract-reference catalogues when the user provides a Stitch screen ID as the reference source.

## Execution

1. If `origin` is not `stitch`, skip.

2. Read the `screenId` (e.g., `projects/123/screens/abc123`)

3. Call the Stitch MCP server:
   ```
   mcp__stitch__get_screen({ name: "<screenId>", projectId: "<projectId>", screenId: "<screenId>" })
   ```

4. Extract the preview URL from the response.

5. Return to the calling intake:
   - `url`: the resolved preview URL
   - `hasMarkup: true` — Stitch screens serve inspectable HTML (CSS properties, fonts, DOM)
   - `hasAPI: true` — Stitch provides an MCP API for screen/project data

## Error Handling

- If `get_screen` fails or returns no usable URL, warn the user and leave `url` empty. Planning asks for an alternative.
- If the screen has a `screenshot.downloadUrl` but no HTML preview, use the download URL and set `hasMarkup: false`.
