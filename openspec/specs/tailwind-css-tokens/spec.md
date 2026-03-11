## ADDED Requirements

### Requirement: Container token naming
The `designbook-css-tailwind` skill SHALL define naming conventions for container max-width tokens.

#### Scenario: Container tokens defined
- **WHEN** the tokens file contains a `container` group
- **THEN** each token name SHALL map to a Tailwind `container-{name}` utility class
- **AND** the generated CSS SHALL produce `--container-{name}: {value}` custom properties via `@theme inline`

#### Scenario: Standard container sizes
- **WHEN** the user runs `/debo-design-tokens` with the tailwind framework
- **THEN** the workflow SHALL suggest standard container sizes: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- **AND** the user MAY customize or add additional sizes

### Requirement: Spacing token naming
The `designbook-css-tailwind` skill SHALL define naming conventions for spacing tokens using a t-shirt scale.

#### Scenario: Spacing tokens defined
- **WHEN** the tokens file contains a `spacing` group
- **THEN** each token name SHALL map to Tailwind spacing utilities (`p-{name}`, `m-{name}`, `gap-{name}`)
- **AND** the generated CSS SHALL produce `--spacing-{name}: {value}` custom properties via `@theme inline`

#### Scenario: Standard spacing scale
- **WHEN** the user runs `/debo-design-tokens`
- **THEN** the workflow SHALL suggest standard spacing values: `xs` (0.5rem), `sm` (1rem), `md` (1.5rem), `lg` (2rem), `xl` (3rem), `2xl` (4rem)

### Requirement: Section-spacing token naming
The `designbook-css-tailwind` skill SHALL define naming conventions for section-spacing tokens (vertical rhythm between page sections).

#### Scenario: Section-spacing tokens defined
- **WHEN** the tokens file contains a `section-spacing` group
- **THEN** each token name SHALL map to section vertical padding (`py-{name}`)
- **AND** the generated CSS SHALL produce `--section-spacing-{name}: {value}` custom properties

#### Scenario: Standard section-spacing scale
- **WHEN** the user runs `/debo-design-tokens`
- **THEN** the workflow SHALL suggest: `sm` (2rem), `md` (4rem), `lg` (6rem)

### Requirement: CSS generation via @theme inline
The `designbook-css-tailwind` skill SHALL generate Tailwind v4 `@theme inline` blocks from design tokens.

#### Scenario: Token group generates CSS file
- **WHEN** the CSS generation pipeline runs for the `container` group
- **THEN** it SHALL produce a `.src.css` file containing `@theme inline { --container-sm: ...; }`
- **AND** Tailwind utilities (`container-sm`, `max-w-sm`) SHALL resolve to these values

#### Scenario: Multiple groups produce separate files
- **WHEN** tokens contain `container`, `spacing`, and `section-spacing` groups
- **THEN** each group SHALL produce a separate `.src.css` file in the tokens output directory

### Requirement: DaisyUI prerequisites on Tailwind
The `designbook-css-daisyui` skill SHALL declare `designbook-css-tailwind` as a prerequisite.

#### Scenario: DaisyUI loads Tailwind first
- **WHEN** the CSS generation pipeline runs with `DESIGNBOOK_FRAMEWORK_CSS=daisyui`
- **THEN** the Tailwind skill SHALL be loaded before the DaisyUI skill
- **AND** spacing naming conventions SHALL come from the Tailwind skill, not DaisyUI

### Requirement: Layout component uses token values
The layout component reference SHALL document that container and section-spacing classes resolve from design tokens.

#### Scenario: Container class linked to token
- **WHEN** a layout component uses `container-md`
- **THEN** the documentation SHALL note that this resolves to `--container-md` from the `container` token group

#### Scenario: Section padding linked to token
- **WHEN** a layout component uses `pb-auto` or `pt-auto`
- **THEN** the documentation SHALL note that `auto` maps to the default section-spacing token (typically `md`)
