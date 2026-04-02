---
when:
  steps: [resolve-reference]
  extensions: stitch
---

# Stitch Reference Resolution

Resolves `type: stitch` references by fetching screenshots from Stitch via MCP.

## Instructions

For each `type: stitch` entry in the scene's `reference` array:

1. Parse the Stitch reference URL from the entry's `url` (e.g. `stitch://project-id/screen-id` or `projects/xxx/screens/yyy`)

2. Call `mcp__stitch__get_screen` with the screen resource name to get screen metadata

3. Read `screenshot.downloadUrl` from the response

4. Fetch the screenshot image from `downloadUrl` using `WebFetch` or `Read`

5. **Verify the download is an actual image** — after downloading from `downloadUrl`, check the file type (e.g. `file <path>` or check Content-Type). If the downloaded file is HTML instead of an image (common with Google CDN 403 responses), proceed to the HTML fallback.

6. Save to `designbook/screenshots/${storyId}/reference/${entry.breakpoint}.png`

## HTML Rendering Fallback

If `screenshot.downloadUrl` returns HTTP 403, 401, or a non-image response:

1. Check if `htmlCode.downloadUrl` is available in the `get_screen` response
2. Download the HTML file: `curl -sL -o /tmp/stitch-reference-${entry.breakpoint}.html "${htmlCode.downloadUrl}"`
3. Render the HTML as a screenshot via Playwright:
   ```bash
   npx playwright screenshot --full-page --viewport-size "${width},1600" \
     "file:///tmp/stitch-reference-${entry.breakpoint}.html" \
     "designbook/screenshots/${storyId}/reference/${entry.breakpoint}.png"
   ```
4. Verify the output is a valid PNG

If both `screenshot.downloadUrl` and `htmlCode.downloadUrl` fail, warn and continue without reference.

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

If `screenshot.downloadUrl` returns 403/401 and `htmlCode.downloadUrl` is also unavailable:
- Report a warning: "Stitch reference unavailable: download failed"
- Continue without reference
