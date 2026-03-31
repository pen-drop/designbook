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

> "Let's define the visual identity for **[Product Name]**. We'll set up **primitive** tokens (raw values) and **semantic** tokens (purpose-based aliases).
>
> Component-level tokens (layout spacing, container widths, etc.) are contributed automatically by blueprints — you don't need to define those here.
>
> Do you have colors and typography in mind, or would you like suggestions?"

Wait for their response.

## Step 2: Choose Colors

Guide the user through choosing colors. Suggest values based on the product vision and design guidelines reference.

These become `primitive.color.*` values, with `semantic.color.*` aliases pointing to them.

## Step 3: Choose Typography

> "For typography, we'll use Google Fonts.
>
> **Heading font:** Popular choices: `DM Sans`, `Inter`, `Poppins`, `Manrope`, `Space Grotesk`, `Outfit`
> **Body font:** Often same as heading, or: `Inter`, `Source Sans 3`, `Nunito Sans`, `Open Sans`
> **Mono font:** Options: `IBM Plex Mono`, `JetBrains Mono`, `Fira Code`, `Source Code Pro`
>
> My suggestions for **[Product Name]**: ..."

## Step 4: Optional — Additional Token Groups

Depending on the design, the user may want to define additional groups (breakpoints, spacing scale, type scale with modular ratio, radius, shadows, etc.). Ask if they need any of these. Each group becomes a key in the `intake` param.

## Step 5: Present Final Choices and Confirm

Summarize all chosen tokens before saving. Structure the result as a single `intake` param object where each key is a token group:

```yaml
intake:
  colors:
    indigo-600: "#4F46E5"
    slate-50: "#F8FAFC"
  typography:
    heading: "Space Grotesk"
    body: "Inter"
  type_scale:          # optional
    ratio: 1.25
    base: 16
  breakpoints:         # optional
    sm: 640
    md: 768
    lg: 1024
```

Once approved, the `create-tokens` stage runs automatically.

**Constraints**
- Colors must be hex codes (e.g. `#494FE5`)
- Fonts must be exact Google Fonts names
- Keep suggestions contextual to the product vision
