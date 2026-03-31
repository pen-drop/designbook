# Resolve Design Reference

> ⛔ **MANDATORY**: This partial MUST be executed as the first interactive step in any design intake that loads it. Do not skip or defer.

Resolves a design reference for the current screen, shell, or component. When a reference is available, it becomes the primary input for all subsequent intake steps (component planning, layout decisions, screen structure).

## Step 1: Check for design_reference

Read `guidelines.yml`. If `design_reference` is present, continue. If not, **skip this entire partial** silently and return to the calling intake.

## Step 2: Ask user for reference

> "Your guidelines have a design reference configured (**{{ design_reference.type }}**). Do you have a reference for this [screen/component/shell]?
>
> - **Yes** — I'll load it and use it as the basis for component planning
> - **No** — I'll guide you through the design interactively"

Wait for response.

- If **No** → return to calling intake, proceed with normal conversational flow
- If **Yes** → continue to Step 3

## Step 3: Resolve reference by type

### Stitch (`design_reference.type: stitch`)

1. List available screens:
   ```
   mcp__stitch__list_screens({ projectId: "<from design_reference.url>" })
   ```

2. Present numbered list to user:
   > "Which screen matches this [screen/component/shell]?
   >
   > 1. **Screen Title A** (WxH)
   > 2. **Screen Title B** (WxH)
   > 3. _(skip — no reference)_"

3. Wait for selection.

4. If selected, fetch the screen details:
   ```
   mcp__stitch__get_screen({ name, projectId, screenId })
   ```

5. Download the HTML via the `htmlCode.downloadUrl`:
   ```bash
   curl -sL "<downloadUrl>" -o /tmp/stitch-reference.html
   ```

6. Read and analyze the HTML structure.

### URL (`design_reference.type: url`)

1. Ask user for the URL
2. Screenshot via Playwright at configured breakpoints
3. Fetch HTML via WebFetch if possible

### Image (`design_reference.type: image`)

1. Ask user for image URL or path
2. Load and display the image

### Figma (`design_reference.type: figma`)

1. Use Figma MCP if available
2. Fall back to asking for a screenshot URL

## Step 4: Per-breakpoint references

Ask which breakpoints should have references (from `visual_diff.breakpoints` in guidelines.yml):

> "Which breakpoints should have a design reference?
>
> - **All** — I'll ask for each breakpoint
> - **Just one** — I'll create a single entry
> - **Select** — pick specific breakpoints"

For each selected breakpoint, ask for the reference source (may differ per breakpoint — e.g. stitch for mobile, figma for desktop).

Build the reference array:
```yaml
reference:
  - type: "stitch"
    url: "<mobile reference url>"
    breakpoint: sm
    threshold: 3
    title: "<title>"
  - type: "stitch"
    url: "<desktop reference url>"
    breakpoint: xl
    threshold: 3
    title: "<title>"
```

Only breakpoints with a reference entry will be screenshotted during visual testing. Mixed types are allowed (e.g. stitch for mobile, figma for desktop).

## Step 5: Analyze and provide context

When HTML is available:

1. Parse the HTML structure — identify header, footer, sections, components
2. Extract CSS classes, layout patterns, color usage
3. Note the content structure (headings, text blocks, images, CTAs)

Make this analysis available as context for subsequent intake steps. When the calling intake reaches component planning, it should **derive components from the reference** rather than asking the user to describe them from scratch.

## Result

Return a `reference` array to the calling intake:

```yaml
reference:
  - type: "<stitch|url|image|figma>"
    url: "<reference URL>"
    breakpoint: "<breakpoint name>"
    threshold: 3
    title: "<reference title>"
    html: "<path to downloaded HTML if available>"
```

Each entry represents one breakpoint. If no reference was selected, return `null` and let the calling intake proceed with its normal flow.
