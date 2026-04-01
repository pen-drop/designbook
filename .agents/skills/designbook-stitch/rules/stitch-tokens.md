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
| `overridePrimaryColor` or `customColor` | `primitive.color.blue-600.$value` | Main brand blue |
| `overrideSecondaryColor` | `primitive.color.green-600.$value` | Main brand green |
| `overrideTertiaryColor` | `primitive.color.blue-400.$value` | Accent blue |
| `overrideNeutralColor` | `primitive.color.gray-900.$value` | Brand neutral |
| `headlineFont` | `typography.heading.font_family` | |
| `bodyFont` | `typography.body.font_family` | |
| `labelFont` | `typography.label.font_family` | |
| `roundness` | `spacing.border_radius.$value` | |

If both `overridePrimaryColor` and `customColor` exist, use `overridePrimaryColor`.

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

#### namedColors → Primitive Color Entries

If `designTheme.namedColors` is present, use it as the source of truth for all primitive color values. Each entry in `namedColors` maps to one `primitive.color` entry using the appropriate Tailwind hue + scale step.

Assign scale steps based on relative lightness within each hue family. Do not add entries for values not present in `namedColors` or the brand overrides above.

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

## Error Handling

- If `mcp__stitch__get_project` fails → skip silently, intake proceeds normally
- If `designTheme` is missing or empty → skip silently
- If individual fields are unset → only propose fields that exist
