---
trigger:
  domain: css
filter:
  extensions: google-fonts
---

# Google Fonts URL Construction

## Weight Derivation

Font weights SHALL be derived from `semantic.typography-scale` tokens by collecting all unique `fontWeight` values. If no typography-scale tokens exist, default to `wght@400;500;600;700`.

## Download Tool

Use `google-font-cli` to download woff2 files:

```bash
npx google-font-cli download "<Font Name>" -v <weights> --woff2 -d $DESIGNBOOK_DIRS_CSS/fonts
```

- `-v`: comma-separated weights sorted numerically (e.g. `400,500,600,700`)
- `--woff2`: download in woff2 format (modern, compact)
- `-d`: destination directory for font files

## Output Format

The output file SHALL contain `@font-face` declarations with local woff2 font references — never remote URLs or `@import url(...)` statements. Use relative paths from the token CSS directory to the fonts directory (e.g. `src: url("../fonts/Inter-Regular.woff2") format("woff2")`).
