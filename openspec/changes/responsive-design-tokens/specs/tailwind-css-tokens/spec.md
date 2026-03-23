## ADDED Requirements

### Requirement: Breakpoint token naming for Tailwind
The `designbook-css-tailwind` skill SHALL define default breakpoint values aligned with Tailwind v4 screens.

#### Scenario: Tailwind breakpoint defaults suggested
- **WHEN** the user runs `/debo-design-tokens` with `DESIGNBOOK_FRAMEWORK_CSS=tailwind`
- **THEN** the intake SHALL suggest breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)

### Requirement: fontSize token naming for Tailwind
The `designbook-css-tailwind` skill SHALL define naming conventions for fontSize tokens.

#### Scenario: fontSize CSS generation
- **WHEN** the tokens file contains a `fontSize` group
- **THEN** the generated CSS SHALL produce `--font-size-{name}: {value}` custom properties
- **AND** Tailwind utilities (`text-h1`, `text-body`) SHALL resolve to these values

### Requirement: Responsive CSS generation pattern
The `designbook-css-tailwind` skill SHALL generate responsive CSS using `:root` + `@media` instead of `@theme` for tokens with `$extensions.responsive`.

#### Scenario: Responsive token generates @media blocks
- **WHEN** a JSONata expression processes a token with `$extensions.responsive`
- **THEN** it SHALL read `breakpoints` from the same input file to resolve `min-width` values
- **AND** output a `:root` block with the base value
- **AND** output `@media (min-width: {breakpoint})` blocks for each responsive override

#### Scenario: Breakpoints group not consumed as CSS output
- **WHEN** the CSS generation pipeline runs
- **THEN** the `breakpoints` group SHALL NOT produce a standalone CSS file
- **AND** breakpoint values SHALL only be consumed internally by JSONata expressions for `@media` resolution

## MODIFIED Requirements

### Requirement: CSS generation via @theme inline
The `designbook-css-tailwind` skill SHALL generate Tailwind v4 `@theme inline` blocks from design tokens.

#### Scenario: Token group generates CSS file
- **WHEN** the CSS generation pipeline runs for a token group
- **THEN** static tokens (without `$extensions.responsive`) SHALL produce `@theme inline { --name: value; }`
- **AND** responsive tokens (with `$extensions.responsive`) SHALL produce `:root` + `@media` blocks instead
- **AND** both patterns MAY coexist in the same `.src.css` file
