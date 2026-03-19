---
when:
  frameworks.css: daisyui
reads:
  - path: $DESIGNBOOK_DIST/design-system/design-tokens.yml
    workflow: debo-design-tokens
files:
  - $DESIGNBOOK_DIST/designbook-css-daisyui/generate-color.jsonata
  - $DESIGNBOOK_DIST/designbook-css-daisyui/generate-font.jsonata
  - $DESIGNBOOK_DIST/designbook-css-daisyui/generate-google-fonts.jsonata
  - $DESIGNBOOK_DIST/designbook-css-tailwind/generate-layout-width.jsonata
  - $DESIGNBOOK_DIST/designbook-css-tailwind/generate-layout-spacing.jsonata
---

# Generate JSONata Expressions — DaisyUI

Generates `.jsonata` expression files for DaisyUI-compatible CSS. DaisyUI extends Tailwind, so this task generates expressions for **both** DaisyUI-specific tokens (color, font) **and** Tailwind structural tokens (layout-width, layout-spacing).

## Output

```
$DESIGNBOOK_DIST/
├── designbook-css-daisyui/
│   ├── generate-color.jsonata
│   ├── generate-font.jsonata
│   └── generate-google-fonts.jsonata
└── designbook-css-tailwind/
    ├── generate-layout-width.jsonata
    └── generate-layout-spacing.jsonata
```

## Step 1: Ensure directories

```bash
mkdir -p $DESIGNBOOK_DIST/designbook-css-daisyui
mkdir -p $DESIGNBOOK_DIST/designbook-css-tailwind
```

## Step 2: Inspect token structure

```bash
npx jsonata-w inspect $DESIGNBOOK_DIST/design-system/design-tokens.yml --summary
```

## Step 3: Generate expression files

### Color → DaisyUI theme plugin format

`$DESIGNBOOK_DIST/designbook-css-daisyui/generate-color.jsonata`:

```jsonata
/** @config
 {
   "input": "../design-system/design-tokens.yml",
   "output": "../../css/tokens/color.src.css"
 }
 */
(
  $entries := $each(color, function($v, $k) {
    "  --color-" & $k & ": " & $v."$value" & ";"
  });
  "@plugin \"daisyui/theme\" {\n  name: \"mytheme\";\n  default: true;\n  color-scheme: light;\n\n" & $join($entries, "\n") & "\n}\n"
)
```

### Typography → `--font-*` variables in `@theme`

`$DESIGNBOOK_DIST/designbook-css-daisyui/generate-font.jsonata`:

```jsonata
/** @config
 {
   "input": "../design-system/design-tokens.yml",
   "output": "../../css/tokens/font.src.css"
 }
 */
(
  $entries := $each(typography, function($v, $k) {
    "  --font-" & $k & ": \"" & $v."$value" & "\";"
  });
  "@theme {\n" & $join($entries, "\n") & "\n}\n"
)
```

### Google Fonts → `@import url(...)` for all typography fonts

`$DESIGNBOOK_DIST/designbook-css-daisyui/generate-google-fonts.jsonata`:

```jsonata
/** @config
 {
   "input": "../design-system/design-tokens.yml",
   "output": "../../css/tokens/google-fonts.src.css"
 }
 */
(
  $families := $each(typography, function($v, $k) {
    "family=" & $replace($v."$value", " ", "+") & ":ital,wght@0,400;0,500;0,600;0,700"
  });
  $url := "https://fonts.googleapis.com/css2?" & $join($families, "&") & "&display=swap";
  "@import url(\"" & $url & "\");\n"
)
```

### Layout-width → `--container-*` in `@theme` (Tailwind standard namespace)

`$DESIGNBOOK_DIST/designbook-css-tailwind/generate-layout-width.jsonata`:

```jsonata
/** @config
 {
   "input": "../design-system/design-tokens.yml",
   "output": "../../css/tokens/layout-width.src.css"
 }
 */
(
  $entries := $each($."layout-width", function($v, $k) {
    "  --container-" & $k & ": " & $v."$value" & ";"
  });
  "@theme {\n" & $join($entries, "\n") & "\n}\n"
)
```

### Layout-spacing → `--layout-spacing-*` in `@theme` (non-standard, use with `var()`)

`$DESIGNBOOK_DIST/designbook-css-tailwind/generate-layout-spacing.jsonata`:

```jsonata
/** @config
 {
   "input": "../design-system/design-tokens.yml",
   "output": "../../css/tokens/layout-spacing.src.css"
 }
 */
(
  $entries := $each($."layout-spacing", function($v, $k) {
    "  --layout-spacing-" & $k & ": " & $v."$value" & ";"
  });
  "@theme {\n" & $join($entries, "\n") & "\n}\n"
)
```

## Step 4: Verify

Check that all expected `.jsonata` files exist. Report any missing files.
