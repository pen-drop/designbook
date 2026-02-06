## Context

Design OS uses JSON files (`colors.json`, `typography.json`) for design tokens. In Designbook, all workflow data uses Markdown files for consistency — the Vite middleware loads text, parsers extract structured data. The design tokens workflow adapts the Design OS JSON approach into a single Markdown file while preserving the same conceptual model: Tailwind color names and Google Font names.

## Goals / Non-Goals

**Goals:**
- Create a "Design System" Storybook page with color swatches and typography display
- Create `/design-tokens` AI command following the Design OS conversational pattern
- Use Markdown format (not JSON) for consistency with other Designbook workflows
- Include visual color preview with three-shade swatches (light/base/dark)
- Store at `designbook/design-system/design-tokens.md`

**Non-Goals:**
- Applying design tokens to actual components (tokens are documentation only)
- Supporting custom hex colors (only Tailwind palette names)
- Implementing the "application shell" step from Design OS (separate future workflow)

## Decisions

### Decision 1: Markdown Format Instead of JSON

**Choice:** Use a single Markdown file instead of Design OS's two JSON files.

```markdown
# Design Tokens
## Colors
- Primary: blue
- Secondary: teal
- Neutral: slate
## Typography
- Heading: DM Sans
- Body: Inter
- Mono: IBM Plex Mono
```

**Rationale:**
- Consistent with all other Designbook workflows (product vision, roadmap, data model)
- Single file is simpler than managing two JSON files
- Human-readable and git-friendly
- Easy to parse with the same MDX parser pattern

### Decision 2: Color Swatches with Tailwind Color Map

**Choice:** Map Tailwind color names to hex values for visual preview, showing three shades (light/base/dark) per color, mirroring Design OS's `ColorSwatch` component.

**Rationale:**
- Visual color preview is essential for a design system page
- Using the same Tailwind-to-hex mapping as Design OS ensures consistency
- Three shades give a feel for the full palette without overwhelming

### Decision 3: Separate Storybook Page

**Choice:** Design System gets its own page, separate from Product and Data Model.

**Rationale:**
- Different domain: visual identity vs. product strategy vs. data architecture
- Matches Design OS's page structure
- Clean Storybook navigation: Product → Data Model → Design System
