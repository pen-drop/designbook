# visual-compare-overlay Specification

## Purpose
Visual comparison between reference screenshots and live story output via a toolbar dropdown and preview overlay.

## Requirements

### Requirement: Toolbar dropdown
The addon SHALL register a toolbar tool (`types.TOOL`) rendering a dropdown via `WithTooltip`/`IconButton`. Only visible when `parameters.scene` is truthy and `storyId` exists. Hidden otherwise (returns null).

### Requirement: Breakpoint and region discovery
The dropdown SHALL fetch breakpoints/regions from `GET /__designbook/story/{storyId}`, returning `checks` array and `summary`. Each check contains `breakpoint`, `region`, `selector`, `result`, `diff`, `threshold`, `issues`.

Breakpoints grouped from checks, sorted by width (`KNOWN_BREAKPOINTS`: sm=640, md=768, lg=1024, xl=1280, 2xl=1536), each with `RegionInfo` array. States:
- **Checks available**: list breakpoints sorted by width, regions indented below
- **No checks / fetch fails**: show "No references found"
- **Loading**: show "Loading..."

### Requirement: Breakpoint and region selection
Selecting a breakpoint header SHALL switch viewport to that width and activate overlay for all regions. Selecting a region narrows to that single region. Selection applied via `window.location` with `globals` query parameter encoding viewport, breakpoint, opacity, and region.

| Action | Result |
|--------|--------|
| Select breakpoint "md" | URL globals: `viewport.value:768-896`, `designbook-visual-compare.breakpoint:md` |
| Select region "header" under "md" | Additionally: `designbook-visual-compare.region:header` |
| Deselect active breakpoint (no region) | Clear globals query parameter |
| Deselect active region | Return to breakpoint level (all regions), not full deactivation |

### Requirement: Reference overlay in preview
Decorator `withVisualCompare` SHALL render reference overlays when a breakpoint is selected. Reads state from globals, fetches region data from `/__designbook/story/{storyId}`.

Image URL: `/__designbook/load?path=stories/{storyId}/screenshots/reference/{breakpoint}--{region}.png`

Positioning:
- No selector (full-page): `top: 0, left: 0, width: 100%`
- CSS selector present: position at element's computed offset relative to canvas

All overlays: `pointer-events: none`, `position: absolute`, `z-index: 9999`, current opacity. Failed loads (`onerror`) silently remove element. Previous `[data-visual-compare-overlay]` elements removed before creating new ones. No overlays when no breakpoint selected or opacity is 0.

### Requirement: Opacity slider
Range 0-100%, default 50%. Updates overlay opacity in real time via `updateGlobals`. Disabled when no breakpoint selected.

### Requirement: Diff badges
Breakpoint headers: aggregate badge `{passCount}/{totalRegions}` -- green when all pass, red when any fail.

Region rows: `DiffBadge` showing:
- Visual regions: `{diff}%` (green=pass, red=fail)
- Markup regions: "ok" (pass) or `{issueCount} issues` (fail)
- No results (`diff: null`, `pass: null`): "--" in gray

### Requirement: Globals schema
State stored in globals key `designbook-visual-compare` (constant `VISUAL_COMPARE_KEY` from `constants.ts`). Value: `{ breakpoint: string|null, region: string|null, opacity: number 0-100 }`. Default: `{ breakpoint: null, region: null, opacity: 50 }`. Toolbar writes, preview decorator reads.
