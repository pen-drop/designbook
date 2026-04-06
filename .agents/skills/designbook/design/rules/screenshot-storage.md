---
name: designbook:design:screenshot-storage
when:
  steps: [screenshot, inspect, visual-compare]
---

# Screenshot Storage Convention

Hard constraints for screenshot and inspect output file locations.

## Directory Structure

```
designbook/
  screenshots/
    {storyId}/
      storybook/
        {breakpoint}.png       # Storybook screenshots
      reference/
        {breakpoint}.png       # Reference screenshots
  workflows/
    {workflow-name}/
      steps/
        inspect/
          inspect-storybook.json   # Inspect output
          inspect-*.json           # Extension inspect outputs
```

## Naming Rules

- **Storybook screenshots**: `designbook/screenshots/{storyId}/storybook/{breakpoint}.png`
- **Reference screenshots**: `designbook/screenshots/{storyId}/reference/{breakpoint}.png`
- **Inspect outputs**: `designbook/workflows/{workflow}/steps/inspect/inspect-{source}.json`

## Constraints

- Screenshot filenames MUST use the breakpoint name (e.g., `sm.png`, `xl.png`, `default.png`)
- Inspect output filenames MUST be prefixed with `inspect-` followed by the source task name
- All paths are relative to the workspace root
- Do NOT use absolute paths in inspect JSON output `url` fields — store the full URL for reference only
