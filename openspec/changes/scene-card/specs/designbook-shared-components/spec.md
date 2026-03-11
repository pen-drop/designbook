## MODIFIED Requirements

### Requirement: Shared component library exports
The shared component library SHALL export all UI primitives and display components via barrel exports. UI components are exported from `components/ui/index.js`, display components from `components/display/index.js`, and all are re-exported from `components/index.js`.

#### Scenario: DeboSceneCard is importable
- **WHEN** a consumer imports `DeboSceneCard` from the components barrel
- **THEN** the component is available and renders correctly

#### Scenario: DeboSceneGrid is importable
- **WHEN** a consumer imports `DeboSceneGrid` from the components barrel
- **THEN** the component is available and renders correctly
