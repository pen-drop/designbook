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
  primitive-color:    { path: primitive.color,             prefix: color,           wrap: "@theme static" }
  primitive-radius:   { path: primitive.radius,            prefix: radius,          wrap: "@theme static" }
  primitive-shadow:   { path: primitive.shadow,            prefix: shadow,          wrap: "@theme static" }
  primitive-spacing:  { path: primitive.spacing,           prefix: spacing,         wrap: "@theme static" }
  primitive-font:     { path: primitive.fontFamily,        prefix: font,            wrap: "@theme static" }
  primitive-text:     { path: primitive.fontSize,          prefix: text,            wrap: "@theme static" }
  primitive-weight:   { path: primitive.fontWeight,        prefix: font-weight,     wrap: "@theme static" }
  primitive-leading:  { path: primitive.lineHeight,        prefix: leading,         wrap: "@theme static" }

  # semantic layer ─ purpose/role tokens, reference primitives via var()
  color:              { path: semantic.color,              prefix: color,           wrap: "@theme static", resolve: var }
  radius:             { path: semantic.radius,             prefix: radius,          wrap: "@theme static", resolve: var }
  shadow:             { path: semantic.shadow,             prefix: shadow,          wrap: "@theme static", resolve: var }
  typography:         { path: semantic.typography,         prefix: text,            wrap: "@theme static", expand: typography }

  # component layer ─ component-specific tokens, often nested deeper
  layout-width:       { path: component.container.max-width, prefix: container,      wrap: "@theme static", resolve: var }
  layout-spacing:     { path: component.section.padding-y,   prefix: layout-spacing, wrap: "@theme static", resolve: var }
  grid:               { path: component.grid.gap,            prefix: grid,           wrap: "@theme static", resolve: var }
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

## Path Discovery (arbitrary primitive/semantic nesting)

`CssGroup.path` is a **declared, not necessarily literal**, location. A
consuming project is free to group its primitives (or its semantic/component
tokens) under an extra organizational level for its own reasons — e.g.
`primitive.layout.spacing` and `primitive.layout.radius` instead of the flat
`primitive.spacing` / `primitive.radius` shown above, or
`primitive.style.color` and `primitive.style.fontSize` instead of
`primitive.color` / `primitive.fontSize`. Intake resolves each declared path
as follows, **before** deciding whether a group is emitted:

1. **Try the literal path first.** If `path` exists in `design-tokens.yml`
   and contains at least one leaf (`$value`) anywhere in its subtree, use it
   as-is. This keeps every flat, one-level project (the common case, and
   every existing fixture) resolving exactly as before — same path, same
   output, byte-for-byte.
2. **Otherwise, search for it.** Split the declared path into its root axis
   (the first segment: `primitive`, `semantic`, or `component`) and its
   final segment (the group's own name: `color`, `spacing`, `radius`,
   `fontSize`, …, or for a multi-segment component path such as
   `component.section.padding-y`, the tail formed by everything after the
   root). Breadth-first search every descendant of the root axis for a
   subtree whose own key path ends in that final segment/tail **and** that
   contains at least one leaf token. Depth is unconstrained — one extra
   grouping level (`primitive.layout.spacing`) resolves exactly like two
   (`primitive.foo.bar.spacing`) would.
3. **Resolve ties deterministically.** If more than one subtree in the same
   root axis matches (rare — it means the project reused a group name at two
   different nesting levels), prefer the shallowest match; break remaining
   ties alphabetically by full path. This must never require a follow-up
   question — intake decides deterministically and records which path it
   picked.
4. **Record the discovered path**, not the declared one, as the artifact's
   `token_path` (`CssArtifactPlan.token_path`). `generate-jsonata` always
   walks `token_path`, so the discovery step is the only place nesting depth
   is ever reasoned about; the template itself is unchanged and already
   depth-agnostic *below* whatever root it is told to start from.
