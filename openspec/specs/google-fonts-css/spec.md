# google-fonts-css Specification

## Purpose
TBD - created by archiving change designbook-design-screen-typography-precision. Update Purpose after archive.
## Requirements
### Requirement: Google Fonts download task in css-generate

A dedicated `download-fonts` task under `designbook/css-generate/fonts/google/` SHALL fetch Google Fonts CSS, gated by `when: extensions: google-fonts`.

#### Scenario: Task location and extension gate
- **WHEN** the `css-generate` workflow loads tasks
- **THEN** the `download-fonts` task SHALL be located at `designbook/css-generate/fonts/google/tasks/download-fonts.md`
- **THEN** it SHALL only be loaded when `extensions: google-fonts` is active

#### Scenario: download-fonts is a separate task step
- **WHEN** the `css-generate` workflow runs
- **THEN** `download-fonts` SHALL execute as a dedicated step BEFORE `generate-jsonata` and `generate-css`
- **THEN** it SHALL NOT use the JSONata expression pattern — it is an HTTP fetch operation

#### Scenario: Font families derived from tokens
- **WHEN** the `download-fonts` task runs
- **THEN** it SHALL read `semantic.typography` fontFamily tokens from `design-tokens.yml`
- **THEN** it SHALL build a Google Fonts API URL for each unique font family

#### Scenario: Font weights derived from typography scale
- **WHEN** `semantic.typography-scale` tokens exist
- **THEN** the Google Fonts URL SHALL include all font weights referenced in the scale (e.g., `wght@400;600;700`)
- **WHEN** no typography-scale tokens exist
- **THEN** it SHALL default to `wght@400;500;600;700`

#### Scenario: CSS output
- **WHEN** the fonts are fetched
- **THEN** the task SHALL save the result to `css/tokens/google-fonts.src.css`
- **THEN** the file SHALL contain `@import url(...)` statements that load the fonts

#### Scenario: Cascade ordering
- **WHEN** `google-fonts.src.css` is included in the CSS index
- **THEN** it SHALL appear BEFORE any `@theme` blocks that reference the font families

