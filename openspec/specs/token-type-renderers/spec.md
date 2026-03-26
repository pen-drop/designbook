# token-type-renderers Specification

## Requirements

### Requirement: Three-tier renderer selection
The `DeboDesignTokens` component SHALL select visual renderers using a three-tier priority: (1) explicit `$extensions.designbook.renderer`, (2) typography mix detection, (3) dominant `$type`.

#### Scenario: Explicit renderer via $extensions
- **WHEN** a token group has `$extensions.designbook.renderer` set to a known renderer name (e.g., `radius`, `bar`, `gap`, `spacing`)
- **THEN** the component SHALL use that renderer regardless of the tokens' `$type`

#### Scenario: $type-based fallback
- **WHEN** a token group has no `$extensions.designbook.renderer`
- **THEN** the component SHALL determine the dominant `$type` among tokens and use the corresponding section renderer

#### Scenario: Unknown type falls back to generic
- **WHEN** a token has a `$type` value not present in the registry and no explicit renderer
- **THEN** the component SHALL render it using the existing generic key:value text display

### Requirement: $extensions.designbook.renderer on groups
Token groups SHALL support a `$extensions.designbook.renderer` field to explicitly control visual rendering.

#### Scenario: Radius renderer
- **WHEN** a group has `$extensions.designbook.renderer: radius`
- **THEN** the component SHALL render tokens as squares with the token's value applied as `border-radius`

#### Scenario: Bar renderer
- **WHEN** a group has `$extensions.designbook.renderer: bar`
- **THEN** the component SHALL render tokens as proportional horizontal bars scaled to the group's maximum value

#### Scenario: Gap renderer
- **WHEN** a group has `$extensions.designbook.renderer: gap`
- **THEN** the component SHALL render tokens as inline boxes separated by the token's value as CSS `gap`

#### Scenario: Spacing renderer
- **WHEN** a group has `$extensions.designbook.renderer: spacing`
- **THEN** the component SHALL render tokens using the same visualization as the gap renderer

### Requirement: Schema supports $extensions on groups
The `design-tokens.schema.yml` SHALL allow `$extensions` as a property on token groups.

#### Scenario: Valid group with $extensions
- **WHEN** a token group contains `$extensions: { designbook: { renderer: "radius" } }` alongside token entries
- **THEN** the schema validator SHALL accept it as valid

### Requirement: Dominant type detection per group
The component SHALL determine the dominant `$type` within each token group and use the corresponding section-level renderer when no explicit renderer is set.

#### Scenario: Homogeneous group
- **WHEN** all tokens in a group share the same `$type` (e.g., all `dimension`)
- **THEN** the group SHALL be rendered using that type's section renderer

#### Scenario: Mixed-type group with clear majority
- **WHEN** a group contains tokens of multiple `$type` values and one type accounts for more than 50% of tokens
- **THEN** the group SHALL use the majority type's section renderer
- **AND** minority-type tokens SHALL be rendered using their individual token renderers

#### Scenario: Typography group is special-cased
- **WHEN** a group contains both `$type: fontFamily` and `$type: typography` tokens
- **THEN** the component SHALL render font cards for `fontFamily` tokens and a type-scale table for `typography` tokens within the same section

### Requirement: Dimension renderer
The component SHALL render `$type: dimension` tokens as proportional horizontal bars.

#### Scenario: Proportional scaling
- **WHEN** a group contains dimension tokens with values `640px`, `768px`, `1024px`, `1280px`
- **THEN** each token SHALL display a filled bar proportional to the maximum value in the group
- **AND** the bar for `1280px` SHALL fill 100% of the available width

#### Scenario: Value label
- **WHEN** a dimension token is rendered
- **THEN** the token name and value (e.g., `sm — 640px`) SHALL be displayed alongside the bar

### Requirement: Shadow renderer
The component SHALL render `$type: shadow` tokens as card previews with live box-shadow.

#### Scenario: Live shadow preview
- **WHEN** a shadow token has `$value: "0 0 20px rgba(255, 181, 156, 0.1)"`
- **THEN** the component SHALL render a card element with that exact CSS `box-shadow` applied

#### Scenario: Shadow token label
- **WHEN** a shadow token is rendered
- **THEN** the token name, description (if present), and raw CSS value SHALL be displayed below the card

### Requirement: Number renderer
The component SHALL render `$type: number` tokens with appropriate visual feedback.

#### Scenario: Opacity-range number (0 to 1)
- **WHEN** a number token has a numeric `$value` between 0 and 1
- **THEN** the component SHALL render a colored square with the token's value applied as CSS `opacity`

#### Scenario: General number
- **WHEN** a number token has a `$value` outside the 0–1 range
- **THEN** the component SHALL render it as a numeric badge with proportional bar (like dimension)

### Requirement: Font weight renderer
The component SHALL render `$type: fontWeight` tokens as text previews at the given weight.

#### Scenario: Weight preview
- **WHEN** a fontWeight token has `$value: 700`
- **THEN** the component SHALL render the text "Aa" with `font-weight: 700` applied
- **AND** the numeric weight value SHALL be displayed as a label

### Requirement: Gradient renderer
The component SHALL render `$type: gradient` tokens as horizontal strips.

#### Scenario: Gradient strip
- **WHEN** a gradient token has a CSS gradient value
- **THEN** the component SHALL render a full-width bar with that value applied as CSS `background`

### Requirement: Border renderer
The component SHALL render `$type: border` tokens as visible line samples.

#### Scenario: Border line preview
- **WHEN** a border token has a CSS border value
- **THEN** the component SHALL render a horizontal line with that CSS `border` applied

### Requirement: Duration renderer
The component SHALL render `$type: duration` tokens as proportional bars with time labels.

#### Scenario: Duration bar
- **WHEN** a group contains duration tokens (e.g., `300ms`, `500ms`, `1000ms`)
- **THEN** each token SHALL display a proportional bar scaled to the maximum duration in the group
- **AND** the time value SHALL be displayed as a label

### Requirement: Cubic bezier renderer
The component SHALL render `$type: cubicBezier` tokens as SVG curve visualizations.

#### Scenario: Bezier curve display
- **WHEN** a cubicBezier token has `$value: [0.4, 0, 0.2, 1]`
- **THEN** the component SHALL render a small SVG showing the cubic bezier curve with control points

### Requirement: Transition renderer
The component SHALL render `$type: transition` tokens as animated demos.

#### Scenario: Transition preview
- **WHEN** a transition token defines duration and easing
- **THEN** the component SHALL render a block that animates on hover using the defined transition properties

### Requirement: Stroke style renderer
The component SHALL render `$type: strokeStyle` tokens as SVG line samples.

#### Scenario: Stroke preview
- **WHEN** a strokeStyle token has a value like `dashed` or a dasharray pattern
- **THEN** the component SHALL render an SVG line with the corresponding stroke-dasharray applied
