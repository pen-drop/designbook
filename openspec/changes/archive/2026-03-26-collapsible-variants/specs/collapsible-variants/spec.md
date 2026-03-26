## ADDED Requirements

### Requirement: Card variant
`DeboCollapsible` SHALL support `variant="card"` as the default variant, preserving the current visual style: white background, border, border-radius 16px, box-shadow, 20px padding, 18px headline.

#### Scenario: Existing usage without variant prop
- **WHEN** `DeboCollapsible` is rendered without a `variant` prop
- **THEN** it SHALL render with the `card` style (white background, shadow, rounded borders)
- **AND** the visual output SHALL be identical to the current implementation

### Requirement: Action-summary variant
`DeboCollapsible` SHALL support `variant="action-summary"` with a status-colored left border, no background, 12px padding, and 14px headline.

#### Scenario: Action-summary renders with left border
- **WHEN** `DeboCollapsible` is rendered with `variant="action-summary"` and `status="running"`
- **THEN** it SHALL have a 3px left border colored `#FEF3C7` (yellow)
- **AND** no background, no shadow, no border-radius

#### Scenario: Action-summary with done status
- **WHEN** `DeboCollapsible` is rendered with `variant="action-summary"` and `status="done"`
- **THEN** the left border SHALL be `#D0FAE5` (green)

#### Scenario: Action-summary with pending status
- **WHEN** `DeboCollapsible` is rendered with `variant="action-summary"` and `status="pending"`
- **THEN** the left border SHALL be `#F1F5F9` (gray)

### Requirement: Action-item variant
`DeboCollapsible` SHALL support `variant="action-item"` with a status-colored left border, no background, 4px padding, and 12px headline.

#### Scenario: Action-item renders compact
- **WHEN** `DeboCollapsible` is rendered with `variant="action-item"` and `status="done"`
- **THEN** it SHALL have a 2px left border colored `#D0FAE5` (green)
- **AND** summary padding SHALL be `4px 4px 4px 8px`
- **AND** summary font-size SHALL be `12px`

#### Scenario: Action-item with running status
- **WHEN** `DeboCollapsible` is rendered with `variant="action-item"` and `status="running"`
- **THEN** the left border SHALL be `#FEF3C7` (yellow)

### Requirement: Progress bar on action-summary
`DeboCollapsible` SHALL support a `progress` prop (`{ done: number, total: number }`) that renders a bottom progress bar on the `action-summary` variant.

#### Scenario: Progress bar shows completion percentage
- **WHEN** `DeboCollapsible` is rendered with `variant="action-summary"` and `progress={{ done: 3, total: 4 }}`
- **THEN** a 3px bottom border SHALL render with 75% green (`#D0FAE5`) and 25% gray (`#F1F5F9`)

#### Scenario: Full progress bar
- **WHEN** `progress={{ done: 4, total: 4 }}`
- **THEN** the entire bottom border SHALL be green (`#D0FAE5`)

#### Scenario: Empty progress bar
- **WHEN** `progress={{ done: 0, total: 4 }}`
- **THEN** the entire bottom border SHALL be gray (`#F1F5F9`)

#### Scenario: No progress prop
- **WHEN** `DeboCollapsible` is rendered without a `progress` prop
- **THEN** no bottom border SHALL render

#### Scenario: Progress ignored on non-action-summary variants
- **WHEN** `DeboCollapsible` is rendered with `variant="card"` and a `progress` prop
- **THEN** the progress bar SHALL NOT render

### Requirement: Status prop ignored on card variant
The `status` prop SHALL have no effect on the `card` variant.

#### Scenario: Card variant ignores status
- **WHEN** `DeboCollapsible` is rendered with `variant="card"` and `status="done"`
- **THEN** the visual output SHALL be identical to `variant="card"` without a status prop
