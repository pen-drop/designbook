# tailwind-css-tokens (delta)

Modifications to the tokens intake to consume reference extraction output for color and typography discovery.

## MODIFIED Requirements

### Requirement: Token group naming and CSS output
Each token group maps to `@theme` block custom properties via a css-mapping prefix:

| Group | Token path | CSS property | Markup usage |
|-------|-----------|--------------|-------------|
| layout-width | `component.container.max-width` | `--container-{name}` | Standard Tailwind utility |
| layout-spacing | `component.section.padding-y` | `--layout-spacing-{name}` | `py-[var(--layout-spacing-md)]` (non-standard, requires `var()`) |
| grid | `component.grid.gap` | `--grid-{name}` | `gap-[var(--grid-md)]` (non-standard, requires `var()`) |

Standard sizes suggested for layout-width: sm(640), md(768), lg(1024), xl(1280) -- user may customize.

When a `styles` extraction JSON is available, the intake SHALL use extracted spacing and layout values as defaults for layout-width, layout-spacing, and grid groups instead of suggesting generic values.

#### Scenario: Token naming unchanged
- **WHEN** tokens are generated with extraction data available
- **THEN** the token naming conventions SHALL remain identical to the existing specification
- **AND** only the default values suggested to the user change (extracted values instead of generic defaults)

#### Scenario: Extraction-informed color discovery
- **WHEN** `tokens:intake` Step 2 (Choose Colors) runs
- **AND** a `styles` extraction JSON exists at `$DESIGNBOOK_DATA/design-system/extractions/styles--*.json`
- **THEN** the intake SHALL read the extraction JSON
- **AND** collect all unique `color` and `backgroundColor` values from extracted elements
- **AND** present them as the starting primitive color palette, grouped by hue similarity
- **AND** the user MAY confirm, adjust, or add colors

#### Scenario: Extraction-informed typography discovery
- **WHEN** `tokens:intake` Step 3 (Choose Typography) runs
- **AND** a `styles` extraction JSON exists
- **THEN** the intake SHALL read extracted `fontFamily`, `fontSize`, `fontWeight`, and `lineHeight` values
- **AND** present the most-used font families as heading/body/mono candidates
- **AND** present the full extracted size scale (from largest to smallest) as the typography scale starting point
- **AND** the user MAY confirm, adjust, or override

#### Scenario: Fallback without extraction
- **WHEN** `tokens:intake` runs without a styles extraction JSON
- **THEN** the intake SHALL fall back to its existing behavior: suggest values based on vision.md and user input
- **AND** no error SHALL be raised
