---
when:
  steps: [tokens:intake]
  extensions: stitch
---

# Stitch Token Import

Imports design token values from the Stitch project's designTheme during tokens intake. Proposes values — the user always confirms before saving.

## Instructions

### 1. Get the Stitch Project

Extract the project ID from `guidelines.yml` → `design_reference.url` (e.g. `stitch://project-id/screen-id` → project ID is the first path segment).

Call `mcp__stitch__get_project` with the project resource name. If the call fails, skip silently — the tokens intake proceeds without Stitch data.

### 2. Extract designTheme

Read the `designTheme` object from the project response. It may contain:

- `customColor` (hex) — primary brand color
- `overridePrimaryColor` (hex, optional) — takes precedence over customColor
- `overrideSecondaryColor` (hex, optional)
- `overrideTertiaryColor` (hex, optional)
- `overrideNeutralColor` (hex, optional)
- `headlineFont` (enum)
- `bodyFont` (enum)
- `labelFont` (enum, optional)
- `roundness` (enum)
- `colorMode` (LIGHT/DARK) — context only, not a token

Only propose fields that exist and are set. Skip unset/empty fields.

### 3. Map to Token Values

#### designTheme → Token Path Mapping

Stitch brand colors populate **primitive** color tokens using Tailwind scale names. Each Stitch role maps to one canonical primitive slot — the "main shade" of that hue (typically the 600 step).

| designTheme Field | Token Path | Notes |
|---|---|---|
| `overridePrimaryColor` or `customColor` | `primitive.color.<hue>-600.$value` | Main brand color (hue detected from hex) |
| `overrideSecondaryColor` | `primitive.color.<hue>-600.$value` | Secondary brand color (hue detected from hex) |
| `overrideTertiaryColor` | `primitive.color.<hue>-<step>.$value` | Tertiary color (hue AND step detected from hex) |
| `overrideNeutralColor` | `primitive.color.gray-900.$value` | Brand neutral |
| `headlineFont` | `typography.heading.font_family` | |
| `bodyFont` | `typography.body.font_family` | |
| `labelFont` | `typography.label.font_family` | |
| `roundness` | `spacing.border_radius.$value` | |

If both `overridePrimaryColor` and `customColor` exist, use `overridePrimaryColor`.

#### Hue Detection for Brand Overrides

Do not hardcode hue family names. Determine the Tailwind hue from the hex value:

1. Convert hex to HSL
2. Classify by hue angle:
   | Hue range | Tailwind hue |
   |---|---|
   | 0–15, 346–360 | red |
   | 16–45 | orange |
   | 46–65 | yellow |
   | 66–170 | green |
   | 171–260 | blue |
   | 261–300 | purple |
   | 301–345 | pink |
3. If saturation < 10%, classify as `gray` regardless of hue angle
4. Assign scale step by lightness: L > 90% → 50, L > 80% → 100, L > 70% → 200, L > 60% → 300, L > 50% → 400, L > 40% → 500, L > 30% → 600, L > 20% → 700, L > 10% → 800, else → 900

#### Brand Override → Semantic Priority

When both a brand override (e.g., `overridePrimaryColor`) and a `namedColors` entry of the same role (e.g., `namedColors.primary`) exist, the **semantic token** for that role MUST reference the primitive that holds the **brand override** value — not the namedColors value.

| Role | Semantic token | MUST reference |
|---|---|---|
| Primary | `semantic.color.primary` | Primitive holding `overridePrimaryColor` value |
| Secondary | `semantic.color.secondary` | Primitive holding `overrideSecondaryColor` value |
| Tertiary | `semantic.color.tertiary` | Primitive holding `overrideTertiaryColor` value |

The namedColors value for the same role name becomes a separate primitive (if distinct) but does NOT get the semantic role assignment. The brand override is what the user sees and confirms during intake — it wins.

