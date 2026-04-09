## ADDED Requirements

### Requirement: Theme override files stored under themes/ directory
The system SHALL store theme color overrides as YAML files in `$DESIGNBOOK_DATA/design-system/themes/`. Each file contains only the `semantic.color.*` tokens that differ from the default `design-tokens.yml`.

#### Scenario: Theme file created from Stitch design system
- **WHEN** the user selects an additional Stitch design system as a theme
- **THEN** the system SHALL create `themes/<kebab-name>.yml` containing only `semantic.color.*` tokens whose values differ from the default
- **AND** each token SHALL have `$value` and `$type: color` properties

#### Scenario: Theme file marked as dark mode
- **WHEN** the user marks a theme as dark mode
- **THEN** the theme file SHALL include `$extensions.darkMode: true` at the root level

#### Scenario: Additional Stitch design system imported as theme
- **WHEN** the user selects an additional Stitch design system as a theme
- **THEN** the system SHALL create `themes/<kebab-name>.yml` where `<kebab-name>` is derived from the design system's `displayName`
- **AND** the file SHALL contain only `semantic.color.*` deltas against the default

#### Scenario: Identical values excluded from delta
- **WHEN** a theme's `semantic.color.*` token has the same value as the default
- **THEN** that token SHALL NOT appear in the theme file

#### Scenario: Near-identical values excluded via Delta-E approximation
- **WHEN** a theme's color value has an RGB euclidean distance < 8 from the default value (approximately Delta-E < 3 CIE76)
- **THEN** that token SHALL be treated as identical and excluded from the theme file

### Requirement: Theme file format follows W3C Design Token structure
Theme files SHALL use the same W3C Design Token YAML format as `design-tokens.yml`, restricted to the `semantic.color` subtree.

#### Scenario: Valid theme file structure
- **WHEN** a theme file is created
- **THEN** it SHALL contain a `semantic.color` root key
- **AND** each leaf token SHALL have `$value` (hex color) and `$type: color`
- **AND** tokens SHALL NOT use `{references}` — only resolved hex values

#### Scenario: Theme file does not contain non-color tokens
- **WHEN** a theme file is created
- **THEN** it SHALL NOT contain `primitive`, `component`, `typography`, `spacing`, `radius`, or any non-color token groups

### Requirement: Stitch intake asks for theme selection
The `stitch-tokens.md` rule SHALL add a theme selection step after the default design system import.

#### Scenario: User imports additional themes
- **WHEN** the default design system is imported
- **THEN** the system SHALL ask "Import additional Stitch design systems as themes?"
- **AND** if confirmed, list available design systems via `list_design_systems`
- **AND** for each selected design system, compute the semantic color delta against the default
- **AND** write `themes/<kebab-name>.yml`

#### Scenario: User marks a theme as dark mode
- **WHEN** one or more themes have been selected
- **THEN** the system SHALL ask "Mark any theme as dark mode?"
- **AND** if the user selects a theme, that theme file SHALL include `$extensions.darkMode: true` at the root level
- **AND** at most one theme SHALL be marked as dark mode

#### Scenario: User declines themes
- **WHEN** the user declines importing additional themes
- **THEN** no `themes/` directory SHALL be created
- **AND** the intake proceeds as before

#### Scenario: Delta summary shown before confirmation
- **WHEN** a theme delta is computed
- **THEN** the system SHALL display the number of changed tokens and a sample of key changes (e.g., primary, surface, background)
- **AND** the user SHALL confirm before the theme file is written
