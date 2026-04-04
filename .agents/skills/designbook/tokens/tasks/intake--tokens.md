---
files: []
reads:
  - path: $DESIGNBOOK_DATA/vision.md
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

Introduce the token setup to the user: primitive tokens (raw values) and semantic tokens (purpose-based aliases). Ask whether they have colors and typography in mind or would like suggestions.

Wait for their response.

## Step 2: Choose Colors

Guide the user through choosing colors. Suggest values based on the product vision and design guidelines reference.

These become `primitive.color.*` values, with `semantic.color.*` aliases pointing to them.

## Step 3: Choose Typography

Guide the user through choosing fonts from Google Fonts for heading, body, and mono roles. Suggest options based on the product vision.

Also collect a typography scale with semantic roles (e.g., display, headline, title, body, label). Each role SHALL have a font size, font weight, and line height. Concrete role names and values come from the design reference at runtime — do not hardcode specific roles or sizes in this task.

## Step 4: Check Layout Blueprints

Read `required_tokens` from each blueprint already loaded for this stage. For each blueprint that declares `required_tokens`, extract its token groups and present them to the user with their default values.

Suggest adjusted values based on the product's design guidelines. Let the user confirm or override each group. Include the final values in the `intake` param under their respective `component.*` keys.

## Step 5: Optional — Additional Token Groups

Depending on the design, the user may want to define additional groups (breakpoints, spacing scale, radius, shadows, etc.). Ask if they need any of these. Each group becomes a key in the `intake` param.

## Step 6: Present Final Choices and Confirm

Summarize all chosen tokens before saving and wait for user approval. Once approved, the `create-tokens` stage runs automatically.

**Constraints**
- Colors must be hex codes
- Fonts must be exact Google Fonts names
- Keep suggestions contextual to the product vision
