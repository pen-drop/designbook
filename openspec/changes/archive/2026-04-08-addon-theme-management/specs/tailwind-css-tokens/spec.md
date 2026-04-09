## MODIFIED Requirements

### Requirement: CSS generation via @theme inline
The `designbook-css-tailwind` skill SHALL generate Tailwind v4 `@theme inline` blocks from design tokens, including typography composite tokens.

#### Scenario: Token group generates CSS file
- **WHEN** the CSS generation pipeline runs for a token group
- **THEN** static tokens (without `$extensions.responsive`) SHALL produce `@theme inline { --name: value; }`
- **AND** responsive tokens (with `$extensions.responsive`) SHALL produce `:root` + `@media` blocks instead
- **AND** both patterns MAY coexist in the same `.src.css` file

#### Scenario: Theme override CSS uses data-theme selector
- **WHEN** the CSS generation pipeline produces theme override files
- **THEN** theme CSS SHALL use `@layer theme { [data-theme="<name>"] { ... } }` selectors
- **AND** themes with `$extensions.darkMode: true` SHALL additionally produce `@media (prefers-color-scheme: dark)` blocks
- **AND** no JavaScript theme export SHALL be generated (the addon handles theme discovery)