> **Never interpolate.** Only create `primitive.color` entries for values that appear in `designTheme.namedColors` or are direct brand overrides (`overridePrimaryColor`, `overrideSecondaryColor`, `overrideTertiaryColor`, `overrideNeutralColor`). Do not fill in missing scale steps (50, 100, 400, 500 etc.) with invented or approximated values.

#### Font Enum → Google Fonts Name

| Stitch Enum | Google Fonts Name |
|---|---|
| `INTER` | Inter |
| `DM_SANS` | DM Sans |
| `SPACE_GROTESK` | Space Grotesk |
| `MANROPE` | Manrope |
| `WORK_SANS` | Work Sans |
| `PLUS_JAKARTA_SANS` | Plus Jakarta Sans |
| `EPILOGUE` | Epilogue |
| `PUBLIC_SANS` | Public Sans |
| `BE_VIETNAM_PRO` | Be Vietnam Pro |
| `LEXEND` | Lexend |
| `NEWSREADER` | Newsreader |
| `NOTO_SERIF` | Noto Serif |
| `SPLINE_SANS` | Spline Sans |
| `DOMINE` | Domine |
| `LIBRE_CASLON_TEXT` | Libre Caslon Text |
| `EB_GARAMOND` | EB Garamond |
| `LITERATA` | Literata |
| `SOURCE_SERIF_FOUR` | Source Serif 4 |
| `MONTSERRAT` | Montserrat |
| `METROPOLIS` | Metropolis |
| `SOURCE_SANS_THREE` | Source Sans 3 |
| `NUNITO_SANS` | Nunito Sans |
| `ARIMO` | Arimo |
| `HANKEN_GROTESK` | Hanken Grotesk |
| `RUBIK` | Rubik |
| `GEIST` | Geist |
| `IBM_PLEX_SANS` | IBM Plex Sans |
| `SORA` | Sora |

Skip `FONT_UNSPECIFIED` — treat as unset.

#### Roundness Enum → Pixel Value

| Stitch Enum | Value |
|---|---|
| `ROUND_FOUR` | 4px |
| `ROUND_EIGHT` | 8px |
| `ROUND_TWELVE` | 12px |
| `ROUND_FULL` | 9999px |

#### Scale-Step Heuristic

Standard Tailwind scale has 11 slots per hue: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950.

If a hue family has **≤11 distinct values**, use only standard steps. Assign by sorting values from lightest to darkest and distributing across the standard slots.

If a hue family has **>11 distinct values**, use intermediate steps to accommodate all values:

| Intermediate step | Between |
|---|---|
| 25 | 0–50 |
| 75 | 50–100 |
| 125 | 100–200 |
| 150 | 100–200 |
| 175 | 100–200 |
| 250 | 200–300 |
| 350 | 300–400 |
| 450 | 400–500 |
| 550 | 500–600 |
| 650 | 600–700 |
| 750 | 700–800 |
| 850 | 800–900 |
| 925 | 900–950 |

Sort all values by lightness, assign standard steps first to the most distinct values, then fill gaps with intermediate steps.

#### Delta-E Approximation

When a `namedColors` value is very close to an existing primitive (RGB euclidean distance < 8, roughly ΔE < 3 CIE76), the semantic token MAY reference that primitive instead of creating a new one. Add a YAML comment noting the approximation:

```yaml
inverse-on-surface:
  # approx: actual #edf1f9 → using gray-100 #eaeef6
  $value: "{primitive.color.gray-100}"
  $type: color
```

If the distance is ≥ 8, a separate primitive MUST be created.

#### namedColors → Primitive Color Entries

If `designTheme.namedColors` is present, use it as the source of truth for all primitive color values. Each entry in `namedColors` maps to one `primitive.color` entry using the appropriate Tailwind hue + scale step.

Assign scale steps based on relative lightness within each hue family using the Scale-Step Heuristic above. Do not add entries for values not present in `namedColors` or the brand overrides above.

#### namedColors → Semantic Color Entries

