# css-mapping-convention Specification

## Purpose
Defines how CSS framework skills declare token-to-CSS mappings via rule files, enabling a generic CSS generation pipeline that works across all frameworks.

## Requirements

### Requirement: CSS framework skills declare token-to-CSS mappings via css-mapping rule

Each CSS framework skill SHALL provide a `rules/css-mapping.md` file that declares how token groups map to CSS output. The rule body SHALL contain a `groups:` YAML block with entries mapping token group names to `prefix` and `wrap` properties.

#### Scenario: Tailwind css-mapping rule
- **WHEN** `frameworks.css: tailwind`
- **THEN** the `css-mapping` rule from `designbook-css-tailwind/rules/css-mapping.md` is loaded
- **AND** it contains group entries like `color: { prefix: color, wrap: "@theme" }`

#### Scenario: DaisyUI css-mapping rule with plugin wrapper
- **WHEN** `frameworks.css: daisyui`
- **THEN** the `css-mapping` rule from `designbook-css-daisyui/rules/css-mapping.md` is loaded
- **AND** the `color` group uses `wrap: '@plugin "daisyui/theme"'` with `meta` for theme attributes

#### Scenario: Custom framework skill
- **WHEN** a user creates `designbook-css-myframework/rules/css-mapping.md` with `when: frameworks.css: myframework`
- **THEN** the generic `generate-jsonata` task reads it and generates CSS accordingly
- **AND** no task files are needed in the custom framework skill

### Requirement: css-mapping rule scoped to generation steps

The `css-mapping.md` rule SHALL use `when: steps: [generate-jsonata, generate-css]` to scope itself to CSS generation steps. This makes the mapping available to both the generic CSS generator and any font skill contributing to the same step.

#### Scenario: Rule not loaded during other workflows
- **WHEN** a workflow runs the `create-component` step
- **THEN** the `css-mapping` rule is NOT included in that step's rules

#### Scenario: Rule loaded during CSS generation
- **WHEN** the `generate-jsonata` step runs
- **THEN** the `css-mapping` rule matching the active `frameworks.css` value is included in all tasks' rules for that step

### Requirement: css-mapping groups only generate for present token groups

The `generate-jsonata` task SHALL check which token groups from the mapping actually exist in `design-tokens.yml` and only generate JSONata templates for present groups.

#### Scenario: Token file has color and layout-width but no radius
- **WHEN** `design-tokens.yml` contains `color` and `layout-width` groups but no `radius` group
- **AND** the css-mapping declares `color`, `layout-width`, and `radius`
- **THEN** JSONata templates are generated only for `color` and `layout-width`

### Requirement: Font provider configured via frameworks.fonts

The font provider SHALL be configured in `designbook.config.yml` under `frameworks.fonts`. Font skills provide `tasks/generate-jsonata.md` with `when: frameworks.fonts: <provider>` to contribute a task to the `generate-jsonata` step. If `frameworks.fonts` is not set, no font task matches and no font loading occurs.

#### Scenario: Google Fonts configured
- **WHEN** `designbook.config.yml` has `frameworks.fonts: google-fonts`
- **THEN** the font skill's `generate-jsonata` task matches alongside the generic CSS task
- **AND** both tasks run in parallel during the `generate-jsonata` step

#### Scenario: No font provider configured
- **WHEN** `designbook.config.yml` has no `frameworks.fonts` key
- **THEN** no font task matches for the `generate-jsonata` step
- **AND** only the generic CSS task runs

#### Scenario: Font skill reads css-mapping for font groups
- **WHEN** the font skill's `generate-jsonata` task runs
- **AND** the css-mapping rule declares `typography: { prefix: font, wrap: "@theme" }`
- **THEN** the font skill reads the `typography` token group from `design-tokens.yml` to determine which fonts to load
