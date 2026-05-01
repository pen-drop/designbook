---
trigger:
  steps: [prepare-fonts]
domain: [css]
params:
  type: object
  required: [css_generation_plan, design_tokens]
  properties:
    css_generation_plan:
      $ref: ../../../schemas.yml#/CssGenerationPlan
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      workflow: tokens
      type: object
result:
  type: object
  required: [google-fonts-css]
  properties:
    google-fonts-css:
      path: "{{ css_generation_plan.fonts.font_css_path }}"
      $ref: ../../../schemas.yml#/GoogleFontsCss
---

# Prepare Fonts: Download Google Fonts CSS

Prepare generated font assets according to `css_generation_plan.fonts`.

## Step 1: Read Font Families

Read `semantic.typography` tokens from `design-tokens.yml`. Extract all unique font families unless the plan already provides an explicit family list.

If the plan strategy is `reuse`, keep the existing font stylesheet and binaries in their current locations and return the current stylesheet source as-is.
If the plan strategy is `skip`, return an empty stylesheet string and do not download or modify binaries.

## Step 2: Derive Font Weights

If `semantic.typography-scale` tokens exist, extract all unique `fontWeight` values referenced in the scale. Otherwise default to `400;500;600;700`.

## Step 3: Download woff2 Files

When the plan strategy is `create` or `refresh`, download the required woff2 files into the planned font directory:

```bash
npx google-font-cli download "<Font Name>" -v <w1>,<w2>,<w3> --woff2 -d {{ css_generation_plan.fonts.fonts_dir }}
```

- `<Font Name>`: exact family name (e.g. `"Inter"`, `"Space Grotesk"`)
- `-v`: comma-separated weight values sorted numerically (e.g. `400,500,600,700`)
- `--woff2`: download in woff2 format (modern, small file size)

## Step 4: Write CSS

Generate the planned font stylesheet with `@font-face` declarations for each downloaded woff2 file:

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
- Use relative paths from the planned font stylesheet to the planned font directory
- The file SHALL contain only `@font-face` declarations with local woff2 references — never remote URLs or `@import url(...)` statements

When the strategy is `reuse`, read the existing stylesheet from `css_generation_plan.fonts.font_css_path` and return its current source instead of rewriting it unnecessarily.
