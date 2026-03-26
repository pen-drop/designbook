# font-size-tokens Specification

## Requirements

### Requirement: fontSize token group
The design token system SHALL support a `fontSize` token group defining a typographic scale.

#### Scenario: fontSize tokens defined
- **WHEN** the tokens file contains a `fontSize` group
- **THEN** each token SHALL have `$type: dimension` with rem values
- **AND** tokens MAY include `$extensions.responsive` for viewport-dependent sizing

#### Scenario: Standard type scale
- **WHEN** the user runs `/debo-design-tokens`
- **THEN** the workflow SHALL suggest a default scale: `h1`, `h2`, `h3`, `title`, `body`, `small`, `caption`
- **AND** heading tokens (`h1`, `h2`, `h3`) SHALL include responsive defaults with a `lg` breakpoint override

#### Scenario: Default fontSize values with Tailwind
- **WHEN** the user runs `/debo-design-tokens` with `DESIGNBOOK_FRAMEWORK_CSS=tailwind`
- **THEN** the suggested defaults SHALL be: `h1` (1.75rem → lg: 2.25rem), `h2` (1.5rem → lg: 1.875rem), `h3` (1.25rem → lg: 1.5rem), `title` (1.125rem → lg: 1.25rem), `body` (1rem), `small` (0.875rem), `caption` (0.75rem)

### Requirement: fontSize required in intake
The token intake workflow SHALL include a step for choosing font sizes.

#### Scenario: Intake asks about font sizes
- **WHEN** the token intake runs
- **THEN** it SHALL present the default type scale and ask the user to confirm or customize
- **AND** the user MAY adjust sizes, add/remove scale steps, or toggle responsive behavior per token

### Requirement: fontSize CSS generation
The `designbook-css-tailwind` skill SHALL generate CSS from fontSize tokens.

#### Scenario: fontSize produces CSS file
- **WHEN** the CSS generation pipeline runs with a `fontSize` group present
- **THEN** it SHALL produce a `font-size.src.css` file
- **AND** static fontSize tokens SHALL produce `--font-size-{name}: {value}` in `@theme`
- **AND** responsive fontSize tokens SHALL produce `:root` + `@media` blocks

### Requirement: fontSize as required group
The `create-tokens.md` task SHALL list `fontSize` as a required token group.

#### Scenario: create-tokens includes fontSize
- **WHEN** the create-tokens task runs
- **THEN** it SHALL validate that a `fontSize` group exists with at least `body` defined
