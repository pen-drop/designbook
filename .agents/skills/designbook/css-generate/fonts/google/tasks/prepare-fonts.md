---
when:
  extensions: google-fonts
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    workflow: tokens
files:
  - file: $DESIGNBOOK_DIRS_CSS_TOKENS/google-fonts.src.css
    key: google-fonts-css
    validators: []
---

# Prepare Fonts: Download Google Fonts CSS

Downloads Google Fonts CSS based on font family tokens from `design-tokens.yml`.

## Step 1: Read Font Families

Read `semantic.typography` tokens from `design-tokens.yml`. Extract all unique `fontFamily` values (tokens with `$type: fontFamily`).

## Step 2: Derive Font Weights

If `semantic.typography-scale` tokens exist, extract all unique `fontWeight` values referenced in the scale. Otherwise default to `400;500;600;700`.

## Step 3: Build Google Fonts URL

For each font family, construct a Google Fonts CSS URL:

```
https://fonts.googleapis.com/css2?family=<Font+Name>:wght@<weights>&display=swap
```

Where `<weights>` is a semicolon-separated list of weight values sorted numerically.

## Step 4: Fetch and Save

Fetch the CSS from each URL and combine into a single file. Write the result to `css/tokens/google-fonts.src.css` containing `@import url(...)` statements for each font family.
