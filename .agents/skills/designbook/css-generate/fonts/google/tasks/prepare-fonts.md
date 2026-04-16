---
trigger:
  steps: [prepare-fonts]
filter:
  extensions: google-fonts
domain: [css]
params:
  type: object
  required: [design_tokens]
  properties:
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      workflow: tokens
      type: object
result:
  type: object
  required: [google-fonts-css]
  properties:
    google-fonts-css:
      path: $DESIGNBOOK_DIRS_CSS_TOKENS/google-fonts.src.css
---

# Prepare Fonts: Download Google Fonts CSS

Downloads Google Fonts CSS based on font family tokens from `design-tokens.yml`.

## Step 1: Read Font Families

Read `semantic.typography` tokens from `design-tokens.yml`. Extract all unique `fontFamily` values (tokens with `$type: fontFamily`).

## Step 2: Derive Font Weights

If `semantic.typography-scale` tokens exist, extract all unique `fontWeight` values referenced in the scale. Otherwise default to `400;500;600;700`.

## Step 3: Download woff2 Files

For each font family, download woff2 files using `google-font-cli`:

```bash
npx google-font-cli download "<Font Name>" -v <w1>,<w2>,<w3> --woff2 -d $DESIGNBOOK_DIRS_CSS/fonts
```

- `<Font Name>`: exact family name (e.g. `"Inter"`, `"Space Grotesk"`)
- `-v`: comma-separated weight values sorted numerically (e.g. `400,500,600,700`)
- `--woff2`: download in woff2 format (modern, small file size)

## Step 4: Write CSS

After downloading, generate `css/tokens/google-fonts.src.css` with `@font-face` declarations for each downloaded woff2 file:

```css
@font-face {
  font-family: '<Font Name>';
  font-style: normal;
  font-weight: <weight>;
  font-display: swap;
  src: url("../fonts/<filename>.woff2") format("woff2");
}
```

- One `@font-face` block per weight per family
- Use relative paths from the token CSS directory to the fonts directory (`../fonts/`)
- The file SHALL contain only `@font-face` declarations with local woff2 references — never remote URLs or `@import url(...)` statements
