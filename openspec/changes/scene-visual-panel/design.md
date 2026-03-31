## Context

The addon has two display levels:
- **Pages** (`DeboSectionPage`, `DeboDesignSystemPage`): shown as Storybook doc pages with tabs (Spec, Data, Design, Screenshots)
- **Panel** (`Panel.tsx`): shown as addon panel below stories, currently shows workflow tasks and validation

Scenes are rendered as individual Storybook stories via CSF modules generated from `*.scenes.yml`. Each story has `parameters.scene.source` pointing to its scenes file.

The existing `/__designbook/load` endpoint serves files from the designbook data directory. Screenshots can be served through this endpoint.

## Goals / Non-Goals

**Goals:**
- Per-scene visual artifacts: screenshots, references, compare, report
- Accessible from the story view (when viewing a scene story)
- Breakpoint-aware: show all breakpoint screenshots in a grid
- Side-by-side comparison view: screenshot vs. reference per breakpoint
- Display visual-compare report as formatted markdown

**Non-Goals:**
- Interactive visual diff tool (pixel overlay, slider, etc.)
- Real-time screenshot capture from the panel
- Editing scenes from the panel

## Decisions

### Decision 1: Top-level "Visual" tab per scene story

When viewing a scene story, a "Visual" tab appears alongside Canvas and Docs (using Storybook's `types.TAB` addon type). This tab shows screenshots, references, compare, and report for that specific scene.

The tab reads `parameters.scene.source` from the current story to find the scene file, then looks for visual artifacts in the corresponding screenshot directory.

Verified: `types.TAB` works with generated JS stories in Storybook 10.

**Alternative considered**: Addon panel tab (in bottom panel).
**Why rejected**: Panel is cramped for image comparison. A full-width tab gives proper space for side-by-side breakpoint views.

### Decision 2: Screenshot storage per storyId (aligned with visual-diff-integration)

Uses the storage convention from visual-diff-integration (Decision 9):

```
designbook/screenshots/
  {storyId}/
    storybook/
      sm.png
      xl.png
      default.png
    reference/
      sm.png
      xl.png
    report.md
```

The `screenshot` core task writes to `storybook/`. The `resolve-reference` task writes to `reference/`. The `visual-compare` task writes `report.md`. The Visual tab reads all three.

StoryId is the universal key — works for scenes, components, and variants.

### Decision 3: Visual tab internal structure

```
Visual Tab (per scene, full width):
├─ Screenshots    Grid of breakpoint screenshots
├─ References     Grid of breakpoint reference images
├─ Compare        Side-by-side: screenshot | reference per breakpoint
└─ Report         visual-compare report.md rendered as HTML
```

Internal navigation via sub-tabs within the Visual tab view. Empty states show `DeboEmptyState` with the command to generate (e.g. `/debo design-screen`).

### Decision 4: Section-level screenshots tab removed

The `DeboSectionPage` screenshots tab (reading from `screenshots.md`) is removed. Visual artifacts are now per-scene in the addon panel. The section page keeps Spec, Sample Data, and Design tabs.

## Risks / Trade-offs

- **[Many images loaded]** → Panel only loads images for the currently viewed scene. Breakpoint images are lazy-loaded.
- **[Storage size]** → PNG screenshots at multiple breakpoints per scene can be large. Mitigation: screenshots are gitignored, regenerated on demand.
- **[Tab space]** → Full-width tab provides ample space for side-by-side comparison. Responsive layout stacks vertically on narrow viewports.
