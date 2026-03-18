---
name: /debo-design-tokens
id: debo-design-tokens
category: Designbook
description: Choose colors and typography for your product
workflow:
  title: Design Tokens
  stages: [debo-design-tokens:dialog, create-tokens]
reads:
  - path: ${DESIGNBOOK_DIST}/product/vision.md
    workflow: /debo-vision
  - path: ${DESIGNBOOK_DIST}/design-system/design-tokens.yml
after:
  - workflow: /debo-css-generate
    optional: true
---

Help the user choose colors and typography for their product. These design tokens define the visual identity. The result is saved to `$DESIGNBOOK_DIST/design-system/design-tokens.yml`.

**Steps**

## Step 0: Load Workflow Tracking

Load the `designbook-workflow` skill via the Skill tool.

## Step 1: Explain and Gather Preferences

> "Let's define the visual identity for **[Product Name]**. I'll help you choose colors and typography. Do you have anything in mind, or would you like suggestions?"

Wait for their response.

## Step 2: Choose Colors

Guide the user through choosing colors for their product. Suggest values based on the product vision. Ask clarifying questions if they're unsure:
- "What vibe are you going for? Professional, playful, modern, minimal?"
- "Any colors you definitely want to avoid?"

> Color naming and required token roles are determined by framework naming rules loaded for this stage.

## Step 3: Choose Typography

> "For typography, we'll use Google Fonts.
>
> **Heading font** (titles, section headers):
> Popular choices: `DM Sans`, `Inter`, `Poppins`, `Manrope`, `Space Grotesk`, `Outfit`
>
> **Body font** (paragraphs, UI text):
> Often the same as heading, or: `Inter`, `Source Sans 3`, `Nunito Sans`, `Open Sans`
>
> **Mono font** (code, technical content):
> Options: `IBM Plex Mono`, `JetBrains Mono`, `Fira Code`, `Source Code Pro`
>
> My suggestions for **[Product Name]**:
> - **Heading:** [suggestion] — [why]
> - **Body:** [suggestion] — [why]
> - **Mono:** [suggestion] — [why]
>
> What do you prefer?"

**Reference — Popular Google Font Pairings:**
- **Modern & Clean:** DM Sans + DM Sans + IBM Plex Mono
- **Professional:** Inter + Inter + JetBrains Mono
- **Friendly:** Nunito Sans + Nunito Sans + Fira Code
- **Bold & Modern:** Space Grotesk + Inter + Source Code Pro
- **Editorial:** Playfair Display + Source Sans 3 + IBM Plex Mono

## Step 4: Present Final Choices

Summarize the collected tokens for confirmation:

> "Here's your design system:
>
> **Colors:** [list all chosen colors with hex values]
>
> **Typography:**
> - Heading: [Font Name]
> - Body: [Font Name]
> - Mono: [Font Name]
>
> Does this look good? Ready to save?"

Iterate until the user is satisfied. Once the user approves, the `create-tokens` stage runs automatically.

## Step 6a: Choose Container Widths

Ask the user about their container (max-width) preferences:

> "Now let's set your container widths — these control how wide your content area can be.
>
> The standard Tailwind sizes are:
> - `sm`: 640px (mobile-optimized)
> - `md`: 768px (default, good for blogs)
> - `lg`: 1024px (wider, good for dashboards)
> - `xl`: 1280px (full-width, good for landing pages)
>
> Want to use these defaults, or customize them?"

If the user has specific page width requirements, adjust the values.

## Step 6b: Choose Section Spacing

Ask about vertical rhythm between page sections:

> "Section spacing controls the vertical breathing room between page sections.
>
> Standard scale:
> - `sm`: 2rem (tight, compact sections)
> - `md`: 4rem (default, balanced rhythm)
> - `lg`: 6rem (spacious, hero-style sections)
>
> These map to layout classes like `py-section-sm`, `py-section-md`, `py-section-lg`.
>
> Want to use these defaults, or adjust them?"

**Dialog Guardrails**
- Colors should be hex codes (e.g. `#494FE5`)
- Fonts must be exact Google Fonts names
- Keep suggestions contextual to the product type
- Be conversational — help the user think through their visual identity
