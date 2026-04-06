---
when:
  steps: [tokens:intake]
  extensions: stitch
---

# Stitch Token Import

Imports design token values from a Stitch design system during tokens intake. Proposes values — the user always confirms before saving.

## Instructions

### 1. Get the Stitch Project

Extract the project ID from `guidelines.yml` → `design_reference.url`. Call `mcp__stitch__get_project` with the project resource name. If the call fails, skip silently.

### 2. Select Design System

Call `mcp__stitch__list_design_systems` and present all available design systems — including the project's own `designTheme` as default choice. The user selects which one provides the base tokens. The response already contains the full theme data for each design system — no additional fetch needed. If `list_design_systems` fails, fall back to the project's `designTheme` silently.

### 3. Extract designTheme

Read the `designTheme` from the **selected** source. Extract only fields that exist and are set:

- Brand overrides: `overridePrimaryColor` (precedence over `customColor`), `overrideSecondaryColor`, `overrideTertiaryColor`, `overrideNeutralColor`
- Typography: `headlineFont`, `bodyFont`, `labelFont`
- Roundness, colorMode (context only)
- `namedColors` — full M3 color palette

### 4. Map to Token Values

Map extracted values to design tokens using these rules:

- **Brand overrides** → `primitive.color.<hue>-<step>` using hue detection from hex (HSL hue angle → Tailwind hue name, lightness → scale step)
- **`overrideNeutralColor`** → always `primitive.color.gray-900`
- **Brand overrides win** — when both a brand override and a `namedColors` entry exist for the same role, the semantic token MUST reference the brand override primitive
- **`namedColors`** → primitive colors grouped by hue family using the Tailwind scale (50–950). Never interpolate — only create primitives for values that exist in the data
- **namedColors → semantic** — map all entries except M3-specific roles (`*_fixed`, `*_fixed_dim`, `on_*_fixed`, `on_*_fixed_variant`, `surface_bright`, `surface_tint`, `surface_dim`)
- **Delta-E approximation** — when a namedColor is within RGB euclidean distance < 8 of an existing primitive, the semantic token MAY reference that primitive instead (add a YAML comment noting the approximation). **Exception:** brand-aligned roles (`primary`, `secondary`, `tertiary` and their families — see mapping below) MUST always reference the brand override primitive, never a Delta-E approximation
- **Brand-role-to-namedColor family mapping** — the following namedColor entries belong to each brand override and MUST derive from the corresponding brand override primitive:
  - `overridePrimaryColor` → `primary`, `primary_container`, `on_primary`, `on_primary_container`, `inverse_primary`
  - `overrideSecondaryColor` → `secondary`, `secondary_container`, `on_secondary`, `on_secondary_container`
  - `overrideTertiaryColor` → `tertiary`, `tertiary_container`, `on_tertiary`, `on_tertiary_container`
- **Font enums** → Google Fonts names (e.g. `INTER` → Inter, `SPACE_GROTESK` → Space Grotesk, `DM_SANS` → DM Sans)
- **Roundness enums** → pixel values (`ROUND_FOUR` → 4px, `ROUND_EIGHT` → 8px, `ROUND_TWELVE` → 12px, `ROUND_FULL` → 9999px)

### 5. Present Proposals

Present mapped values to the user. The user may accept, modify, or reject each value. Continue the normal tokens intake with the user's choices as defaults.

### 6. Theme Selection

After the base tokens are confirmed, offer remaining design systems as color theme overrides:

1. Present available design systems (excluding the one used as default)
2. For each selected theme, compute color deltas (exclude identical and near-identical values with RGB distance < 8)
3. Ask if any theme should be marked as dark mode (`$extensions.darkMode: true`)
4. Add themes to the `themes:` section of `design-tokens.yml` — each theme key is a kebab-name containing only `semantic.color.*` deltas with resolved hex values

If the user declines themes, do not add a `themes:` section.

## Error Handling

- `mcp__stitch__get_project` fails → skip silently, intake proceeds normally
- `mcp__stitch__list_design_systems` fails → fall back to project designTheme, skip theme selection
- `designTheme` missing or empty → skip silently
- Individual fields unset → only propose fields that exist
