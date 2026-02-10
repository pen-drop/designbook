---
name: /debo-design-tokens
id: debo-design-tokens
category: Designbook
description: Choose colors and typography for your product
---

Help the user choose colors and typography for their product. These design tokens define the visual identity. The result is saved to `designbook/design-system/design-tokens.md`.

**Steps**

## Step 1: Check Prerequisites

Check if the product vision exists at `designbook/product/product-overview.md`.

**If no product vision exists**, tell the user:

> "Before defining your design system, you'll need to establish your product vision. Please run `/product-vision` first."

Stop here.

**If product vision exists**, read it to understand the product context. Proceed to Step 2.

## Step 2: Explain and Gather Preferences

> "Let's define the visual identity for **[Product Name]**.
>
> I'll help you choose:
> 1. **Colors** — A primary accent, secondary accent, and neutral palette
> 2. **Typography** — Fonts for headings, body text, and code
>
> Do you have any existing brand colors or fonts in mind, or would you like suggestions?"

Wait for their response.

## Step 3: Choose Colors

Help the user select from Tailwind's built-in color palette:

> "For colors, we'll pick from Tailwind's palette.
>
> **Primary color** (main accent, buttons, links):
> Common choices: `blue`, `indigo`, `violet`, `emerald`, `teal`, `amber`, `rose`, `lime`
>
> **Secondary color** (complementary accent, tags, highlights):
> Should complement your primary — often a different hue
>
> **Neutral color** (backgrounds, text, borders):
> Options: `slate` (cool gray), `gray` (pure gray), `zinc` (slightly warm), `neutral`, `stone` (warm gray)
>
> Based on **[Product Name]**, I'd suggest:
> - **Primary:** [suggestion] — [why it fits]
> - **Secondary:** [suggestion] — [why it complements]
> - **Neutral:** [suggestion] — [why it works]
>
> What feels right for your product?"

Ask clarifying questions if they're unsure:
- "What vibe are you going for? Professional, playful, modern, minimal?"
- "Any colors you definitely want to avoid?"

## Step 4: Choose Typography

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

## Step 5: Present Final Choices

> "Here's your design system:
>
> **Colors:**
> - Primary: `[color]`
> - Secondary: `[color]`
> - Neutral: `[color]`
>
> **Typography:**
> - Heading: [Font Name]
> - Body: [Font Name]
> - Mono: [Font Name]
>
> Does this look good? Ready to save it?"

Iterate until the user is satisfied.

## Step 6: Save the Tokens

Construct a W3C Design Tokens JSON object based on the user's choices.

**Structure:**
```json
{
  "color": {
    "primary": { "$value": "{colors.[primary].500}", "$type": "color" },
    "secondary": { "$value": "{colors.[secondary].500}", "$type": "color" },
    "neutral": { "$value": "{colors.[neutral].500}", "$type": "color" }
  },
  "typography": {
    "heading": { "$value": "[Heading Font]", "$type": "fontFamily" },
    "body": { "$value": "[Body Font]", "$type": "fontFamily" },
    "mono": { "$value": "[Mono Font]", "$type": "fontFamily" }
  }
}
```
*(Note: In a real scenario, you'd resolve the Tailwind colors to hex codes or use a reference if supported. For now, store the Tailwind name or a placeholder hex if known, or just the string if the renderer handles it. Better: Use `designbook-tokens` which might handle Tailwind resolution, but let's assume we pass the string values as requested by user or simple hexes if known. Actually, let's store the Tailwind color name as the value for now, and let the renderer handle it, or ask the user to confirm hexes. To keep it simple and consistent with previous flow: Store the Tailwind name. The renderer `DeboDesignTokensCard` was Map-based. We will update it to handle this.)*

**Command:**
Run the `designbook-tokens` skill to validate and save this JSON:

```bash
/skill/designbook-tokens/steps/process-tokens --tokens-json='{"color": ...}' 
```
(Minify the JSON for the command line)

## Step 7: Confirm Completion

> "I've saved your design tokens to `designbook/design-system/design-tokens.md`.
>
> **Your palette:**
> - Primary: `[color]` — for buttons, links, key actions
> - Secondary: `[color]` — for tags, highlights, secondary elements
> - Neutral: `[color]` — for backgrounds, text, borders
>
> **Your fonts:**
> - [Heading Font] for headings
> - [Body Font] for body text
> - [Mono Font] for code
>
> Open Storybook to see the design tokens on the Design System page."

**Reference — Available Tailwind Colors:**
- **Warm:** `red`, `orange`, `amber`, `yellow`, `lime`
- **Cool:** `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`
- **Purple:** `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`
- **Neutral:** `slate`, `gray`, `zinc`, `neutral`, `stone`

**Guardrails**
- Colors must be Tailwind palette names, not hex codes
- Fonts must be exact Google Fonts names
- Keep suggestions contextual to the product type
- Be conversational — help the user think through their visual identity
- If `designbook/design-system/design-tokens.md` already exists, read it first and ask: "You already have design tokens defined. Would you like to update them or start fresh?"
