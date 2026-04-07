---
when:
  steps: [design-verify:intake, configure-meta]
  extensions: stitch
---

# Resolve Stitch URL

When a reference source has `origin: stitch`, resolve the Stitch screen ID to a preview URL and set `hasMarkup: true`.

## When to Apply

This rule triggers during intake when the user provides a Stitch screen ID as the reference source, or when an existing `meta.yml` has `source.origin: stitch`.

## Execution

1. Read `source.screenId` from `meta.yml` (e.g., `projects/123/screens/abc123`)

2. Call the Stitch MCP server:
   ```
   mcp__stitch__get_screen({ name: "<screenId>", projectId: "<projectId>", screenId: "<screenId>" })
   ```

3. Extract the preview URL from the response. Look for a preview or HTML URL in the screen data.

4. Write to `meta.yml`:
   ```yaml
   reference:
     source:
       url: "<resolved-preview-url>"
       origin: stitch
       screenId: "<original-screen-id>"
       hasMarkup: true
   ```

   - `url`: the resolved preview URL
   - `hasMarkup: true`: Stitch screens serve inspectable HTML (CSS properties, fonts, DOM)

## Error Handling

- If `get_screen` fails or returns no usable URL, warn the user and leave `source.url` empty. The intake task will prompt for an alternative.
- If the screen has a `screenshot.downloadUrl` but no HTML preview, use the download URL but set `hasMarkup: false`.
