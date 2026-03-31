---
files: []
reads:
  - path: $DESIGNBOOK_DATA/product/vision.md
    workflow: /debo-vision
  - path: $DESIGNBOOK_DATA/design-system/guidelines.yml
    optional: true
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Intake: Design Tokens

Help the user choose colors and typography for their product. The result is saved to `$DESIGNBOOK_DATA/design-system/design-tokens.yml`.

> Color naming and required token roles are determined by framework naming rules loaded for this stage.

## Step 1: Explain and Gather Preferences

> "Let's define the visual identity for **[Product Name]**. I'll help you choose colors and typography. Do you have anything in mind, or would you like suggestions?"

Wait for their response.

## Step 2: Choose Colors

Guide the user through choosing colors. Suggest values based on the product vision and design guidelines reference.

## Step 3: Choose Typography

> "For typography, we'll use Google Fonts.
>
> **Heading font:** Popular choices: `DM Sans`, `Inter`, `Poppins`, `Manrope`, `Space Grotesk`, `Outfit`
> **Body font:** Often same as heading, or: `Inter`, `Source Sans 3`, `Nunito Sans`, `Open Sans`
> **Mono font:** Options: `IBM Plex Mono`, `JetBrains Mono`, `Fira Code`, `Source Code Pro`
>
> My suggestions for **[Product Name]**: ..."

## Step 4: Present Final Choices and Confirm

Summarize all chosen tokens before saving. Once approved, the `create-tokens` stage runs automatically.

**Constraints**
- Colors must be hex codes (e.g. `#494FE5`)
- Fonts must be exact Google Fonts names
- Keep suggestions contextual to the product vision
