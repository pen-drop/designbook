## ADDED Requirements

### Requirement: Local font files generate @font-face CSS

The `prepare-fonts` step SHALL support a local-fonts task that generates `@font-face` CSS from font files in the project's fonts directory (`$DESIGNBOOK_DIRS_CSS/fonts/`). The task activates when the fonts directory exists and contains font files, without requiring any extension configuration.

#### Scenario: Fonts directory with woff2 files
- **WHEN** `$DESIGNBOOK_DIRS_CSS/fonts/` contains `.woff2` files
- **THEN** the task generates `$DESIGNBOOK_DIRS_CSS_TOKENS/fonts.src.css` with one `@font-face` block per font file, using relative paths from the tokens directory to the fonts directory

#### Scenario: No fonts directory
- **WHEN** `$DESIGNBOOK_DIRS_CSS/fonts/` does not exist
- **THEN** the task is skipped silently (no error, no warning)

#### Scenario: Multiple weights of same family
- **WHEN** the fonts directory contains multiple files for the same font family with different weights (e.g., `Sarabun-Light.woff2`, `Sarabun-Regular.woff2`, `Sarabun-Bold.woff2`)
- **THEN** the task generates separate `@font-face` blocks for each weight, deriving the font-weight from the filename suffix (Light=300, Regular=400, Medium=500, SemiBold=600, Bold=700, ExtraBold=800)

#### Scenario: Italic variants
- **WHEN** a font file contains "Italic" in its filename (e.g., `Sarabun-Italic.woff2`, `Sarabun-SemiBoldItalic.woff2`)
- **THEN** the `@font-face` block uses `font-style: italic` and derives font-weight from the non-Italic portion of the suffix

### Requirement: Local fonts task does not conflict with google-fonts extension

The local-fonts task and the google-fonts task SHALL NOT both generate @font-face declarations for the same font family. When the google-fonts extension is active, it takes priority for fonts it manages.

#### Scenario: Google-fonts extension active
- **WHEN** `extensions: google-fonts` is configured AND google-fonts task runs
- **THEN** the local-fonts task only generates @font-face for font files whose family name does NOT match any font family in `semantic.typography` tokens (those are handled by google-fonts)

#### Scenario: No google-fonts extension
- **WHEN** no google-fonts extension is configured
- **THEN** the local-fonts task generates @font-face for ALL font files in the fonts directory

### Requirement: Font-face CSS format

Each `@font-face` block SHALL use `font-display: swap` and reference local woff2 files via relative path. The output file SHALL contain only `@font-face` declarations — no `@import url()` statements or remote URLs.

#### Scenario: Standard @font-face output
- **WHEN** generating @font-face for `fonts/Reef-Bold.woff2`
- **THEN** the output block includes `font-family: 'Reef'`, `font-weight: 700`, `font-display: swap`, `src: url("../fonts/Reef-Bold.woff2") format("woff2")`
