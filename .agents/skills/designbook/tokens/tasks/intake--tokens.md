---
when:
  steps: [tokens:intake]
files: []
reads:
  - path: $DESIGNBOOK_DATA/vision.md
    workflow: /debo-vision
  - path: $STORY_DIR/design-reference.md
    optional: true
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Intake: Design Tokens

Help the user choose colors and typography for their product. The result is saved to `$DESIGNBOOK_DATA/design-system/design-tokens.yml`.

> Color naming and required token roles are determined by framework naming rules loaded for this stage.

## Step 1: Extract Design Reference

If `$STORY_DIR/design-reference.md` already exists (from a prior run), read it and use as-is.

Otherwise, apply the `extract-reference` rule to the design reference URL from `vision.md`. Write the result directly to `$STORY_DIR/design-reference.md`.

Use its **Fonts** and **Color Palette** sections as the starting point for token creation.

If no design reference URL is available, fall back to `vision.md` context and user input.

## Step 2: Explain and Gather Preferences

Introduce the token setup to the user: primitive tokens (raw values) and semantic tokens (purpose-based aliases).

**If design reference is available**, present the fonts and colors from `design-reference.md` as the starting point and ask the user to confirm or adjust.

**If no design reference**, ask whether they have colors and typography in mind or would like suggestions.

Wait for their response.

## Step 3: Choose Colors

Guide the user through choosing colors.

**If design reference is available**, present the color palette from `design-reference.md` grouped by hue similarity as the starting primitive palette. Let the user confirm, adjust, or add colors.

**If no design reference**, suggest values based on the product vision.

These become `primitive.color.*` values, with `semantic.color.*` aliases pointing to them.

## Step 4: Choose Typography

Guide the user through choosing fonts from Google Fonts for heading, body, and mono roles.

**If design reference is available**, present the font families from `design-reference.md` as heading/body/mono candidates. Let the user confirm or override.

**If no design reference**, suggest options based on the product vision.

Also collect a typography scale with semantic roles (e.g., display, headline, title, body, label). Each role SHALL have a font size, font weight, and line height. Concrete role names and values come from the design reference at runtime — do not hardcode specific roles or sizes in this task.

## Step 5: Check Layout Blueprints

Read `required_tokens` from each blueprint already loaded for this stage. For each blueprint that declares `required_tokens`, extract its token groups and present them to the user with their default values.

Suggest adjusted values based on the product's design reference. Let the user confirm or override each group. Include the final values in the `intake` param under their respective `component.*` keys.

## Step 6: Optional — Additional Token Groups

Depending on the design, the user may want to define additional groups (breakpoints, spacing scale, radius, shadows, etc.). Ask if they need any of these. Each group becomes a key in the `intake` param.

## Step 7: Present Final Choices and Confirm

Summarize all chosen tokens before saving and wait for user approval. Once approved, the `create-tokens` stage runs automatically.

**Constraints**
- Colors must be hex codes
- Fonts must be exact Google Fonts names
- Keep suggestions contextual to the product vision
