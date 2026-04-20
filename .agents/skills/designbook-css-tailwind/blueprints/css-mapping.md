---
type: css-mapping
name: tailwind
priority: 10
trigger:
  domain: css
filter:
  frameworks.css: tailwind
---

# CSS Mapping — Tailwind v4

Declares all `CssGroup` entries that the css-generate workflow may emit for a
Tailwind v4 project. Each entry maps a dotted token path inside
`design-tokens.yml` to a CSS custom-property `prefix` and a block `wrap`. The
intake task scans the tokens and **only emits groups whose `path` exists and
contains at least one leaf token** (a node carrying `$value`). Missing or
empty paths are skipped silently — no empty `@theme {}` blocks are produced.

```yaml
groups:
  # primitive layer ─ raw values, never used directly in markup
  primitive-color:    { path: primitive.color,             prefix: color,           wrap: "@theme" }
  primitive-radius:   { path: primitive.radius,            prefix: radius,          wrap: "@theme" }
  primitive-shadow:   { path: primitive.shadow,            prefix: shadow,          wrap: "@theme" }
  primitive-spacing:  { path: primitive.spacing,           prefix: spacing,         wrap: "@theme" }
  primitive-font:     { path: primitive.fontFamily,        prefix: font,            wrap: "@theme" }
  primitive-text:     { path: primitive.fontSize,          prefix: text,            wrap: "@theme" }
  primitive-weight:   { path: primitive.fontWeight,        prefix: font-weight,     wrap: "@theme" }
  primitive-leading:  { path: primitive.lineHeight,        prefix: leading,         wrap: "@theme" }

  # semantic layer ─ purpose/role tokens, reference primitives via var()
  color:              { path: semantic.color,              prefix: color,           wrap: "@theme", resolve: var }
  radius:             { path: semantic.radius,             prefix: radius,          wrap: "@theme", resolve: var }
  shadow:             { path: semantic.shadow,             prefix: shadow,          wrap: "@theme", resolve: var }
  typography:         { path: semantic.typography,         prefix: text,            wrap: "@theme", expand: typography }

  # component layer ─ component-specific tokens, often nested deeper
  layout-width:       { path: component.container.max-width, prefix: container,      wrap: "@theme", resolve: var }
  layout-spacing:     { path: component.section.padding-y,   prefix: layout-spacing, wrap: "@theme", resolve: var }
  grid:               { path: component.grid.gap,            prefix: grid,           wrap: "@theme", resolve: var }
```

## Group Naming

The map key (`primitive-color`, `color`, `layout-spacing`, …) becomes the
`CssGroup.group` identifier. It must be a unique, kebab-case name; the
`generate-jsonata` and `generate-css` stages use it for filenames
(`generate-{group}.jsonata`, `{group}.src.css`).

## Path Walking

`CssGroup.path` is a **dotted, possibly hyphen-containing path** inside
`design-tokens.yml` (e.g. `primitive.color`, `component.section.padding-y`).
The `generate-jsonata` template walks this subtree **recursively** and emits
one CSS custom property per leaf node, joining nested keys with `-`:

- `primitive.color.blue.500` → `--color-blue-500`
- `primitive.fontFamily.heading` → `--font-heading`
- `component.section.padding-y.md` → `--layout-spacing-md`
- `component.container.max-width.lg` → `--container-lg`

Keys starting with `$` (DTCG metadata: `$value`, `$type`, `$extensions`) are
always skipped.

## Modifiers

| Field           | Effect |
|-----------------|--------|
| `resolve: var`  | DTCG references (`{primitive.color.blue.900}`) are emitted as `var(--<prefix>-<flattened-ref>)` instead of being expanded to the final value. Use for the semantic layer when it should re-reference primitives at runtime. |
| `expand: typography` | Each composite `$type: typography` token expands into three CSS custom properties: `--<prefix>-<role>`, `--<prefix>-<role>--weight`, `--<prefix>-<role>--line-height`. The `fontFamily` sub-value is omitted (it is already covered by the `primitive-font` group). |

## Tailwind v4 Namespace Compatibility

Tailwind v4 auto-generates utility classes for the standard namespaces
`--color-*`, `--text-*`, `--font-*`, `--font-weight-*`, `--leading-*`,
`--spacing-*`, `--radius-*`, `--shadow-*`, and `--container-*`. Non-standard
prefixes (`--layout-spacing-*`, `--grid-*`) do not auto-generate utilities and
must be referenced via `var()` in markup or `@utility` rules.

## Adding a New Group

To support a new token area, add a row to `groups:` with a unique kebab-case
key, the dotted token path, the desired CSS prefix, and the block wrap. If
the path doesn't exist in the current `design-tokens.yml`, intake skips the
row — adding rows is safe and non-breaking.
