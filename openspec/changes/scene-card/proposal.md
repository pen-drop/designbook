## Why

The "Design" step in `DeboSectionPage` currently renders scenes data using `DeboSampleData`, which is a raw YAML data viewer — not a visual representation. Scenes deserve a Figma-style card UI that shows an icon, the scene title, and last-modified date, making the design overview scannable and visually appealing.

## What Changes

- Add a new `DeboSceneCard` UI component that renders a single scene as a visual card (icon, title, modified date)
- Add a new `DeboSceneGrid` display component that renders a list of scenes as a card grid
- Replace `DeboSampleData` with `DeboSceneGrid` in the Design step of `DeboSectionPage`

## Capabilities

### New Capabilities
- `scene-card-component`: A Figma-style card component for displaying individual scenes with icon, title subtitle, and last-modified timestamp

### Modified Capabilities
- `designbook-shared-components`: Adding DeboSceneCard (ui) and DeboSceneGrid (display) to the shared component library

## Impact

- `packages/storybook-addon-designbook/src/components/ui/` — new DeboSceneCard.jsx
- `packages/storybook-addon-designbook/src/components/display/` — new DeboSceneGrid.jsx
- `packages/storybook-addon-designbook/src/components/pages/DeboSectionPage.jsx` — swap renderer in Design step
- `packages/storybook-addon-designbook/src/components/ui/index.js` — export DeboSceneCard
- `packages/storybook-addon-designbook/src/components/display/index.js` — export DeboSceneGrid