5. **Still skip silently if nothing matches.** If no subtree anywhere under
   the root axis ends in the group's final segment and carries a leaf, the
   group is skipped exactly as documented above — this is unchanged, and
   still produces no empty `@theme {}` block.

This makes `path` a **discovery key** for the group's identity (which
namespace and which final name), not a hard requirement on exactly how many
levels separate it from the root.

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

## Theme / Mode Overrides

`design-tokens.yml` may carry a top-level `themes:` map. Each key under it
(`themes.cozy`, `themes.dark`, `themes.hyperstructure`, …) is an **override
tree** shaped exactly like the base tree — its leaves live under the same
kind of path a `groups:` row already describes (`primitive.*`,
`semantic.*`, `component.*`) — but it carries only the tokens that differ
for that theme/mode, not a full copy of the design system.

Intake enumerates theme overrides in a **second pass**, after resolving the
base `groups:` artifacts:

1. For every key `<name>` under `themes.*`, and for every declared
   `groups:` row, run the same [Path Discovery](#path-discovery-arbitrary-primitivesemantic-nesting)
   algorithm scoped to `themes.<name>` as the search root instead of the
   top-level document. E.g. for the `spacing` group (declared path
   `primitive.spacing`), look for a subtree under `themes.cozy` ending in
   `spacing` — whether that is `themes.cozy.primitive.spacing` (flat) or
   `themes.cozy.primitive.layout.spacing` (nested, matching whatever depth
   the base tree itself uses for that project).
2. Emit one override artifact per `(group, theme)` pair that actually has a
   matching, non-empty subtree. Skip pairs with no match — a theme need not
   override every group. The artifact's group id is `<group>-theme-<name>`
   (matches the existing `generate-color-theme-hyperstructure.jsonata`
   naming already produced by this workflow).
3. The override artifact's CSS uses the **same prefix** as its base group,
   but wraps the declarations in a selector block instead of `@theme` — see
   the `jsonata-template` blueprint's *Theme Override Expression Template*.

### Selector attribute derivation

The attribute name and value wrapping a theme's overrides are derived from
the theme node, in this documented order — never guessed ad hoc at
generation time:

1. **Explicit metadata wins.** If `themes.<name>.$extensions.designbook.axis`
   is set, the attribute is `data-<axis>` and the value is
   `themes.<name>.$extensions.designbook.value` if present, otherwise
   `<name>` itself. This is the escape hatch for a project that wants a
   specific attribute/value pair without relying on the heuristics below.
2. **Dark mode.** If `themes.<name>.$extensions.darkMode: true`, the
   attribute is `data-mode` and the value is `dark`. Also emit the
   `prefers-color-scheme: dark` media-query companion block described in
   the template (unchanged from the existing behavior).
3. **Layout/density axis.** If every override this theme contributes
   resolves under a `primitive.*` root (i.e. the theme only re-tunes raw
   scale values such as spacing/radius, not semantic color roles — this is
   the `themes.cozy` shape), the attribute is `data-layout` and the value is
   `<name>`.
4. **Default — alternate palette/theme.** Otherwise (the theme overrides
   `semantic.*` and/or `component.*` values, e.g. an alternate brand
   palette), the attribute is `data-theme` and the value is `<name>`. This
   is the pre-existing, only previously-supported shape
   (`themes.hyperstructure`, `themes.technical-blueprint` in the
   `drupal-stitch` fixture) and stays byte-identical: neither fixture theme
   sets `$extensions.axis` or `darkMode`, and both override
   `semantic.color`, so both still resolve to rule 4 exactly as they do
   today.

## Adding a New Group

To support a new token area, add a row to `groups:` with a unique kebab-case
key, the dotted token path, the desired CSS prefix, and the block wrap. The
path is a discovery key (see above), so it does not need to match the exact
nesting depth of every consuming project. If no subtree anywhere under the
root axis ends in that path's final segment and carries a leaf token, intake
skips the row — adding rows is safe and non-breaking.
