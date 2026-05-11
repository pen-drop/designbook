---
name: designbook:design:region-properties
trigger:
  steps: [create-component, create-scene]
---

# Region Properties

When `region_properties` is set and `region_properties.matched_via !== "none"`,
the `nodes[]` describe the actual rendered subtree of the region this task
covers. Their `style` values are observed browser computed styles — useful as
**ground truth for what the site renders**, but they must be **translated**,
not stamped.

## Hard constraints

### NEVER use inline `style="..."` attributes in generated markup

Twig output **MUST** use Tailwind utility classes (via `class="..."`) and
class-targeted rules in `${DESIGNBOOK_CSS_APP}`. The project framework is
Tailwind — every visual property goes through a class. No exceptions, no
"just this once" inline styles for `style.background` or anything else.

### ALWAYS use design tokens first; extend them when needed

The captured `style.background`, `style.foreground`, `style.font_*`,
`style.padding`, `style.gap`, `style.border_radius` values must map to
**design tokens** before they become Tailwind classes:

1. Read `$DESIGNBOOK_DATA/design-system/design-tokens.yml`.
2. If the captured value matches an existing token (exact or near-exact for
   colors, exact for spacing/radius), reference that token.
3. If the captured value is **not** covered, **extend `design-tokens.yml`**
   with a new token entry before generating markup. Hardcoding a hex color
   or `px` value in `app.src.css` is not acceptable.
4. Generate Tailwind classes that reference the (existing or extended)
   tokens — e.g. `bg-surface-bibb`, `max-w-shell`, `py-sm`, never raw
   `bg-[#ececec]` arbitrary-value classes unless a token genuinely has no
   sensible name.

### Filter computed-style noise — do not treat defaults as design intent

Computed styles include many values that are browser defaults, not design
choices. Use these heuristics to **drop** rather than carry through:

- `style.background = ''` / `transparent` / `rgba(0,0,0,0)` → drop. The
  visible color is on a child row or a parent; let inheritance / the child
  bring it. Never write `background: ;` or `bg-transparent` from this signal.
- `style.foreground = '#000000'` on body-level nodes → drop unless the
  brand explicitly uses pure black. Pure black is the browser default.
- `style.font_family` starting with `system-ui` / `-apple-system` /
  `BlinkMacSystemFont` → drop. That's the browser fallback stack visible
  because the brand webfont failed to load in the capture. Use the project's
  typography tokens (`font-sans` → resolves to the brand font).
- `style.padding === '0'`, `style.margin === '0'` → drop unless explicitly
  meaningful (e.g. removing an inherited padding). Zero is the default.
- `style.border` with width 0 → drop.

## What to actually use from `region_properties`

After filtering, the captured values you **do** carry forward:

- **Structural hierarchy** — derive the markup tree from `nodes[]` parent_id /
  child_ids. The shape of the DOM (rows, grids, sticky containers) reflects
  what the site renders.
- **Colors that are present** — non-empty `background`, meaningful `foreground`,
  border colors — mapped to tokens (extend tokens if needed), used via classes.
- **Layout primitives** — `style.layout`, `style.main_axis_align`,
  `style.cross_axis_align`, `style.gap` map directly to Tailwind flex/grid
  classes (`flex flex-row justify-between items-center gap-6`).
- **Non-default spacing** — `padding`, `margin`, `border_radius` mapped to
  spacing tokens.
- **bbox** as a sanity check — translate to Tailwind responsive classes
  (`min-h-[60px]`, container `max-w-[1267px]`). For `min-h` / `max-w` arbitrary
  values, this is one allowed exception to the "no arbitrary values" rule
  because per-component pixel anchors aren't usually generic enough to
  warrant a global token. Even so, prefer existing `max-w-screen-*` and
  similar tokens when they fit.

## Typical mistakes to avoid

- Inline `<header style="padding: 0; margin: 0; background: ; color: #212529;
  font-family: system-ui, ...">` — every claim here is wrong: padding/margin
  zero is default, background is empty, font is browser fallback.
- Hardcoded hex `style.css` rules — `background: #ececec;` belongs in
  `design-tokens.yml` first.
- Carrying `app-…` BEM classes from the matched root into the generated
  component — e.g. `class="app-site-header"` from leando.de's Angular custom
  element. Derive a clean component-scoped class instead.
- Treating `matched_via: heading` as if it located the perfect root — it
  may be a wrapper one level off. Use `kind` and `bbox` to sanity-check.

## When `region_properties` is missing or `matched_via === "none"`

Run with the previous behavior — derive from `reference` (extract.json) +
`design_hint` only. Don't fabricate region_properties.

## Why two artifacts converge here

`reference` (from `extract-reference`) is an AI-curated **table of contents** —
which sections, landmarks, forms, and breakpoints exist on the page.

`region_properties` is a deterministic **detail layer** — for the specific
region this task covers, the exact computed properties of every visible
element.

Both are valid inputs. Use `reference` for structural decisions about which
component cuts to make and which content belongs where. Use `region_properties`
for the per-element styling once the cut is decided — translated through
design tokens, materialized as Tailwind classes.
