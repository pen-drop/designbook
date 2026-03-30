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

### Decision 1: Addon panel tab per scene story

When viewing a scene story, the addon panel gets a "Visual" tab (alongside the existing workflow tab). This tab shows screenshots, references, compare, and report for that specific scene.

The panel reads `parameters.scene.source` from the current story to find the scene file, then looks for visual artifacts in the corresponding screenshot directory.

**Alternative**: New page-level component.
**Why rejected**: Pages are for overview. The visual panel is contextual to a specific scene — panel is the right place.

### Decision 2: Screenshot storage per scene per breakpoint

```
designbook/
  sections/{sectionId}/
    screenshots/
      {sceneName}/
        desktop.png
        sm.png
        md.png
        reference/
          desktop.png
          sm.png
        report.md
  design-system/
    screenshots/
      shell/
        desktop.png
        sm.png
        reference/
          desktop.png
        report.md
```

The `screenshot` core task writes to this structure. The `resolve-reference` task writes to the `reference/` subdirectory. The `visual-compare` task writes `report.md`.

**Alternative**: Flat screenshots directory with naming convention (`shell-desktop.png`).
**Why rejected**: Directory structure is cleaner and easier to serve via `/__designbook/load`.

### Decision 3: Panel tabs structure

```
Visual Panel (per scene):
├─ Screenshots    Grid of breakpoint screenshots
├─ References     Grid of breakpoint reference images
├─ Compare        Side-by-side: screenshot | reference per breakpoint
└─ Report         visual-compare report.md rendered as HTML
```

Empty tabs show `DeboEmptyState` with the command to generate (e.g. `/debo design-screen`).

### Decision 4: Section-level screenshots tab removed

The `DeboSectionPage` screenshots tab (reading from `screenshots.md`) is removed. Visual artifacts are now per-scene in the addon panel. The section page keeps Spec, Sample Data, and Design tabs.

## Risks / Trade-offs

- **[Many images loaded]** → Panel only loads images for the currently viewed scene. Breakpoint images are lazy-loaded.
- **[Storage size]** → PNG screenshots at multiple breakpoints per scene can be large. Mitigation: screenshots are gitignored, regenerated on demand.
- **[Panel space]** → Side-by-side comparison needs horizontal space. Mitigation: responsive layout, stack vertically on narrow panels.
