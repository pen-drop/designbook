# responsive-tokens Specification

## Requirements

### Requirement: Responsive extensions on dimension tokens
The design token system SHALL support `$extensions.responsive` on any token with `$type: dimension`.

#### Scenario: Responsive token format
- **WHEN** a dimension token includes `$extensions.responsive`
- **THEN** the value SHALL be an object mapping breakpoint keys to dimension values
- **AND** each key SHALL correspond to a token name in the `breakpoints` group
- **AND** `$value` SHALL represent the mobile-first base value

#### Scenario: Token without responsive extensions
- **WHEN** a dimension token does not include `$extensions.responsive`
- **THEN** it SHALL behave as today — a single static CSS variable via `@theme`

### Requirement: Stepped @media CSS generation
Responsive tokens SHALL generate CSS using `:root` and `@media (min-width)` blocks instead of `@theme`.

#### Scenario: Single responsive breakpoint
- **WHEN** a token has `$extensions.responsive` with one breakpoint key (e.g., `lg: "2.25rem"`)
- **THEN** the generated CSS SHALL contain a `:root` block with the base `$value`
- **AND** an `@media (min-width: <breakpoints.lg>)` block with the override value

#### Scenario: Multiple responsive breakpoints
- **WHEN** a token has `$extensions.responsive` with multiple keys (e.g., `sm: "1rem"`, `lg: "1.5rem"`)
- **THEN** the generated CSS SHALL contain one `:root` block with the base `$value`
- **AND** one `@media` block per breakpoint, ordered by ascending `min-width`

#### Scenario: Mixed file with static and responsive tokens
- **WHEN** a token group contains both static and responsive tokens
- **THEN** static tokens SHALL be in an `@theme` block
- **AND** responsive tokens SHALL use `:root` + `@media` blocks
- **AND** both SHALL appear in the same `.src.css` file

### Requirement: Invalid breakpoint key detection
The CSS generation pipeline SHALL detect invalid breakpoint references.

#### Scenario: Unknown breakpoint key
- **WHEN** a responsive token references a key not present in the `breakpoints` group
- **THEN** the JSONata expression SHALL skip that key
- **AND** emit a CSS comment warning: `/* WARNING: unknown breakpoint "<key>" */`

### Requirement: Schema validation for $extensions.responsive
The `design-tokens.schema.yml` SHALL validate the structure of `$extensions.responsive`.

#### Scenario: Valid responsive extension
- **WHEN** a token has `$extensions.responsive` with string values
- **THEN** schema validation SHALL pass

#### Scenario: Invalid responsive extension type
- **WHEN** a token has `$extensions.responsive` with non-string values (e.g., numbers, objects)
- **THEN** schema validation SHALL fail
