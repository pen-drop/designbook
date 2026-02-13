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

> "Before defining your design system, you'll need to establish your product vision. Please run `/debo-product-vision` first."

Stop here.

**If product vision exists**, read it to understand the product context. Proceed to Step 2.

## Step 2: Load Configuration & Framework Naming Rules

Load the Designbook configuration:

```bash
source .agent/skills/designbook-configuration/scripts/set-env.sh
```

Check `DESIGNBOOK_CSS_FRAMEWORK`:

- **If `daisyui`**: Read `.agent/skills/designbook-css-daisyui/SKILL.md` — specifically the section **§ Token Naming Conventions**. Use DaisyUI semantic names for all tokens.
- **If other/unset**: Use generic names (the user chooses freely).

Proceed to Step 3.

## Step 3: Explain and Gather Preferences

> "Let's define the visual identity for **[Product Name]**."

**If framework is `daisyui`**, explain:

> "Your project uses **DaisyUI + Tailwind CSS**, so we'll use DaisyUI's semantic color system. This means your colors will automatically work with DaisyUI components (`btn-primary`, `bg-base-200`, `badge-accent`, etc.) and support dark mode out of the box.
>
> I'll help you choose:
> 1. **Brand colors** — Primary, secondary, and accent colors
> 2. **Base colors** — Page background, surfaces, and text
> 3. **Status colors** _(optional)_ — Info, success, warning, error
> 4. **Typography** — Fonts for headings, body text, and code
>
> Do you have any existing brand colors or fonts in mind, or would you like suggestions?"

**If no framework or other framework:**

> "I'll help you choose:
> 1. **Colors** — A primary accent, secondary accent, and neutral palette
> 2. **Typography** — Fonts for headings, body text, and code
>
> Do you have any existing brand colors or fonts in mind, or would you like suggestions?"

Wait for their response.

## Step 4: Choose Colors

### DaisyUI Framework

When `DESIGNBOOK_CSS_FRAMEWORK=daisyui`, guide the user through the DaisyUI color system:

> "For **DaisyUI**, we define colors by their **role**, not by color name. This makes your theme work seamlessly with all DaisyUI components.
>
> **🎨 Brand Colors:**
> - **Primary** (`bg-primary`, `btn-primary`) — Your main brand color for buttons, links, key actions
> - **Secondary** (`bg-secondary`, `btn-secondary`) — A complementary accent for tags, highlights
> - **Accent** (`bg-accent`, `badge-accent`) — A third accent for emphasis, decorations
>
> **📄 Base Colors:**
> - **Base-100** (`bg-base-100`) — Page background
> - **Base-200** (`bg-base-200`) — Card surfaces, elevated areas
> - **Base-300** (`bg-base-300`) — Borders, dividers, subtle separators
> - **Base-content** (`text-base-content`) — Main text color
>
> **⚫ Neutral:**
> - **Neutral** (`bg-neutral`) — Non-saturated UI parts (dark sections, footers)
>
> Based on **[Product Name]**, I'd suggest:
> - **Primary:** [hex + description] — [why it fits]
> - **Secondary:** [hex + description] — [why it complements]
> - **Accent:** [hex + description] — [why it works]
> - **Base-100:** [hex] — [light/dark feel]
>
> What colors feel right? You can provide hex codes, describe colors, or I'll suggest options."

After the user chooses brand + base colors, **automatically derive `-content` colors**:
- For dark backgrounds → light content (`#FFFFFF` or similar)
- For light backgrounds → dark content (`#1F2937` or similar)

Then ask about **status colors** (optional):

> "Would you also like to customize the status colors? These are used for alerts, badges, and messages:
> - **Info** — informative (default: blue)
> - **Success** — positive (default: green)
> - **Warning** — caution (default: amber)
> - **Error** — danger (default: red)
>
> Or shall I use sensible defaults?"

### Generic (No Framework)

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

## Step 5: Choose Typography

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

## Step 6: Present Final Choices

### DaisyUI Framework

> "Here's your DaisyUI design system:
>
> **Brand Colors:**
> - Primary: `[hex]` — [description]
> - Primary-content: `[hex]` _(auto-derived)_
> - Secondary: `[hex]` — [description]
> - Secondary-content: `[hex]` _(auto-derived)_
> - Accent: `[hex]` — [description]
> - Accent-content: `[hex]` _(auto-derived)_
>
> **Base Colors:**
> - Base-100: `[hex]` — page background
> - Base-200: `[hex]` — surfaces
> - Base-300: `[hex]` — borders
> - Base-content: `[hex]` — text
> - Neutral: `[hex]` — neutral UI
> - Neutral-content: `[hex]` _(auto-derived)_
>
> **Status Colors:** _(if customized)_
> - Info: `[hex]`, Success: `[hex]`, Warning: `[hex]`, Error: `[hex]`
>
> **Typography:**
> - Heading: [Font Name] (`font-heading`)
> - Body: [Font Name] (`font-body`)
> - Mono: [Font Name] (`font-mono`)
>
> These tokens will work directly with DaisyUI classes like `btn-primary`, `bg-base-200`, `text-accent`, etc.
>
> Does this look good? Ready to save?"

