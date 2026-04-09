## Context

The Stitch integration skill (`designbook-stitch`) currently imports a single design system's `designTheme` into `design-tokens.yml` during token intake. The CSS generation pipeline (`designbook-css-tailwind`) produces `@theme` blocks from those tokens. There is no concept of theme variants or color mode switching.

Stitch design systems all share the same M3 color role structure (`namedColors` with ~40 keys like `primary`, `surface`, `on_surface`, etc.). Each design system can be fetched in LIGHT or DARK `colorMode`. This structural consistency makes delta-based theme overrides straightforward.

The current CSS generation pipeline uses a `css-mapping` rule to map token groups to CSS output. Each group produces one `.src.css` file with a `@theme` block. Theme overrides need a different CSS wrapper (`@layer theme { [data-theme="..."] { ... } }`).

## Goals / Non-Goals

**Goals:**
- Import a default Stitch design system as the base token set (always Light)
- Optionally import dark mode as a theme override (same DS, DARK colorMode)
- Optionally import additional Stitch design systems as named theme overrides
- Store theme overrides as `themes/<name>.yml` files containing only color deltas
- Generate theme CSS files using `@layer theme` with `[data-theme]` selectors
- Dark mode additionally gets `@media (prefers-color-scheme: dark)` for automatic switching

**Non-Goals:**
- Theme switching UI in Storybook addon (future work)
- Non-color overrides (typography, spacing, radius stay in default only)
- Per-section theming (`data-theme` on arbitrary elements works via CSS cascade but is not a designed feature)
- Visual diff against non-default themes

## Decisions

### Decision 1: Theme files store only semantic.color deltas

Theme override files contain only the `semantic.color.*` tokens that differ from the default. This keeps files minimal and makes it obvious what changes per theme.

**Alternative considered:** Full token copies per theme — rejected because it duplicates data, makes maintenance harder, and obscures what actually differs.

**Format:**
```yaml
# themes/dark.yml
semantic:
  color:
    primary:
      $value: "#adc6ff"
      $type: color
    surface:
      $value: "#131314"
      $type: color
    # ... only tokens that differ from default
```

### Decision 2: Delta computation is automatic

When importing a theme from Stitch, the system fetches both the default DS colors and the theme DS colors, compares each `semantic.color.*` token, and only writes tokens whose `$value` differs. The user sees the delta summary and confirms.

**Delta-E threshold:** Reuse the existing ΔE < 3 approximation rule from `stitch-tokens.md` — if two values are within RGB distance < 8, they are considered identical and excluded from the delta.

### Decision 3: CSS output uses @layer theme with data-attribute selectors

```css
/* color.theme-dark.src.css */
@layer theme {
  @media (prefers-color-scheme: dark) {
    :root {
      --color-primary: #adc6ff;
      --color-surface: #131314;
    }
  }
  [data-theme="dark"] {
    --color-primary: #adc6ff;
    --color-surface: #131314;
  }
}

/* color.theme-purple.src.css */
@layer theme {
  [data-theme="purple"] {
    --color-primary: #8e417a;
    --color-surface: #faf9f7;
  }
}
```

Only the `dark` theme gets the `prefers-color-scheme` media query. All other themes use `[data-theme]` only.

**Why `@layer theme`:** Tailwind v4's `@theme` registers tokens globally and generates utility classes. Override values should NOT re-register — they just override the CSS custom properties. `@layer theme` ensures correct cascade ordering without re-registering utilities.

**Why NOT `@theme`:** Using `@theme` for overrides would attempt to re-register the same custom properties, causing conflicts. Plain CSS custom property overrides via selectors is the correct Tailwind v4 pattern.

### Decision 4: Theme files are auto-discovered by CSS generation

The `generate-jsonata` task scans `$DESIGNBOOK_DATA/design-system/themes/*.yml` and generates a `.src.css` file per theme. No explicit registration needed — file presence is the declaration.

File naming convention:
- `themes/dark.yml` → `color.theme-dark.src.css`
- `themes/purple.yml` → `color.theme-purple.src.css`

### Decision 5: Stitch intake flow for themes

The theme selection is added as a new step in `stitch-tokens.md`, after the default design system import:

1. Default DS selected and colors imported (existing flow)
2. "Import additional design systems as themes?" → User selects from `list_design_systems`, each becomes a named theme
3. "Mark any theme as dark mode?" → User picks one (or none). The selected theme gets `$extensions.darkMode: true` in its YAML, which triggers the additional `prefers-color-scheme` CSS selector during generation.

Dark mode is NOT a separate Stitch API fetch — it's simply a flag on any theme. The color values come from whatever Stitch design system the user selects. The `prefers-color-scheme` media query is purely a CSS generation concern.

The theme name is derived from the Stitch design system's `displayName` (kebab-cased).

## Risks / Trade-offs

- **[Dark mode color quality]** The dark theme's colors depend on which Stitch design system the user selects. If the chosen DS wasn't designed for dark mode, the colors may not work well. → Mitigation: user sees the delta summary and confirms before writing.
- **[CSS specificity]** `@layer theme` has lower specificity than un-layered styles. If components use inline styles or `!important`, theme overrides won't apply. → Mitigation: this is a general CSS best-practice issue, not theme-specific.
- **[No theme UI]** Without a Storybook theme switcher, users can only test themes by manually adding `data-theme` attributes. → Mitigation: noted as future work; dark mode works automatically via `prefers-color-scheme`.