Map `namedColors` to `semantic.color` with the following **exclusions** — these M3-specific roles have no practical equivalent in web component systems and must be omitted:

- `*_fixed` and `*_fixed_dim` (e.g. `primary_fixed`, `secondary_fixed_dim`) — M3 adaptive color, unused in web
- `on_*_fixed` and `on_*_fixed_variant` (e.g. `on_primary_fixed`, `on_tertiary_fixed_variant`) — same reason
- `surface_bright`, `surface_tint`, `surface_dim` — M3 elevation tinting, no web equivalent

All other `namedColors` entries become semantic tokens.

### 4. Present Proposals

Present the mapped values to the user before continuing with the normal intake flow:

> "I found these values in your Stitch project **[Project Name]**:
>
> **Colors:** Primary `#0077B6`, Secondary `#2EC4B6`
> **Fonts:** Inter (headings), DM Sans (body)
> **Roundness:** 8px
>
> Use these as starting values? You can modify any of them during intake."

Only show fields that were found. The user may accept, modify, or reject each value. Continue the normal tokens intake with the user's choices as defaults.

### 5. Theme Selection

After the default design system is imported and the user has confirmed the base token values, offer theme import:

#### 5a. Ask for Additional Themes

> "Import additional Stitch design systems as color themes? These will override only color tokens."

If the user confirms, call `mcp__stitch__list_design_systems` (with the project ID if available, or without for global design systems). Present the available design systems excluding the one already used as default:

> "Available design systems:
>
> 1. **Egger** (Architectural Artisan)
> 2. **Merzi Merzi** (The Statesman)
> 3. _(skip — no themes)_
>
> Select one or more."

#### 5b. Compute Color Deltas

For each selected theme design system:

1. Extract its `namedColors` (or derive semantic colors from brand overrides using the same mapping as step 3)
2. Compare each `semantic.color.*` token against the default's semantic colors
3. **Exclude identical values**: if the hex values match exactly, omit the token
4. **Exclude near-identical values**: if RGB euclidean distance < 8 (approx ΔE < 3 CIE76), treat as identical and omit
5. The remaining tokens are the delta

Present the delta summary:

> "Theme **Egger** has 18 color overrides out of 30 total tokens. Key changes:
> - primary: #004fa8 → #722961
> - secondary: #006e2c → #835245
> - surface: #f7f9ff → #faf9f7
>
> Confirm?"

#### 5c. Ask for Dark Mode

If one or more themes were selected:

> "Mark any of these themes as dark mode (adds automatic `prefers-color-scheme: dark` switching)?
>
> 1. **Egger** — mark as dark mode
> 2. **Merzi Merzi** — mark as dark mode
> 3. _(none)_"

At most one theme can be marked as dark mode.

#### 5d. Write Theme Files

For each confirmed theme, write a file to `$DESIGNBOOK_DATA/design-system/themes/<kebab-name>.yml`:

```yaml
# themes/<kebab-name>.yml — only color deltas against default
semantic:
  color:
    primary:
      $value: "#722961"
      $type: color
    secondary:
      $value: "#835245"
      $type: color
    # ... only tokens that differ from default
```

If the theme is marked as dark mode, add at the root level:

```yaml
$extensions:
  darkMode: true
semantic:
  color:
    # ... deltas
```

The `<kebab-name>` is derived from the Stitch design system's display name (e.g., "Architectural Artisan" → `architectural-artisan`).

**Theme file constraints:**
- Only `semantic.color.*` tokens — no primitives, no typography, no spacing
- Only resolved hex values — no `{references}`
- Only tokens that differ from the default (delta only)

If the user declines themes entirely, do not create the `themes/` directory.

## Error Handling

- If `mcp__stitch__get_project` fails → skip silently, intake proceeds normally
- If `designTheme` is missing or empty → skip silently
- If individual fields are unset → only propose fields that exist
- If `mcp__stitch__list_design_systems` fails → skip theme selection, inform user
