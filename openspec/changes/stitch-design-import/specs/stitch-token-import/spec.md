## ADDED Requirements

### Requirement: stitch-tokens rule imports designTheme during tokens intake

The `designbook-stitch` skill SHALL provide `rules/stitch-tokens.md` with `when: steps: [tokens:intake], design_tool.type: stitch` that fetches the Stitch project's designTheme and proposes token values.

#### Scenario: Full designTheme available
- **WHEN** the tokens intake loads the stitch-tokens rule
- **AND** `get_project` returns a designTheme with customColor, headlineFont, bodyFont, and roundness
- **THEN** the rule instructs the agent to propose:
  - `color.primary` from `customColor` or `overridePrimaryColor`
  - `color.secondary` from `overrideSecondaryColor` (if set)
  - `color.tertiary` from `overrideTertiaryColor` (if set)
  - `typography.heading.font_family` from `headlineFont` enum
  - `typography.body.font_family` from `bodyFont` enum
  - `spacing.border_radius` from `roundness` enum

#### Scenario: Partial designTheme
- **WHEN** the designTheme has only some fields set
- **THEN** the rule proposes only the fields that exist
- **AND** the remaining fields are gathered through normal intake dialog

#### Scenario: User modifies proposed values
- **WHEN** the agent presents Stitch-derived values
- **THEN** the user MAY accept, modify, or reject each value
- **AND** the intake continues normally with the user's choices

#### Scenario: Stitch MCP unavailable
- **WHEN** `get_project` fails or returns an error
- **THEN** the rule is silently skipped
- **AND** the tokens intake proceeds without Stitch data

### Requirement: Font enum mapping

The stitch-tokens rule SHALL map Stitch font enums to Google Fonts names.

#### Scenario: Common font mappings
- **WHEN** designTheme contains font enums
- **THEN** the mapping includes: `INTER` → `"Inter"`, `DM_SANS` → `"DM Sans"`, `SPACE_GROTESK` → `"Space Grotesk"`, `MANROPE` → `"Manrope"`, `WORK_SANS` → `"Work Sans"`, `PLUS_JAKARTA_SANS` → `"Plus Jakarta Sans"`, `EPILOGUE` → `"Epilogue"`, `PUBLIC_SANS` → `"Public Sans"`, and all other enums from the Stitch API

### Requirement: Roundness enum mapping

The stitch-tokens rule SHALL map Stitch roundness enums to pixel values.

#### Scenario: Roundness mappings
- **WHEN** designTheme contains a roundness enum
- **THEN** the mapping is: `ROUND_FOUR` → `"4px"`, `ROUND_EIGHT` → `"8px"`, `ROUND_TWELVE` → `"12px"`, `ROUND_FULL` → `"9999px"`

### Requirement: design_tool.type from designbook config

The rule's `when` condition SHALL use `design_tool.type: stitch` which is read from the designbook config (not guidelines.yml).

#### Scenario: Stitch configured in designbook config
- **WHEN** the designbook config has `design_tool.type: stitch`
- **THEN** the stitch-tokens rule matches for the `tokens:intake` step

#### Scenario: No design tool configured
- **WHEN** the designbook config does not have `design_tool.type`
- **THEN** the stitch-tokens rule does not match
