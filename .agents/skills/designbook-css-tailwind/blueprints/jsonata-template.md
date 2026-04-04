---
type: jsonata-template
name: tailwind
priority: 10
when:
  frameworks.css: tailwind
  steps: [generate-jsonata]
---

# JSONata Expression Template — Tailwind v4

Template for generating `.jsonata` expression files that transform `design-tokens.yml` into CSS token files.

## @config Block

The `@config` block uses paths relative to the `.jsonata` file location:

```jsonata
/** @config
 {
   "input": "<relative-path-to-design-tokens.yml>",
   "output": "<relative-path-to-output-css>"
 }
 */
```

- `input`: relative path from the `.jsonata` file to `design-tokens.yml`
- `output`: relative path from the `.jsonata` file to the CSS output. Name the output `{group}.src.css`.

## Expression Template

```jsonata
(
  $entries := $each($$.<token-path>, function($v, $k) {
    $substring($k, 0, 1) != "$" ? "  --<prefix>-" & $k & ": " & $v."$value" & ";"
  });
  "<wrap> {\n" & $join($filter($entries, function($e) { $e != null }), "\n") & "\n}\n"
)
```

Where:
- `<token-path>` — dot-separated path from `css-mapping` blueprint's `path` field (e.g., `semantic.color`)
- `<prefix>` — `prefix` value from css-mapping
- `<wrap>` — `wrap` value from css-mapping, used verbatim as the block opener

Filter entries where key starts with `$` (e.g., `$extensions`, `$type`) to skip metadata.

## DTCG Reference Resolution

When token values contain DTCG references (e.g., `{primitive.color.blue-600}`), there are two resolution modes:

### Hex resolution (default)

Resolves references to their final `$value` (concrete hex). Use for groups that don't have `resolve: "var"` in css-mapping:

```jsonata
$resolve := function($val) {
  $substring($val, 0, 1) = "{" ? (
    $path := $split($replace($replace($val, "{", ""), "}", ""), ".");
    $reduce($path, function($acc, $key) { $lookup($acc, $key) }, $$)."$value"
  ) : $val
};
```

### Var resolution (`resolve: "var"`)

Resolves references to `var()` CSS custom property references. Use for groups with `resolve: "var"` in css-mapping:

```jsonata
$resolveVar := function($val, $prefix) {
  $substring($val, 0, 1) = "{" ? (
    $ref := $replace($replace($val, "{", ""), "}", "");
    $parts := $split($ref, ".");
    $name := $join($filter($parts, function($v, $i) { $i >= 2 }), "-");
    "var(--" & $prefix & "-" & $name & ")"
  ) : $val
};
```

Use `$resolveVar($v."$value", "<prefix>")` instead of bare `$v."$value"` when the group references another token layer via `var()`.

## Typography: fontFamily Quoting

For groups containing `$type: fontFamily` tokens, only include tokens with that type and quote the values:

```jsonata
$v."$type" = "fontFamily" ? "  --<prefix>-" & $k & ": \"" & $v."$value" & "\";"
```

Skip composite typography tokens (`$type: typography`).

## Theme Override Expression Template

For themes declared in the `themes:` section of `design-tokens.yml`, use `@layer theme` with a `[data-theme]` selector instead of `@theme`. The input is the same `design-tokens.yml` — the expression navigates to `$$.themes.<name>.semantic.color`.

### Standard Theme

```jsonata
(
  $entries := $each($$.themes."<name>".semantic.color, function($v, $k) {
    $substring($k, 0, 1) != "$" ? "    --color-" & $k & ": " & $v."$value" & ";"
  });
  "@layer theme {\n  [data-theme=\"<name>\"] {\n" & $join($filter($entries, function($e) { $e != null }), "\n") & "\n  }\n}\n"
)
```

### Dark Mode Theme

If the theme has `$extensions.darkMode: true`, output **both** a `prefers-color-scheme` media query and a `data-theme` selector:

```jsonata
(
  $theme := $$.themes."<name>";
  $entries := $each($theme.semantic.color, function($v, $k) {
    $substring($k, 0, 1) != "$" ? "    --color-" & $k & ": " & $v."$value" & ";"
  });
  $block := $join($filter($entries, function($e) { $e != null }), "\n");
  $dark := $theme."$extensions".darkMode;
  $darkBlock := $dark ? "@layer theme {\n  @media (prefers-color-scheme: dark) {\n    :root {\n" & $block & "\n    }\n  }\n}\n\n" : "";
  $darkBlock & "@layer theme {\n  [data-theme=\"<name>\"] {\n" & $block & "\n  }\n}\n"
)
```

### @config Block for Theme Expressions

Theme expressions use the same `design-tokens.yml` as input:

```jsonata
/** @config
 {
   "input": "../design-system/design-tokens.yml",
   "output": "../../css/tokens/color.theme-<name>.src.css"
 }
 */
```
