## MODIFIED Requirements

### Requirement: Recursive entity resolution in renderer

The scene renderer SHALL recursively resolve `type: "entity"` nodes wherever they appear — in JSONata output and in component slot values — using the async render pipeline without markers or multi-pass scanning.

#### Scenario: Entity node in JSONata output

- **WHEN** a JSONata expression returns a `SceneNode[]` containing `{ type: "entity", entity_type, bundle, view_mode }`
- **THEN** the renderer SHALL call `await ctx.renderNode(entityNode)` for each entity node
- **AND** `ctx.renderNode` SHALL dispatch to `entityJsonataRenderer` which evaluates the corresponding JSONata expression
- **AND** the result SHALL be the fully resolved component call string (no markers)

#### Scenario: Entity node in component slot

- **WHEN** a component node has a slot value that is an array containing `{ type: "entity", ... }` nodes
- **THEN** the renderer SHALL `await ctx.renderNode(entityNode)` for each entity node in that slot
- **AND** replace each entity node with the awaited rendered output

#### Scenario: Nested recursion

- **WHEN** a resolved entity produces output that itself contains `type: "entity"` nodes
- **THEN** the renderer SHALL continue resolving recursively via `await ctx.renderNode()`
- **AND** recursion SHALL terminate naturally when no more entity nodes remain

#### Scenario: Recursion depth guard

- **WHEN** entity resolution exceeds 10 levels of nesting
- **THEN** the renderer SHALL stop and emit a warning
- **AND** the unresolved entity node SHALL be rendered as a placeholder/comment
- **NOTE** Depth is tracked via a counter passed through `RenderContext`, not via a multi-pass scan

#### Scenario: Mixed slots

- **WHEN** a component slot contains a mix of plain values (strings) and `SceneNode[]`
- **THEN** the renderer SHALL only recursively process array values that contain objects with a `type` property
- **AND** plain string values SHALL be passed through unchanged
