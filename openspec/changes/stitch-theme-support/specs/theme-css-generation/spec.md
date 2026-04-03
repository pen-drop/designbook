## ADDED Requirements

### Requirement: CSS generation produces theme override files
The `generate-jsonata` task SHALL scan `$DESIGNBOOK_DATA/design-system/themes/*.yml` and produce a CSS file per theme containing only color overrides.

#### Scenario: Theme file generates CSS with data-theme selector
- **WHEN** `themes/purple.yml` exists with semantic color deltas
- **THEN** the CSS generation SHALL produce `color.theme-purple.src.css`
- **AND** the output SHALL use `@layer theme { [data-theme="purple"] { --color-*: values } }`
- **AND** it SHALL NOT use `@theme`

#### Scenario: No theme files present
- **WHEN** no `themes/` directory exists or it is empty
- **THEN** the CSS generation SHALL produce only the default `color.src.css` as before

#### Scenario: Multiple theme files generate separate CSS files
- **WHEN** `themes/dark.yml` and `themes/purple.yml` both exist
- **THEN** the CSS generation SHALL produce both `color.theme-dark.src.css` and `color.theme-purple.src.css`

### Requirement: Dark mode theme CSS includes prefers-color-scheme media query
A theme file with `$extensions.darkMode: true` SHALL additionally include a `@media (prefers-color-scheme: dark)` rule for automatic dark mode switching without JavaScript.

#### Scenario: Dark mode theme CSS output
- **WHEN** a theme file has `$extensions.darkMode: true`
- **THEN** its CSS output SHALL contain both:
  - `@layer theme { @media (prefers-color-scheme: dark) { :root { --color-*: values } } }`
  - `@layer theme { [data-theme="<name>"] { --color-*: values } }`

#### Scenario: Non-dark theme has no prefers-color-scheme
- **WHEN** a theme file does NOT have `$extensions.darkMode: true`
- **THEN** its CSS output SHALL NOT contain `@media (prefers-color-scheme: dark)`
- **AND** it SHALL only use `[data-theme="<name>"]` selector

### Requirement: Theme CSS files included in index imports
The CSS index file SHALL import theme CSS files alongside the default token CSS files.

#### Scenario: Index file includes theme imports
- **WHEN** theme CSS files are generated
- **THEN** the `tokens/index.src.css` file SHALL include `@import` statements for each `color.theme-*.src.css` file
- **AND** theme imports SHALL appear after the default `color.src.css` import

### Requirement: Theme CSS custom properties use same names as default
Theme override CSS files SHALL use the same `--color-*` custom property names as the default `@theme` block. Tailwind utilities remain unchanged — only the values switch.

#### Scenario: Theme overrides cascade correctly
- **WHEN** a component uses `bg-primary` (Tailwind utility referencing `--color-primary`)
- **AND** `[data-theme="purple"]` is set on a parent element
- **THEN** the component SHALL render with the purple theme's `--color-primary` value
- **AND** no additional Tailwind classes are required

## MODIFIED Requirements

### Requirement: CSS framework skills declare token-to-CSS mappings via css-mapping rule

Each CSS framework skill SHALL provide a `rules/css-mapping.md` file that declares how token groups map to CSS output. The rule body SHALL contain a `groups:` YAML block with entries mapping token group names to `prefix` and `wrap` properties.

#### Scenario: Tailwind css-mapping rule
- **WHEN** `frameworks.css: tailwind`
- **THEN** the `css-mapping` rule from `designbook-css-tailwind/rules/css-mapping.md` is loaded
- **AND** it contains group entries like `color: { prefix: color, wrap: "@theme" }`

#### Scenario: Theme override groups use @layer theme wrap
- **WHEN** the `generate-jsonata` task processes a theme file
- **THEN** it SHALL use `@layer theme { [data-theme="<name>"] { ... } }` as the wrap format instead of the group's default `wrap` property
- **AND** the `prefix` property SHALL remain the same as the default group

#### Scenario: DaisyUI css-mapping rule with plugin wrapper
- **WHEN** `frameworks.css: daisyui`
- **THEN** the `css-mapping` rule from `designbook-css-daisyui/rules/css-mapping.md` is loaded
- **AND** the `color` group uses `wrap: '@plugin "daisyui/theme"'` with `meta` for theme attributes

#### Scenario: Custom framework skill
- **WHEN** a user creates `designbook-css-myframework/rules/css-mapping.md` with `when: frameworks.css: myframework`
- **THEN** the generic `generate-jsonata` task reads it and generates CSS accordingly
- **AND** no task files are needed in the custom framework skill
