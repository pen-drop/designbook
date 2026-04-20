## MODIFIED Requirements

### Requirement: debo-css-generate uses five-stage architecture

Five stages in order: `intake` (`[css-generate:intake]`), `prepare` (`[prepare-fonts, prepare-icons]`), `generate` (`each: group`, `[generate-jsonata]`), `transform` (`[generate-css]`), `index` (`[generate-index]`).

- `intake` scans the css-mapping blueprint against `design-tokens.yml` and produces a group list as data result. This group list feeds the `each: group` expansion in the `generate` stage.
- `generate` iterates per group via `each: group` using the group list from intake
- `prepare` runs `prepare-fonts` if font extension configured OR local fonts directory exists; skipped otherwise
- After `generate` completes, engine flushes stashed files (`.debo` -> final extension), then `transform` begins
- After `transform` completes, `index` creates barrel file importing all `.src.css` files

#### Scenario: Intake produces group list for expansion
- **WHEN** intake completes and css-mapping defines groups `primitive-color`, `color`, `radius`, `spacing`
- **AND** `design-tokens.yml` contains token data at paths `primitive.color`, `semantic.color`, `semantic.radius`, `semantic.spacing`
- **THEN** intake result includes all four groups, and the generate stage expands one `generate-jsonata` task per group

#### Scenario: Intake skips groups with no matching tokens
- **WHEN** css-mapping defines a `shadow` group with path `semantic.shadow`
- **AND** `design-tokens.yml` does not contain a `semantic.shadow` section
- **THEN** intake does not include `shadow` in the group list and no JSONata file is generated for it

#### Scenario: Generate stage receives empty group list
- **WHEN** intake produces an empty group list (no token paths match any css-mapping group)
- **THEN** the generate stage is skipped and the workflow proceeds to index (which produces an empty barrel file)

### Requirement: Font provider configured via extensions or local directory

Font preparation is triggered by either the google-fonts extension OR the presence of local font files. The `prepare` stage runs `prepare-fonts` when either condition is met.

- With google-fonts extension: google-fonts task matches during `prepare` stage
- With local fonts directory (`$DESIGNBOOK_DIRS_CSS/fonts/`): local-fonts task matches during `prepare` stage
- Without either: no task matches, `prepare` effectively skipped
- Both may be active simultaneously (google-fonts handles its fonts, local-fonts handles the rest)

#### Scenario: Local fonts directory triggers prepare stage
- **WHEN** `$DESIGNBOOK_DIRS_CSS/fonts/` exists and contains font files
- **AND** no google-fonts extension is configured
- **THEN** the local-fonts `prepare-fonts` task runs and generates @font-face CSS

#### Scenario: Neither extension nor local fonts
- **WHEN** no google-fonts extension is configured AND no local fonts directory exists
- **THEN** the prepare stage is skipped silently
