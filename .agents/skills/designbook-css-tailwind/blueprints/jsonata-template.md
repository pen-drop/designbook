---
type: jsonata-template
name: tailwind
priority: 10
trigger:
  steps: [generate-jsonata]
filter:
  frameworks.css: tailwind
---

# JSONata Expression Template — Tailwind v4

Template for generating `.jsonata` expressions that transform
`design-tokens.yml` into CSS token files. The expression walks the configured
token subtree **recursively**, flattens nested keys into dash-separated CSS
variable names, skips DTCG metadata (`$value`, `$type`, `$extensions`, …), and
emits `$value` verbatim. `fontFamily` source values must already be CSS-valid
(quoted multi-word names, comma-separated fallbacks); the template does not
post-process them.

The leaf-emit branch has three variants depending on the `CssGroup` flags:

| Variant         | Condition           | Behavior |
|-----------------|---------------------|----------|
| Default         | no `resolve`/`expand` | Emit `--<prefix>-<flat>: <value>;` |
| Var-resolve     | `resolve: var`      | DTCG references → `var(--<prefix>-<flat-ref>)` |
| Typography-expand | `expand: typography` | Composite `$type: typography` → 3 properties (size/weight/line-height) |

## CSS Value Normalization

Normalize emitted CSS literals before writing them. Decimal values must include
a leading zero so formatter/stylelint validation passes:

- `.1` → `0.1`
- `-.25` → `-0.25`

## @config Block

The `@config` block uses paths relative to the `.jsonata` file. Intake chooses the final target directories; the `generate-jsonata` task passes the artifact's relative output path into this template.

```jsonata
/** @config
 {
   "input": "../design-system/design-tokens.yml",
   "output": "<config_output_path>"
 }
 */
```

`<config_output_path>` is the artifact's CSS output path relative to the JSONata
file itself (e.g. `../../css/tokens/color.src.css`).

## Default Expression — Recursive Flatten

Use this template when the group has neither `resolve` nor `expand`. It uses
`$lookup`/`$keys` so hyphenated keys (`max-width`, `padding-y`) and arbitrary
nesting depth work without manual quoting.

```jsonata
(
  $normalizeCssValue := function($val) {
    $type($val) = "string"
      ? $replace($replace($val, /(^|[\s(:,])\.(\d)/, "$10.$2"), /(^|[\s(:,])-\.(\d)/, "$1-0.$2")
      : $val
  };
  $walk := function($node, $path) {
    $reduce(
      $keys($node),
      function($acc, $k) {
        $substring($k, 0, 1) != "$" ? (
          $v := $lookup($node, $k);
          $sub := $path = "" ? $k : $path & "-" & $k;
          $exists($v."$value")
            ? $append($acc, "  --<prefix>-" & $sub & ": " & $normalizeCssValue($v."$value") & ";")
            : $append($acc, $walk($v, $sub))
        ) : $acc
      },
      []
    )
  };
  $node := $reduce($split("<path>", "."), function($a, $s) { $lookup($a, $s) }, $$);
  $lines := $walk($node, "");
  $count($lines) > 0
    ? "<wrap> {\n" & $join($lines, "\n") & "\n}\n"
    : ""
)
```

Substitute:
- `<path>` — `CssGroup.path` (e.g. `primitive.color`, `component.section.padding-y`)
- `<prefix>` — `CssGroup.prefix` (e.g. `color`, `layout-spacing`)
- `<wrap>` — `CssGroup.wrap` (e.g. `@theme`)

## Var-Resolution Expression (`resolve: var`)

When the group should re-reference primitives via `var()` instead of expanding
them, replace the leaf-emit branch. The resolver translates the second segment
of the DTCG ref (the primitive type) to its CSS prefix, so refs work even when
the consuming group's prefix differs:

