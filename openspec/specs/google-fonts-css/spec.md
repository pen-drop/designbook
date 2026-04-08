# google-fonts-css Specification

## Purpose
Defines how Google Fonts are downloaded as local woff2 files and integrated into CSS generation via `@font-face` declarations.

## Requirements

### Requirement: prepare-fonts task in css-generate
A `prepare-fonts` task at `designbook/css-generate/fonts/google/tasks/prepare-fonts.md` downloads Google Fonts woff2 files and generates `@font-face` CSS, gated by `when: extensions: google-fonts`.

- Runs in `prepare` stage, BEFORE `generate` and `transform`
- Not a JSONata pattern — HTTP fetch and file generation
- Reads `semantic.typography` fontFamily tokens from `design-tokens.yml` (all unique `$type: fontFamily` values)
- Weights from `semantic.typography-scale` fontWeight values; defaults to `400,500,600,700` if absent

### Requirement: Download woff2 via google-font-cli
Command: `npx google-font-cli download "<Font Name>" -v <weights> --woff2 -d $DESIGNBOOK_DIRS_CSS/fonts`
- Weights comma-separated, sorted numerically
- woff2 format only

### Requirement: CSS output with local @font-face
Generates `css/tokens/google-fonts.src.css` with `@font-face` declarations referencing local woff2 files.

- `src: url("../fonts/<filename>.woff2") format("woff2")` with `font-display: swap`
- One `@font-face` per weight per family
- No remote URLs or `@import` statements
- Must appear BEFORE any `@theme` blocks referencing the font families

### Requirement: font-url-construction rule
Rule at `designbook/css-generate/fonts/google/rules/font-url-construction.md` defines weight derivation and output format constraints. Loaded when `prepare-fonts` runs with `extensions: google-fonts`.
