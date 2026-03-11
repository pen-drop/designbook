## Context

`DeboSectionPage` has a "Design" step that loads `*.section.scenes.yml` and renders it with `DeboSampleData` — a raw data viewer. This gives no visual overview of the scenes. We need a card-based UI similar to Figma's layer cards.

The existing `DeboCard` component is entity-focused (badge, entityPath, fieldCount) and not suited for scene metadata (icon, title, modified date). A new specialized card is needed.

## Goals / Non-Goals

**Goals:**
- Figma-style scene card with icon, scene title, and last-modified date
- Grid layout for scene listing in the Design step
- Consistent with existing Debo* component patterns (`debo:` CSS prefix, same border/shadow style)

**Non-Goals:**
- Scene card interactions (click to navigate, drag to reorder) — future work
- Thumbnail previews of rendered scenes — requires screenshot infrastructure
- Modifying `DeboCard` — it serves entity display well as-is

## Decisions

### DeboSceneCard as a new UI primitive
Create `DeboSceneCard.jsx` in `components/ui/` rather than extending `DeboCard`. Scene metadata (icon, title, date) differs enough from entity metadata (badge, entityPath, fieldCount) that a separate component is cleaner.

### Icon strategy: first letter + DaisyUI theme
Each scene gets a `theme` property (set by the skill when creating the scene, e.g. `/debo-design-screen`). The card uses `data-theme={scene.theme}` and renders the first letter of the scene name in a circle with `bg-primary` / `text-primary-content`. Each scene's theme gives it a distinct color identity with zero custom CSS — the DaisyUI theme does all the work.

### Date display
Show relative time ("2 hours ago", "3 days ago") using a small utility function. The modified date comes from the scenes.yml metadata or file stat — whichever is available. If no date is available, omit gracefully.

### DeboSceneGrid as display component
A thin wrapper in `components/display/` that maps parsed scene data to a card grid. This follows the pattern of `DeboDataModel` (display) using `DeboCard` (ui).

## Risks / Trade-offs

- [No file modification date in scenes.yml] → Fall back to showing no date; can add `modified` field to scenes.yml later
- [Theme must be set by skill] → Scenes without `theme` get a sensible default (e.g. first available DaisyUI theme)