```jsonata
$normalizeCssValue := function($val) {
  $type($val) = "string"
    ? $replace($replace($val, /(^|[\s(:,])\.(\d)/, "$10.$2"), /(^|[\s(:,])-\.(\d)/, "$1-0.$2")
    : $val
};
$exists($v."$value") ? (
  $val := $v."$value";
  $resolved := $substring($val, 0, 1) = "{" ? (
    $ref := $replace($replace($val, "{", ""), "}", "");
    $parts := $split($ref, ".");
    $type := $parts[1];
    $primPrefix := $type = "fontFamily" ? "font"
      : $type = "fontSize" ? "text"
      : $type = "fontWeight" ? "font-weight"
      : $type = "lineHeight" ? "leading"
      : $type;
    "var(--" & $primPrefix & "-" & $join($filter($parts, function($p, $i) { $i >= 2 }), "-") & ")"
  ) : $normalizeCssValue($val);
  $append($acc, "  --<prefix>-" & $sub & ": " & $resolved & ";")
)
: $append($acc, $walk($v, $sub))
```

The reference `{primitive.color.blue.900}` becomes `var(--color-blue-900)`
and `{primitive.spacing.6}` becomes `var(--spacing-6)`. The first two segments
are dropped; the second segment selects the primitive layer's prefix
(`color`, `spacing`, `radius`, `text`, `font`, `font-weight`, `leading`).

## Composite Typography Expansion (`expand: typography`)

When the group expands composite `$type: typography` tokens, use a
single-level iteration (composites are flat under the configured path):

Composite sub-values are typically DTCG refs (e.g.
`{primitive.fontSize.xl}`) and must be resolved to `var()` before emission —
unresolved braces produce invalid CSS:

```jsonata
(
  $normalizeCssValue := function($val) {
    $type($val) = "string"
      ? $replace($replace($val, /(^|[\s(:,])\.(\d)/, "$10.$2"), /(^|[\s(:,])-\.(\d)/, "$1-0.$2")
      : $val
  };
  $resolve := function($val) {
    $substring($val, 0, 1) = "{" ? (
      $ref := $replace($replace($val, "{", ""), "}", "");
      $parts := $split($ref, ".");
      $type := $parts[1];
      $primPrefix := $type = "fontFamily" ? "font"
        : $type = "fontSize" ? "text"
        : $type = "fontWeight" ? "font-weight"
        : $type = "lineHeight" ? "leading"
        : $type;
      "var(--" & $primPrefix & "-" & $join($filter($parts, function($p, $i) { $i >= 2 }), "-") & ")"
    ) : $normalizeCssValue($val)
  };
  $node := $reduce($split("<path>", "."), function($a, $s) { $lookup($a, $s) }, $$);
  $entries := $each($node, function($v, $k) {
    $substring($k, 0, 1) != "$" and $v."$type" = "typography" ? (
      $val := $v."$value";
      "  --<prefix>-" & $k & ": " & $resolve($val.fontSize) & ";\n" &
      "  --<prefix>-" & $k & "--weight: " & $resolve($val.fontWeight) & ";\n" &
      "  --<prefix>-" & $k & "--line-height: " & $resolve($val.lineHeight) & ";"
    )
  });
  $lines := $filter($entries, function($e) { $e != null });
  $count($lines) > 0
    ? "<wrap> {\n" & $join($lines, "\n") & "\n}\n"
    : ""
)
```

The `fontFamily` sub-value is intentionally omitted — it is already covered
by the `primitive-font` group.

## Theme Override Expression Template

For themes declared in the `themes:` section of `design-tokens.yml`, use
`@layer theme` with a `[data-theme]` selector instead of `@theme`. The input
is the same `design-tokens.yml`; the expression navigates to
`$$.themes.<name>.semantic.color`.

### Standard Theme

```jsonata
(
  $entries := $each($$.themes."<name>".semantic.color, function($v, $k) {
    $substring($k, 0, 1) != "$" ? "    --color-" & $k & ": " & $v."$value" & ";"
  });
  $lines := $filter($entries, function($e) { $e != null });
  $count($lines) > 0
    ? "@layer theme {\n  [data-theme=\"<name>\"] {\n" & $join($lines, "\n") & "\n  }\n}\n"
    : ""
)
```

### Dark Mode Theme

If the theme has `$extensions.darkMode: true`, output **both** a
`prefers-color-scheme` media query and a `data-theme` selector:

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
   "output": "<theme_config_output_path>"
 }
 */
```
