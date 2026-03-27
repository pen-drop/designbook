---
when:
  frameworks.css: tailwind
reads:
  - path: $DESIGNBOOK_OUTPUTS_CONFIG/design-system/design-tokens.yml
    workflow: debo-design-tokens
files:
  - $DESIGNBOOK_OUTPUTS_CONFIG/designbook-css-tailwind/generate-layout-width.jsonata
  - $DESIGNBOOK_OUTPUTS_CONFIG/designbook-css-tailwind/generate-layout-spacing.jsonata
  - $DESIGNBOOK_OUTPUTS_CONFIG/designbook-css-tailwind/generate-google-fonts.jsonata
---

# Generate JSONata Expressions — Tailwind

Generates `.jsonata` expression files for Tailwind v4 `@theme` CSS. Covers structural tokens (layout-width, layout-spacing, grid) and, when present in the YML, visual tokens (color, radius, shadow).

> DaisyUI projects use `designbook-css-daisyui/tasks/generate-jsonata.md` instead (colors are DaisyUI-specific theme variables there).

## Output

```
$DESIGNBOOK_OUTPUTS_CONFIG/
└── designbook-css-tailwind/
    ├── generate-layout-width.jsonata
    ├── generate-layout-spacing.jsonata
    ├── generate-grid.jsonata       (only if grid tokens exist)
    ├── generate-color.jsonata      (only if color tokens exist)
    ├── generate-radius.jsonata     (only if radius tokens exist)
    └── generate-shadow.jsonata     (only if shadow tokens exist)
```

## Step 1: Ensure directory

```bash
mkdir -p $DESIGNBOOK_OUTPUTS_CONFIG/designbook-css-tailwind
```

## Step 2: Inspect token structure

```bash
npx jsonata-w inspect $DESIGNBOOK_OUTPUTS_CONFIG/design-system/design-tokens.yml --summary
```

## Step 3: Generate expression files

### Layout-width → `--container-*` in `@theme` (standard namespace, auto-generates utilities)

`$DESIGNBOOK_OUTPUTS_CONFIG/designbook-css-tailwind/generate-layout-width.jsonata`:

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

`$DESIGNBOOK_OUTPUTS_CONFIG/designbook-css-tailwind/generate-layout-spacing.jsonata`:

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

### Grid → `--grid-*` in `@theme` (optional, only if `grid` group exists)

`$DESIGNBOOK_OUTPUTS_CONFIG/designbook-css-tailwind/generate-grid.jsonata`:

```jsonata
/** @config
 {
   "input": "../design-system/design-tokens.yml",
   "output": "../../css/tokens/grid.src.css"
 }
 */
(
  $entries := $each(grid, function($v, $k) {
    "  --grid-" & $k & ": " & $v."$value" & ";"
  });
  "@theme {\n" & $join($entries, "\n") & "\n}\n"
)
```

### Color → `--color-*` in `@theme` (optional, only if `color` group exists)

`$DESIGNBOOK_OUTPUTS_CONFIG/designbook-css-tailwind/generate-color.jsonata`:

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
  "@theme {\n" & $join($entries, "\n") & "\n}\n"
)
```

### Radius → `--radius-*` in `@theme` (optional, only if `radius` group exists)

Maps to Tailwind's standard `--radius-*` namespace → auto-generates `rounded-*` utilities.

`$DESIGNBOOK_OUTPUTS_CONFIG/designbook-css-tailwind/generate-radius.jsonata`:

```jsonata
/** @config
 {
   "input": "../design-system/design-tokens.yml",
   "output": "../../css/tokens/radius.src.css"
 }
 */
(
  $entries := $each(radius, function($v, $k) {
    "  --radius-" & $k & ": " & $v."$value" & ";"
  });
  "@theme {\n" & $join($entries, "\n") & "\n}\n"
)
```

### Shadow → `--shadow-*` in `@theme` (optional, only if `shadow` group exists)

Maps to Tailwind's standard `--shadow-*` namespace → auto-generates `shadow-*` utilities.

`$DESIGNBOOK_OUTPUTS_CONFIG/designbook-css-tailwind/generate-shadow.jsonata`:

```jsonata
/** @config
 {
   "input": "../design-system/design-tokens.yml",
   "output": "../../css/tokens/shadow.src.css"
 }
 */
(
  $entries := $each(shadow, function($v, $k) {
    "  --shadow-" & $k & ": " & $v."$value" & ";"
  });
  "@theme {\n" & $join($entries, "\n") & "\n}\n"
)
```

### Google Fonts → `@import url(...)` (optional, only if `typography` group exists)

`$DESIGNBOOK_OUTPUTS_CONFIG/designbook-css-tailwind/generate-google-fonts.jsonata`:

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

Only generate this file if the `typography` group is present in the token inspect output.

## Step 4: Verify

Check that expected `.jsonata` files exist. Report any missing files.
