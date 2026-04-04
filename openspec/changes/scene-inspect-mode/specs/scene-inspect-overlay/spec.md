## ADDED Requirements

### Requirement: Toolbar button toggles inspect mode
A toolbar button (`types.TOOL`) SHALL toggle scene inspect mode on and off. The button SHALL only be visible when the current story has scene parameters.

#### Scenario: Toggle inspect mode on
- **WHEN** user clicks the inspect toolbar button while inspect mode is off
- **THEN** the button SHALL appear active and a `designbook/inspect-mode` channel event with value `true` SHALL be emitted

#### Scenario: Toggle inspect mode off
- **WHEN** user clicks the inspect toolbar button while inspect mode is on
- **THEN** the button SHALL appear inactive and a `designbook/inspect-mode` channel event with value `false` SHALL be emitted

#### Scenario: Button hidden for non-scene stories
- **WHEN** the current story does not have `parameters.scene`
- **THEN** the inspect toolbar button SHALL NOT be visible

### Requirement: Canvas overlay draws outlines around top-level scene nodes
A preview decorator SHALL draw colored outlines around each top-level rendered scene node when inspect mode is active.

#### Scenario: Outlines appear when inspect mode activates
- **WHEN** inspect mode is toggled on
- **THEN** each top-level rendered element SHALL be wrapped with a colored border outline

#### Scenario: Outlines colored by node kind
- **WHEN** outlines are rendered
- **THEN** entity nodes SHALL have blue outlines, scene-ref nodes SHALL have green outlines, and component nodes SHALL have grey outlines

#### Scenario: Hover shows node label
- **WHEN** user hovers over an outlined node
- **THEN** a label SHALL appear showing the node name and kind (e.g. "hero_banner — entity: node/landing_page")

#### Scenario: Click selects node
- **WHEN** user clicks on an outlined node
- **THEN** a `designbook/select-node` channel event SHALL be emitted with the node index

#### Scenario: Outlines removed when inspect mode deactivates
- **WHEN** inspect mode is toggled off
- **THEN** all outlines and labels SHALL be removed

### Requirement: Overlay targets top-level nodes only
The overlay SHALL only outline top-level scene nodes. Slot-level nodes SHALL NOT be outlined in the canvas.

#### Scenario: Nested slot children are not outlined
- **WHEN** inspect mode is active and a top-level node contains slot children
- **THEN** only the top-level node receives an outline; slot children do not
