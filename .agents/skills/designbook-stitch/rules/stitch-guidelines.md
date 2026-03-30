---
when:
  steps: [design-guidelines:intake]
  extensions: stitch
---

# Stitch Guidelines Import

Analyzes Stitch screen HTML and screenshots to propose guidelines values during guidelines intake. Proposes values — the user always confirms before saving.

## Instructions

### 1. Find Screens in the Stitch Project

Extract the project ID from `guidelines.yml` → `design_reference.url` if it exists. Otherwise call `mcp__stitch__list_projects` and ask the user to select a project.

Call `mcp__stitch__list_screens` with the project resource name. If no screens exist or the call fails, skip silently.

### 2. Select a Screen for Analysis

If multiple screens exist, ask the user which screen best represents their design:

> "I found these screens in your Stitch project:
>
> 1. **Screen Title A**
> 2. **Screen Title B**
> 3. _(skip — analyze without a screen)_
>
> Which screen best represents your overall design style?"

If only one screen exists, use it directly (confirm with user).

### 3. Fetch Screen HTML

Call `mcp__stitch__get_screen` for the selected screen. Read `htmlCode.downloadUrl` from the response. Fetch the HTML content from that URL.

### 4. Analyze HTML for Guidelines

Extract the following from the screen HTML:

#### Component Patterns
Look for recurring structural patterns in the HTML:
- **Cards** — elements with `rounded-*`, `shadow-*`, `bg-*` combinations
- **Buttons** — `<button>` elements, their shape (rounded, pill), color roles
- **Forms** — input styling (borders, backgrounds, focus states)
- **Grid/layout** — column counts (`grid-cols-*`), gap sizes (`gap-*`)
- **Lists** — list item patterns, spacing, separators

Describe each pattern concisely, e.g.: "Cards use `rounded-lg shadow-sm bg-white` with `p-6` padding"

#### Layout Principles
Analyze the overall layout structure:
- **Whitespace strategy** — generous (lots of padding/margin) or compact
- **Grid alignment** — consistent grid system, column structure
- **Max-width constraints** — container max-widths used
- **Responsive patterns** — breakpoint-aware classes (`sm:`, `md:`, `lg:`)
- **Section spacing** — vertical rhythm between major sections

#### Visual Atmosphere
Describe the overall mood and visual feel:
- **Mood** — e.g. "Minimalist and airy", "Dense and utilitarian", "Playful and colorful"
- **Shadow/depth strategy** — flat, subtle elevation, pronounced depth
- **Color density** — monochromatic, muted palette, vibrant accents
- **Typography feel** — tight/loose line-height, bold headings vs. light

### 5. Analyze Screenshot (optional)

If the screen has `screenshot.downloadUrl`, fetch the screenshot image and use visual analysis to supplement the HTML analysis:
- Validate atmosphere description against what you see
- Note visual details not captured in HTML (imagery style, icon style, illustration approach)
- Refine mood description based on overall visual impression

### 6. Build Proposals

Map the analysis results to guidelines.yml fields:

#### `principles`
Derive 3–5 design principles from the analysis, e.g.:
- "Generous whitespace — sections breathe with large vertical spacing"
- "Subtle depth — cards float with soft shadows, no hard borders"
- "Consistent rounding — all interactive elements use 8px border radius"

#### `component_patterns`
List the recurring patterns found, e.g.:
- "Cards: rounded-lg shadow-sm bg-white p-6"
- "Buttons: rounded-full px-6 py-2, primary uses brand color"
- "Grid: 3-column on desktop (grid-cols-3 gap-8), single column on mobile"

#### `design_reference` and `mcp`
Propose setting these from the selected screen:
```yaml
design_reference:
  type: stitch
  url: stitch://project-id/screen-id
  label: "[Screen Title]"
mcp:
  server: stitch
```

### 7. Present Proposals

Present all extracted guidelines to the user:

> "Based on your Stitch screen **[Screen Title]**, I extracted these guidelines:
>
> **Principles:**
> - Generous whitespace — sections breathe with large vertical spacing
> - Subtle depth — cards float with soft shadows
>
> **Component Patterns:**
> - Cards: rounded-lg shadow-sm bg-white p-6
> - Buttons: rounded-full, primary uses brand color
>
> **Design Reference:** [Screen Title] (stitch://project/screen)
>
> Use these as starting values? You can modify any of them."

The user may accept, modify, or reject each value. Continue the normal guidelines intake with the user's choices as defaults.

## Error Handling

- If MCP calls fail → skip silently, guidelines intake proceeds normally
- If no screens exist in the project → skip silently
- If HTML fetch fails → skip HTML analysis, still try screenshot if available
- If analysis yields no useful patterns → skip, don't propose empty values
