## Context

Toolbar tools and decorators are the two main extension points. Tools render in the manager frame (toolbar area) and communicate state via `useGlobals()`. Decorators run in the preview frame and wrap each story — they can read globals and render additional DOM. Images from the designbook directory are served through the existing `/__designbook/load` endpoint.

## Goals / Non-Goals

**Goals:**
- Reference image overlay directly on the live-rendered story
- Breakpoint dropdown that couples viewport switching with overlay display
- Per-breakpoint diff badge (percentage + threshold)
- Opacity slider for blend control

**Non-Goals:**
- Pixel-level diff rendering (highlighting changed pixels)
- Real-time screenshot capture
- Image editing
- Full diff report display (report.md rendering)

## Decisions

### Decision 1: Toolbar dropdown instead of panel

Toolbar dropdown (`types.TOOL`) that appears when viewing a scene story. Contains breakpoint list, opacity slider, and diff badges. This replaces both the previous `types.TAB` (deprecated in SB11) and the `types.PANEL` approach.

**Alternative considered**: `types.PANEL` with side-by-side comparison.
**Why rejected**: Panel can't show the overlay at the correct viewport size. A toolbar dropdown + preview decorator gives pixel-perfect 1:1 comparison without scaling issues.

### Decision 2: Viewport coupling

Selecting a breakpoint in the dropdown does two things simultaneously:
1. Switches the Storybook viewport to the breakpoint width (using Storybook's viewport addon API or equivalent globals)
2. Sets the active breakpoint in globals so the preview decorator knows which reference image to load

This eliminates the breakpoint matching problem — the viewport always matches the reference screenshot dimensions.

### Decision 3: Reference overlay via decorator

A preview decorator reads the active compare state from globals. When active:
- Fetches the reference image for the selected breakpoint via `/__designbook/load?path=screenshots/{storyId}/reference/{breakpoint}.png`
- Renders it as an absolutely positioned `<img>` over the story root
- Applies the current opacity value from globals
- CSS: `position: absolute; top: 0; left: 0; width: 100%; pointer-events: none; opacity: {value}`

When no breakpoint is selected (compare off), the decorator renders nothing extra.

### Decision 4: Diff badges in dropdown

Each breakpoint entry in the dropdown shows:
- Breakpoint name (sm, md, lg, xl, etc.)
- Diff percentage and threshold as badge, e.g. "2.1% / 5%"
- Color coding: green (pass) / red (fail)

Diff data is read from `screenshots/{storyId}/report.md` — parsed for per-breakpoint results. Fetched once when dropdown opens. If no report exists, badges show "—".

### Decision 5: Breakpoint discovery

Available breakpoints are determined by scanning which `{breakpoint}.png` files exist in the `screenshots/{storyId}/reference/` directory. The dropdown lists only breakpoints that have a reference image. Discovery happens via a single fetch to a listing endpoint or by probing known breakpoint names from design-tokens.

### Decision 6: Globals schema

Visual compare state stored in Storybook globals under a dedicated key:

```
globals['designbook:visual-compare'] = {
  breakpoint: 'md' | null,   // active breakpoint, null = overlay off
  opacity: 50                 // 0–100, default 50
}
```

The toolbar tool writes this; the preview decorator reads it.

### Decision 7: Opacity control

Slider in the dropdown, range 0–100%, default 50%. Changing the slider updates globals immediately — the decorator reactively adjusts the overlay opacity. The slider is only interactive when a breakpoint is selected.

### Decision 8: Scene-only visibility

The toolbar dropdown is only rendered when the current story has scene parameters (`parameters.scene` is truthy). Uses the same detection pattern as the existing panel's `match` function.

## Risks / Trade-offs

- **[Reference image size mismatch]** → Mitigated by viewport coupling: reference was captured at the same breakpoint width. If heights differ (dynamic content), the overlay still aligns from top-left — differences become visible naturally.
- **[No screenshots yet]** → Dropdown shows empty state: "No references found. Run the screenshot workflow."
- **[Viewport addon conflict]** → Setting the viewport programmatically may interfere with the user's manual viewport selection. Accepted trade-off — the compare dropdown is an explicit user action.
- **[Report parsing fragility]** → report.md format must be stable. If parsing fails, badges show "—" gracefully.