### Generic (No Framework)

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

## Step 7: Save the Tokens

Construct a W3C Design Tokens JSON object based on the user's choices.

### DaisyUI Token Structure

```json
{
  "color": {
    "primary": { "$value": "#494FE5", "$type": "color", "description": "Main brand color" },
    "primary-content": { "$value": "#FFFFFF", "$type": "color", "description": "Text on primary" },
    "secondary": { "$value": "#FFC024", "$type": "color", "description": "Secondary accent" },
    "secondary-content": { "$value": "#000000", "$type": "color", "description": "Text on secondary" },
    "accent": { "$value": "#FF4E42", "$type": "color", "description": "Accent for emphasis" },
    "accent-content": { "$value": "#FFFFFF", "$type": "color", "description": "Text on accent" },
    "neutral": { "$value": "#3D4451", "$type": "color", "description": "Neutral UI" },
    "neutral-content": { "$value": "#FFFFFF", "$type": "color", "description": "Text on neutral" },
    "base-100": { "$value": "#FFFFFF", "$type": "color", "description": "Page background" },
    "base-200": { "$value": "#F2F2F2", "$type": "color", "description": "Card surfaces" },
    "base-300": { "$value": "#E5E6E6", "$type": "color", "description": "Borders" },
    "base-content": { "$value": "#1F2937", "$type": "color", "description": "Main text" },
    "info": { "$value": "#3ABFF8", "$type": "color", "description": "Info messages" },
    "info-content": { "$value": "#002B3D", "$type": "color", "description": "Text on info" },
    "success": { "$value": "#36D399", "$type": "color", "description": "Success messages" },
    "success-content": { "$value": "#003320", "$type": "color", "description": "Text on success" },
    "warning": { "$value": "#FBBD23", "$type": "color", "description": "Warning messages" },
    "warning-content": { "$value": "#382800", "$type": "color", "description": "Text on warning" },
    "error": { "$value": "#F87272", "$type": "color", "description": "Error messages" },
    "error-content": { "$value": "#470000", "$type": "color", "description": "Text on error" }
  },
  "typography": {
    "heading": { "$value": "[Heading Font]", "$type": "fontFamily" },
    "body": { "$value": "[Body Font]", "$type": "fontFamily" },
    "mono": { "$value": "[Mono Font]", "$type": "fontFamily" }
  }
}
```

### Generic Token Structure

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

**Command:**
Run the `designbook-tokens` skill to validate and save this JSON:

```bash
/skill/designbook-tokens/steps/process-tokens --tokens-json='{...}'
```
(Minify the JSON for the command line)

## Step 8: Confirm Completion

### DaisyUI Framework

> "I've saved your DaisyUI design tokens to `designbook/design-system/design-tokens.md`.
>
> **Your DaisyUI theme:**
> - 🎨 Primary: `[hex]` → `btn-primary`, `bg-primary`, `text-primary`
> - 🎨 Secondary: `[hex]` → `btn-secondary`, `bg-secondary`
> - 🎨 Accent: `[hex]` → `badge-accent`, `bg-accent`
> - 📄 Base: `[hex]` → `bg-base-100`, `bg-base-200`, `bg-base-300`
> - ✍️ Text: `[hex]` → `text-base-content`
>
> **Your fonts:**
> - [Heading Font] → `font-heading`
> - [Body Font] → `font-body`
> - [Mono Font] → `font-mono`
>
> To generate CSS from these tokens, run `//debo-css-generate`.
> Open Storybook to see the design tokens on the Design System page."

### Generic (No Framework)

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
- When `DESIGNBOOK_CSS_FRAMEWORK=daisyui`: color tokens MUST use DaisyUI semantic names from `designbook-css-daisyui` skill
- When `DESIGNBOOK_CSS_FRAMEWORK=daisyui`: always generate `-content` counterparts for each color
- Colors should be hex codes (e.g. `#494FE5`)
- Fonts must be exact Google Fonts names
- Keep suggestions contextual to the product type
- Be conversational — help the user think through their visual identity
- If `designbook/design-system/design-tokens.md` already exists, read it first and ask: "You already have design tokens defined. Would you like to update them or start fresh?"
