## Context

The `designbook-stitch` skill (created by visual-diff-integration change) provides rules for visual-diff reference resolution and intake screen selection. This change adds two more rules to the same skill for importing design data during tokens and guidelines intake.

Stitch's `get_project` returns a `designTheme` object with: `customColor` (hex), `headlineFont`/`bodyFont`/`labelFont` (enum), `roundness` (enum), `colorMode` (LIGHT/DARK), and optional override colors (primary, secondary, tertiary, neutral).

Stitch's `get_screen` returns `htmlCode.downloadUrl` with full HTML/CSS source including Tailwind classes and inline styles.

Google's `stitch-skills/design-md` skill demonstrates the analysis pattern: fetch screen HTML, extract color palette, typography, component patterns, layout principles, and synthesize into semantic descriptions.

## Goals / Non-Goals

**Goals:**
- Import Stitch designTheme as token proposals during `tokens:intake`
- Analyze Stitch screen HTML for guidelines proposals during `design-guidelines:intake`
- Both rules propose values — user always confirms/modifies before saving

**Non-Goals:**
- Bidirectional sync (pushing designbook tokens back to Stitch)
- Automatic guidelines/tokens creation without user review
- Importing from Stitch projects without designed screens

## Decisions

### Decision 1: designTheme maps directly to token groups

```
Stitch designTheme field       →  design-tokens.yml token
─────────────────────          ─  ─────────────────────────
customColor                    →  color.primary.$value
overridePrimaryColor           →  color.primary.$value (if set)
overrideSecondaryColor         →  color.secondary.$value
overrideTertiaryColor          →  color.tertiary.$value
overrideNeutralColor           →  color.neutral.$value
headlineFont (enum → name)     →  typography.heading.font_family
bodyFont (enum → name)         →  typography.body.font_family
labelFont (enum → name)        →  typography.label.font_family
roundness (enum → px)          →  spacing.border_radius.$value
colorMode                      →  (context for color suggestions, not a token)
```

Font enum mapping: `INTER` → `"Inter"`, `DM_SANS` → `"DM Sans"`, `SPACE_GROTESK` → `"Space Grotesk"`, etc.
Roundness mapping: `ROUND_FOUR` → `"4px"`, `ROUND_EIGHT` → `"8px"`, `ROUND_TWELVE` → `"12px"`, `ROUND_FULL` → `"9999px"`.

### Decision 2: Screen HTML analysis for guidelines uses semantic extraction

The stitch-guidelines rule fetches the screen's HTML source and analyzes:
- **Tailwind classes** → component patterns (e.g. `rounded-lg` on cards, `shadow-sm`, grid patterns)
- **Color usage** → validates/supplements token colors
- **Layout structure** → whitespace strategy, grid alignment, max-widths
- **Component patterns** → recurring structures (cards, buttons, forms)

The analysis produces guidelines proposals in the same format as the create-guidelines task expects: `principles`, `component_patterns`, `naming`.

### Decision 3: Rules propose, user confirms

Both rules present extracted values as proposals in the intake dialog:

> "I found these values in your Stitch project **[Project Name]**:
>
> **Colors:** Primary #0077B6, Secondary #2EC4B6
> **Fonts:** Inter (headings), DM Sans (body)
> **Roundness:** 8px
>
> Use these as starting values?"

The user can accept, modify, or ignore. The rules augment the existing intake flow, they don't replace it.

## Risks / Trade-offs

- **[Stitch MCP unavailable]** → Rules silently skip. Intake works normally without Stitch data.
- **[designTheme incomplete]** → Some fields may be unset. Rules only propose values that exist.
- **[HTML analysis accuracy]** → Extracting patterns from generated HTML is heuristic. Proposals may need user correction. This is expected — the rules save time, not replace judgment.
