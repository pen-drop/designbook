## MODIFIED Requirements

### Requirement: CSS generation via @theme inline
The `designbook-css-tailwind` skill SHALL generate Tailwind v4 `@theme inline` blocks from design tokens, including typography composite tokens.

#### Scenario: Token group generates CSS file
- **WHEN** the CSS generation pipeline runs for the `container` group
- **THEN** it SHALL produce a `.src.css` file containing `@theme inline { --container-sm: ...; }`
- **AND** Tailwind utilities (`container-sm`, `max-w-sm`) SHALL resolve to these values

#### Scenario: Multiple groups produce separate files
- **WHEN** tokens contain `container`, `spacing`, and `section-spacing` groups
- **THEN** each group SHALL produce a separate `.src.css` file in the tokens output directory

#### Scenario: Typography composite tokens generate individual properties
- **WHEN** the tokens file contains `$type: typography` composite tokens in the `typography` group
- **THEN** the CSS generation SHALL produce individual custom properties for each sub-property
- **AND** the output SHALL follow the pattern `--typography-{name}-{property}: {value}` (e.g., `--typography-h1-font-size: 2.25rem`, `--typography-h1-line-height: 2.5rem`, `--typography-h1-font-weight: 700`)
