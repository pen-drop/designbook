## Why

Screenshots and visual comparison artifacts are generated per scene per breakpoint, but the current addon UI shows screenshots per section in a flat grid. There's no way to see a scene's screenshot next to its reference, compare breakpoints, or view the visual-compare report. The artifacts are disconnected from the scenes they belong to.

## What Changes

- Add a visual panel to each scene (inside the story view or as addon panel tab) showing: screenshots per breakpoint, references per breakpoint, side-by-side comparison, and visual-compare report
- Move screenshots from section-level `screenshots.md` to per-scene storage keyed by breakpoint
- The `DeboSceneCard` (or story-level panel) gets tabs for visual artifacts instead of the section-level screenshots tab
- Reuse `_debo resolve-url` and the `/__designbook/load` endpoint for serving images

## Capabilities

### New Capabilities
- `scene-visual-panel`: Per-scene addon panel (or tab within scene view) displaying screenshots, references, comparison, and report. Tabs: Screenshots (per breakpoint grid), References (per breakpoint grid), Compare (side-by-side per breakpoint), Report (visual-compare markdown).
- `scene-screenshot-storage`: Screenshots and references stored per scene per breakpoint in a structured directory layout, served via the existing `/__designbook/load` endpoint.

### Modified Capabilities
_(none)_

## Impact

- **Addon UI**: New React components for scene visual panel, screenshot/reference grids, side-by-side compare view
- **Storage**: Screenshots move from `sections/{id}/screenshots.md` to structured per-scene directories
- **Existing Pages**: `DeboSectionPage` screenshots tab replaced or updated; `DeboSceneCard` gains visual indicator when screenshots exist
