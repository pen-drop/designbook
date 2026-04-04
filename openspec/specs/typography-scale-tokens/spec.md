# typography-scale-tokens Specification

## Purpose
TBD - created by archiving change designbook-design-screen-typography-precision. Update Purpose after archive.
## Requirements
### Requirement: Typography scale tokens in design-tokens.yml

The tokens workflow SHALL support composite typography tokens (`$type: typography`) under `semantic.typography-scale`. Each token represents a semantic role (e.g., `display-lg`, `headline-md`, `body-md`) with `fontSize`, `fontWeight`, `lineHeight`, and `fontFamily` sub-values.

#### Scenario: Tokens intake collects typography scale
- **WHEN** the user runs the tokens workflow intake
- **THEN** Step 3 (Choose Typography) SHALL ask for both font families AND a typography scale with semantic roles
- **THEN** each role SHALL have `fontSize`, `fontWeight`, `lineHeight`, and a reference to a fontFamily token

#### Scenario: Typography scale stored as DTCG composite tokens
- **WHEN** the tokens are saved to `design-tokens.yml`
- **THEN** each role SHALL be stored under `semantic.typography-scale.<role>` with `$type: typography` and `$value` containing `fontSize`, `fontWeight`, `lineHeight`, `fontFamily`

#### Scenario: fontFamily references use DTCG reference syntax
- **WHEN** a typography scale token references a font family
- **THEN** the `fontFamily` value SHALL use DTCG reference format: `{semantic.typography.heading}`

### Requirement: css-generate expands typography scale into CSS custom properties

The `css-generate` workflow SHALL generate CSS custom properties from composite typography tokens by expanding them into individual properties per sub-value.

#### Scenario: Typography scale group in css-mapping
- **WHEN** the `css-mapping` blueprint is loaded for `generate-jsonata`
- **THEN** it SHALL include a `typography-scale` group with `prefix: text`, `path: semantic.typography-scale`, and `expand: typography`

#### Scenario: Composite token expansion in jsonata-template
- **WHEN** a group has `expand: "typography"` in its css-mapping entry
- **THEN** the generated JSONata expression SHALL expand each composite token into three CSS properties: `--text-<role>` (fontSize), `--text-<role>--weight` (fontWeight), `--text-<role>--line-height` (lineHeight)
- **THEN** fontFamily references SHALL NOT be emitted as CSS properties (they are already covered by the `typography` fontFamily group)

#### Scenario: Generated CSS output
- **WHEN** `css-generate` runs the typography-scale group
- **THEN** it SHALL produce `css/tokens/typography-scale.src.css` containing an `@theme` block with `--text-*`, `--text-*--weight`, and `--text-*--line-height` custom properties

