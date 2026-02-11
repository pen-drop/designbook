---
name: Generate CSS
description: Dynamically generates jsonata-w expression files and executes them to produce DaisyUI-compatible CSS
---

# Generate CSS

This step inspects the design tokens, generates a `.jsonata` expression file for each token group, and executes them via `jsonata-w transform` to produce CSS files directly.

> Requires `jsonata-w@1.0.1+` which supports direct string output.

## Prerequisites
- Step 1: Verify Input (completed)
- Step 2: Check Regeneration (completed — regeneration needed)
- `DESIGNBOOK_DIST` and `DESIGNBOOK_DRUPAL_THEME` environment variables are set

## Input
- Token file: `$DESIGNBOOK_DIST/design-tokens.json`
- Output directory for expressions: `$DESIGNBOOK_DIST/designbook-css-daisyui/`

## Process

### 1. Ensure output directories exist

```bash
mkdir -p $DESIGNBOOK_DRUPAL_THEME/css/tokens
mkdir -p $DESIGNBOOK_DRUPAL_THEME/css/themes
mkdir -p $DESIGNBOOK_DIST/designbook-css-daisyui
```

### 2. Inspect token structure

Discover the top-level groups in the token file:

```bash
npx jsonata-w inspect $DESIGNBOOK_DIST/design-tokens.json --summary
```

Each top-level group becomes **one `.jsonata` file** and **one `.src.css` output file**.

### 3. Generate `.jsonata` expression files

For **each top-level group**, create a `.jsonata` file at:

```
$DESIGNBOOK_DIST/designbook-css-daisyui/generate-[group].jsonata
```

Each file returns a **CSS string** that jsonata-w writes directly to the output file:

```jsonata
/** @config
 {
   "input": "../design-tokens.json",
   "output": "../../css/tokens/[group].src.css"
 }
 */
(
  $entries := $each([group], function($v, $k) {
    "  --[group]-" & $k & ": " & $v."$value" & ";"
  });
  ":root {\n" & $join($entries, "\n") & "\n}\n"
)
```

**Rules for generating expressions:**
- Extract tokens from the top-level key
- Transform each token into a CSS custom property: `--[group]-[name]: [value];`
- Wrap in `:root { }` block
- Return as a **string** (jsonata-w 1.0.1+ writes strings directly as raw text)
- For **color** tokens: generate DaisyUI-compatible color variables
- For **typography** tokens: generate `--font-*` variables
- Group-to-file mapping: `color` → `color.src.css`, `typography` → `font.src.css`, etc.

### 4. Generate dark theme (if applicable)

If the token file contains color mode variations, generate:

```
$DESIGNBOOK_DIST/designbook-css-daisyui/generate-dark-theme.jsonata
```

With output `../../css/themes/dark.src.css` using DaisyUI's `@plugin "daisyui/theme"` format.

### 5. Execute all transformations

```bash
for f in $DESIGNBOOK_DIST/designbook-css-daisyui/generate-*.jsonata; do
  npx jsonata-w transform "$f"
done
```

Each transformation directly produces its `.src.css` file — no intermediate files needed.

### 6. Verify execution

- Check exit code of each transformation
- Report any errors

### 7. Ensure CSS imports in `app.src.css`

After generating CSS files, ensure each one is imported in `$DESIGNBOOK_DRUPAL_THEME/css/app.src.css`.

**Process:**

1. Read `$DESIGNBOOK_DRUPAL_THEME/css/app.src.css`
2. For each generated `.src.css` file, check if an `@import` line exists
3. Add missing `@import` lines in the correct section:
   - **Token files** (`tokens/*.src.css`) → under the `/* Include design tokens */` comment block
   - **Theme files** (`themes/*.src.css`) → under the `/* Include DaisyUI themes */` comment block

**Example structure in `app.src.css`:**
```css
/**
 * Include design tokens from Figma
 */
@import "./tokens/color.src.css";
@import "./tokens/font.src.css";
@import "./tokens/spacing.src.css";

/**
 * Include DaisyUI themes
 */
@import "./themes/daisycms.src.css";
@import "./themes/dark.src.css";
```

**Rules:**
- Only add imports that don't already exist (check by filename)
- Preserve existing import order
- Append new token imports after the last `@import "./tokens/...";` line
- Append new theme imports after the last `@import "./themes/...";` line
- If no token/theme section exists yet, create it after the Tailwind import

## Group-to-File Mapping

| Token Group | Output File | Notes |
|-------------|-------------|-------|
| `color` | `tokens/color.src.css` | Primitives + light theme |
| `typography` | `tokens/font.src.css` | Font families, sizes, weights |
| `spacing` | `tokens/spacing.src.css` | With responsive media queries |
| `radius` | `tokens/radius.src.css` | Border radius values |
| `opacity` | `tokens/opacity.src.css` | Opacity values |
| _(color modes)_ | `themes/dark.src.css` | DaisyUI plugin format |
| _(other)_ | `tokens/[group].src.css` | Auto-generated for new groups |

> Unknown groups not in the table should still generate a CSS file using the group name.

## Error Handling
- Transformation fails: Show jsonata-w error output
- Missing `.jsonata` file after generation: Report skill error
- Empty token group: Skip and warn

## Technical Notes
- jsonata-w 1.0.1+ writes string results directly as raw text (no JSON wrapping)
- Dark theme uses DaisyUI's `@plugin "daisyui/theme"` format
- Spacing tokens should include responsive media queries if breakpoint tokens are present
- Use `npx jsonata-w inspect $DESIGNBOOK_DIST/design-tokens.json --summary` to explore token structure
