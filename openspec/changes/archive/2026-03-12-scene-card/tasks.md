## 1. UI Primitive

- [x] 1.1 Create `DeboSceneCard.jsx` in `components/ui/` with props: `title`, `theme`, `modified`, `className`
- [x] 1.2 Render first-letter circle with `data-theme`, `bg-primary`, `text-primary-content`
- [x] 1.3 Add relative date formatting utility (e.g., "2 hours ago", "3 days ago")
- [x] 1.4 Export `DeboSceneCard` from `components/ui/index.js`

## 2. Display Component

- [x] 2.1 Create `DeboSceneGrid.jsx` in `components/display/` that maps scenes array to `DeboSceneCard` grid
- [x] 2.2 Implement responsive grid layout (1 col small, 2-3 cols wider)
- [x] 2.3 Export `DeboSceneGrid` from `components/display/index.js`

## 3. Integration

- [x] 3.1 Add `scenesParser` that returns `null` when `scenes` array is empty/missing
- [x] 3.2 Replace `DeboSampleData` with `DeboSceneGrid` in the Design step of `DeboSectionPage.jsx`, using `scenesParser`
- [x] 3.3 Export `DeboSceneGrid` from main `components/index.js` barrel
