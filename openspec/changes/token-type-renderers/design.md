## Context

`DeboDesignTokens.jsx` (434 lines) is the sole renderer for the design tokens page. It currently uses **group-name matching** (`color` → ColorSection, `typography` → TypographySection, everything else → GenericGroup). The type-scale display hardcodes 7 font sizes in a `TYPE_SCALE` constant that doesn't read from tokens.

The W3C Design Token spec defines 13 `$type` values. Our schema already allows all 13, but only `color` and `fontFamily` get visual treatment.

## Goals / Non-Goals

**Goals:**
- Every `$type` in the schema gets a dedicated visual renderer
- Typography type-scale is data-driven from `$type: typography` composite tokens
- Registry pattern makes adding future renderers trivial (one component + one line)
- `debo-design-tokens` skill generates type-scale tokens alongside font families

**Non-Goals:**
- Changing how color rendering works (it's already good)
- Token aliasing / cross-references (`{typography.heading}` syntax)
- Interactive token editing in the UI
- Responsive/adaptive token display (that's the `responsive-design-tokens` change)

## Decisions

### 1. Registry pattern over switch/if-else

**Decision:** A plain object maps `$type` string → React component. The main render loop detects the dominant type per group and picks the renderer.

```js
const TOKEN_RENDERERS = {
  color:       DeboColorPreview,
  fontFamily:  DeboFontPreview,
  typography:  DeboTypeScaleRow,
  dimension:   DeboDimensionBar,
  shadow:      DeboShadowBox,
  number:      DeboNumberPreview,
  fontWeight:  DeboFontWeightPreview,
  gradient:    DeboGradientStrip,
  border:      DeboBorderPreview,
  duration:    DeboDurationBar,
  cubicBezier: DeboBezierCurve,
  transition:  DeboTransitionPreview,
  strokeStyle: DeboStrokePreview,
};
```

**Why:** No branching logic in the main component. Adding a new type = write the component, add one key. The fallback is `GenericToken` for unknown types.

**Alternative considered:** Per-group name matching (current approach). Rejected because group names are user-defined and unpredictable — `$type` is the stable contract.

### 2. Three-tier renderer selection with $extensions.designbook.renderer

**Decision:** Renderer selection uses a three-tier priority:

1. **Explicit:** `group.$extensions.designbook.renderer` → direct renderer lookup
2. **Typography mix:** group contains `fontFamily` or `typography` tokens → `DeboTypographySection`
3. **Dominant $type:** most common `$type` in group → `SECTION_RENDERERS[type]`
4. **Fallback:** `GenericGroup`

```yaml
# Explicit renderer via W3C $extensions
radius:
  $extensions:
    designbook:
      renderer: radius    # → DeboRadiusSection
  sm:
    $value: "0.125rem"
    $type: dimension
```

**Why:** `$type: dimension` is too generic — 0.125rem radius and 1280px breakpoint are both `dimension` but need completely different visualizations. Rather than parsing group names (fragile hack), the `$extensions` mechanism lets token authors explicitly declare the renderer. This is W3C-compliant and user-controllable.

**Available renderer values:** `bar` (proportional bars), `radius` (corner-radius squares), `gap` (boxes with gap), `spacing` (same as gap), plus all `$type` names.

**Special case:** The `typography` group is unique — it contains both `fontFamily` and `typography` tokens. The typography section handles both sub-types explicitly (font cards + type-scale table).

### 3. Typography composite token format (W3C standard)

**Decision:** Use the W3C `$type: typography` composite token with `$value` as an object:

```yaml
typography:
  h1:
    $value:
      fontFamily: "Space Grotesk"
      fontSize: "2.25rem"
      lineHeight: "2.5rem"
      fontWeight: 700
    $type: typography
```

**Why:** This is the W3C Design Token Community Group standard. It keeps all type-scale data in one place and allows the renderer to show actual font preview, size, weight, and line-height — all from real data.

**Properties:** `fontFamily` (string), `fontSize` (string/dimension), `lineHeight` (string/dimension), `fontWeight` (number), `letterSpacing` (string/dimension, optional). All optional individually — the renderer shows what's available.

### 4. Type-scale token names are free-form

**Decision:** No predefined names (h1-h6 etc.). Users choose their own names (h1, display, body-lg, caption, hero-title, whatever). The renderer sorts by `fontSize` descending.

**Why:** Different projects have different type hierarchies. Enforcing h1-h6 doesn't fit all use cases. Sorting by size gives a natural visual hierarchy regardless of naming.

### 5. Renderer visual specifications

| `$type` | Renderer | Visual |
|---------|----------|--------|
| `color` | Swatch card | Colored box + hex value (existing) |
| `fontFamily` | Font card | "Aa" preview + name + Sans/Mono badge (existing) |
| `typography` | Type-scale row | Preview text in actual font/size/weight + metrics badges |
| `dimension` | Proportional bar | Filled bar scaled to group max + value label |
| `shadow` | Shadow card | White box with live `box-shadow` applied |
| `number` | Value display | For 0-1 range: opacity square; else: numeric badge |
| `fontWeight` | Weight preview | "Aa" text rendered at the weight + numeric label |
| `gradient` | Gradient strip | Full-width bar with CSS gradient applied |
| `border` | Border line | Horizontal line with the border style applied |
| `duration` | Duration bar | Proportional bar + ms/s label |
| `cubicBezier` | Bezier curve | Mini SVG curve visualization |
| `transition` | Transition demo | Animated color/position block on hover |
| `strokeStyle` | Stroke line | SVG line with stroke-dasharray applied |

### 6. Schema validation for typography composite

**Decision:** Extend `design-tokens.schema.yml` to validate `$value` as object when `$type: typography`. Use a conditional schema (`if/then`) to enforce the object shape.

The `$value` for typography tokens must be an object with optional keys: `fontFamily`, `fontSize`, `lineHeight`, `fontWeight`, `letterSpacing`. At minimum `fontSize` should be present.

### 7. Skill update strategy

**Decision:** Update `create-tokens.md` in the `designbook-tokens` skill to include a "Type Scale" section under the typography group. The skill dialog should ask the user for their desired type-scale steps after font selection, then generate both `fontFamily` and `typography` tokens.

Default type-scale suggestion: h1, h2, h3, body-lg, body, small, caption — using a modular scale (e.g., Major Third 1.25) from a 16px base.

## Risks / Trade-offs

- **Mixed-type groups:** If a user puts `dimension` and `shadow` tokens in the same group, the dominant-type heuristic picks one renderer. Mitigation: Fall back to per-token rendering for mixed groups where no type has >50% share.
- **Typography composite is new:** No existing tokens use it yet. All test fixtures and examples need updating. Mitigation: Font-only typography groups still work exactly as before — composite tokens are additive.
- **Renderer count:** 13 renderers is a lot of code in one file. Mitigation: Keep renderers simple (styled-components + inline styles, no complex logic). Consider splitting into separate files if the component exceeds ~800 lines.
- **CSS generation for typography composites:** Tailwind/DaisyUI token generation doesn't handle composite `$value` objects yet. Mitigation: Marked as modified capability — generate CSS custom properties for each sub-property (`--typography-h1-font-size`, `--typography-h1-line-height`, etc.).

## Open Questions

- Should the CSS generation for typography composites produce individual custom properties per sub-property, or a single shorthand? (Leaning toward individual properties for flexibility.)
