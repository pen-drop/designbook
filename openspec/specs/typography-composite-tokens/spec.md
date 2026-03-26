# typography-composite-tokens Specification

## Requirements

### Requirement: Typography composite token format
The design token system SHALL support `$type: typography` tokens with an object `$value` containing typographic properties.

#### Scenario: Valid typography token
- **WHEN** a token has `$type: typography`
- **THEN** the `$value` SHALL be an object with optional keys: `fontFamily` (string), `fontSize` (string), `lineHeight` (string), `fontWeight` (number), `letterSpacing` (string)
- **AND** at least `fontSize` SHALL be present

#### Scenario: Schema validation accepts typography composite
- **WHEN** a `design-tokens.yml` file contains a token with `$type: typography` and `$value` as an object
- **THEN** the schema validator SHALL accept it as valid

#### Scenario: Schema validation rejects invalid typography
- **WHEN** a `design-tokens.yml` file contains a token with `$type: typography` and `$value` as a plain string
- **THEN** the schema validator SHALL reject it

### Requirement: Typography tokens coexist with fontFamily tokens
The typography group SHALL support both `$type: fontFamily` and `$type: typography` tokens.

#### Scenario: Mixed typography group
- **WHEN** the `typography` group contains `heading` (`$type: fontFamily`) and `h1` (`$type: typography`)
- **THEN** both SHALL be valid and parsed correctly

### Requirement: Type-scale rendering from typography tokens
The `DeboDesignTokens` typography section SHALL render `$type: typography` tokens as a type-scale table with real data.

#### Scenario: Type-scale table display
- **WHEN** the typography group contains `$type: typography` tokens
- **THEN** the component SHALL render a table with columns: style name, preview text (in actual font/size/weight), and size/line-height metrics
- **AND** rows SHALL be sorted by `fontSize` descending

#### Scenario: Hardcoded TYPE_SCALE removed
- **WHEN** the typography section renders
- **THEN** it SHALL NOT use any hardcoded font size, line-height, or weight constants
- **AND** all displayed values SHALL come from token data

#### Scenario: No typography composite tokens
- **WHEN** the typography group contains only `$type: fontFamily` tokens and no `$type: typography` tokens
- **THEN** the type-scale table SHALL NOT be rendered
- **AND** only font family cards SHALL be displayed

### Requirement: Free-form type-scale token names
Token names within the typography group for `$type: typography` tokens SHALL be user-defined.

#### Scenario: Custom token names
- **WHEN** a user defines tokens named `display`, `hero-title`, `body-lg`, `fine-print`
- **THEN** the renderer SHALL display all of them in the type-scale table sorted by fontSize

### Requirement: Skill generates type-scale tokens
The `designbook-tokens` skill (`create-tokens.md`) SHALL generate `$type: typography` composite tokens alongside `$type: fontFamily` tokens.

#### Scenario: Default type-scale generation
- **WHEN** the skill creates typography tokens
- **THEN** it SHALL generate type-scale tokens with names like `h1`, `h2`, `h3`, `body-lg`, `body`, `small`, `caption`
- **AND** font sizes SHALL follow a modular scale from a 16px base
- **AND** each token SHALL include `fontFamily`, `fontSize`, `lineHeight`, and `fontWeight`

#### Scenario: Type-scale references heading/body fonts
- **WHEN** the skill generates type-scale tokens
- **THEN** heading-level tokens (h1, h2, h3) SHALL use the heading font family value
- **AND** body-level tokens (body-lg, body, small, caption) SHALL use the body font family value
