---
name: designbook-stitch:screenshot-stitch
as: designbook:design:resolve-reference
priority: 30
when:
  steps: [screenshot]
  extensions: stitch
params:
  scene: ~
files: []
---

# Screenshot Stitch

Overrides the default `resolve-reference` task when Stitch is active. Captures reference screenshots from Stitch design screens instead of resolving generic URL/image references.

## Execution

1. **Resolve the scene's reference**
   Read the scene's `reference` array from `*.scenes.yml`. Filter entries where `type: stitch`.

2. **Fetch Stitch screen data**
   For each stitch reference:
   ```
   mcp__stitch__get_screen({ screenId: "<id>" })
   ```

3. **Download screenshot**
   Try `screenshot.downloadUrl` first. If it returns 403/401, fall back to HTML rendering:
   - Download HTML from `htmlCode.downloadUrl`
   - Render via playwright-cli at the breakpoint viewport width
   - Capture screenshot

4. **Save reference images**
   Save to `designbook/screenshots/{storyId}/reference/{breakpoint}.png`

## Fallback

If both screenshot download and HTML rendering fail, emit a warning and continue without the reference for that breakpoint. The compare step degrades gracefully without reference images.
