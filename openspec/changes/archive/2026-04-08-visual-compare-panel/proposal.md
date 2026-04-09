## Why

Screenshots and references are generated per scene per breakpoint, but there's no UI to compare them visually. The previous plan (`scene-visual-panel`) used `types.TAB` which is deprecated in Storybook 11. A panel-based comparison also suffers from sizing/scaling mismatch between the panel and the actual rendered component.

The most effective way to compare is to overlay the reference image directly on top of the live-rendered story — same viewport, same size, pixel-perfect alignment.

## What Changes

- Add a toolbar dropdown ("Visual Compare") that lists available breakpoints for the current scene
- Selecting a breakpoint switches the Storybook viewport to that size and overlays the reference screenshot on top of the live story
- Opacity slider in the dropdown to blend between reference overlay and live rendering
- Each breakpoint entry shows a pass/fail badge with diff percentage and threshold (e.g. "2.1% / 5%")
- Overlay rendered via a preview decorator — reference image positioned absolutely over the story
- Images loaded via `/__designbook/load` endpoint (already exists)
- Dropdown only visible for scene stories (stories with the 'scene' tag)

## Capabilities

### New Capabilities
- `visual-compare-overlay`: Toolbar dropdown with breakpoint selection, viewport switching, reference overlay with opacity control, and per-breakpoint diff badges. Reads from `designbook/screenshots/{storyId}/` via load endpoint.

### Modified Capabilities
- `visual-tab`: Remove the placeholder `types.TAB` registration — replaced by this overlay approach.

## Impact

- **Addon Manager**: new toolbar tool registration in `manager.tsx`, remove TAB registration
- **Addon Preview**: new decorator for rendering the reference overlay
- **New Components**: `VisualCompareTool` (toolbar dropdown), `ReferenceOverlay` (preview decorator)
- **Modified Constants**: new globals key for visual compare state
- **Replaces**: planned `types.TAB` approach and previous `types.PANEL` design
