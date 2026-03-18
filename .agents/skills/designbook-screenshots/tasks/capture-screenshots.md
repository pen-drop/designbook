---
params:
  section_id: ~    # from dialog selection
  view_name: ~     # specific view/scene to capture
files:
  - $DESIGNBOOK_DIST/sections/{{ section_id }}/{{ view_name }}.png
  - $DESIGNBOOK_DIST/sections/{{ section_id }}/screenshots.md
---

## Capture Screenshot

If Playwright MCP tool is available:
1. Navigate to the Storybook story for `Designbook/Sections/[Section Title]/[view_name]`
2. Capture a full-page screenshot at 1280px viewport width
3. Save as `$DESIGNBOOK_DIST/sections/[section_id]/[view_name].png`

If browser automation is not available, instruct the user:
> "Please open Storybook, navigate to the scene, take a screenshot, and save it as `sections/[section_id]/[view_name].png`."

## Update Screenshots Manifest

Create or update `$DESIGNBOOK_DIST/sections/[section_id]/screenshots.md`:

```markdown
# Screenshots

- ![View Name](view-name.png)
```

Append new entries; do not overwrite existing ones.
