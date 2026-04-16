## MODIFIED Requirements

### Requirement: css-mapping blueprint

`blueprints/css-mapping.md` declares all supported groups with prefix, wrap, and path. Groups include: `primitive-color`, `color`, `radius`, `shadow`, `layout-width`, `layout-spacing`, `grid`, `typography`, `primitive-typography`, `typography-scale`, `spacing`, `breakpoints`.

- Standard namespaces (`--color-*`, `--radius-*`, `--shadow-*`, `--container-*`, `--font-*`, `--text-*`, `--spacing-*`, `--breakpoint-*`): Tailwind auto-generates utilities
- Non-standard namespaces (`--layout-spacing-*`, `--grid-*`): consumed via `var()`

#### Scenario: Spacing tokens generate @theme block
- **WHEN** `design-tokens.yml` contains `semantic.spacing` tokens
- **THEN** `generate-jsonata` produces a `spacing.src.css` file with `@theme { --spacing-xs: 0.25rem; ... }` entries

#### Scenario: Breakpoint tokens generate @theme block
- **WHEN** `design-tokens.yml` contains `semantic.breakpoints` tokens
- **THEN** `generate-jsonata` produces a `breakpoints.src.css` file with `@theme { --breakpoint-sm: 600px; ... }` entries

#### Scenario: Missing spacing or breakpoints tokens
- **WHEN** `design-tokens.yml` does not contain `semantic.spacing` or `semantic.breakpoints`
- **THEN** no `.src.css` file is generated for the missing group (same behavior as any other optional group)

### Requirement: Token group naming and CSS output
Each token group maps to `@theme` block custom properties via a css-mapping prefix:

| Group | Token path | CSS property | Markup usage |
|-------|-----------|--------------|-------------|
| layout-width | `component.container.max-width` | `--container-{name}` | Standard Tailwind utility |
| layout-spacing | `component.section.padding-y` | `--layout-spacing-{name}` | `py-[var(--layout-spacing-md)]` (non-standard, requires `var()`) |
| grid | `component.grid.gap` | `--grid-{name}` | `gap-[var(--grid-md)]` (non-standard, requires `var()`) |
| spacing | `semantic.spacing` | `--spacing-{name}` | Standard Tailwind utility (`p-xs`, `m-lg`) |
| breakpoints | `semantic.breakpoints` | `--breakpoint-{name}` | Standard Tailwind responsive prefix (`sm:`, `md:`) |

Standard sizes suggested for layout-width: sm(640), md(768), lg(1024), xl(1280) -- user may customize.

#### Scenario: Spacing used as Tailwind utility
- **WHEN** `--spacing-md` is defined via `@theme`
- **THEN** Tailwind generates utilities like `p-md`, `m-md`, `gap-md` automatically

#### Scenario: Breakpoints used as responsive prefix
- **WHEN** `--breakpoint-md` is defined via `@theme`
- **THEN** Tailwind generates `md:` responsive prefix at that breakpoint value
