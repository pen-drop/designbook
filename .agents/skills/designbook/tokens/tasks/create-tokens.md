---
when:
  steps: [create-tokens]
domain: [tokens]
params:
  type: object
  required: [reference_dir]
  properties:
    reference_dir: { type: string }
reads:
  - path: $DESIGNBOOK_DATA/vision.md
    workflow: /debo-vision
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
result:
  type: object
  required: [design-tokens]
  properties:
    design-tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
      required: [primitive, semantic]
      properties:
        primitive: { type: object, title: Primitive Tokens }
        semantic: { type: object, title: Semantic Tokens }
        component: { type: object, title: Component Tokens, default: {} }
---

# Design Tokens

Guide the user through choosing colors and typography. Result is W3C Design Token YAML.

## Gathering

### Step 1: Extract Design Reference

If `$reference_dir` is non-empty and `$reference_dir/extract.json` exists (from a prior run), read it and use as-is.

Otherwise, apply the `extract-reference` rule to the design reference URL from `vision.md`.

Use its `fonts`, `colors`, and `tokens` fields as the starting point for token creation.

If no design reference URL is available, fall back to `vision.md` context and user input.

### Step 2: Explain and Gather Preferences

Introduce the token setup to the user: primitive tokens (raw values) and semantic tokens (purpose-based aliases).

**If design reference is available**, present the fonts and colors from `$reference_dir/extract.json` as the starting point and ask the user to confirm or adjust.

**If no design reference**, ask whether they have colors and typography in mind or would like suggestions.

Wait for their response.

### Step 3: Choose Colors

Guide the user through choosing colors.

**If design reference is available**, present the color palette from `$reference_dir/extract.json` (use the `tokens.colors` field for semantic grouping, `colors` array for the full palette). Let the user confirm, adjust, or add colors.

**If no design reference**, suggest values based on the product vision.

These become `primitive.color.*` values, with `semantic.color.*` aliases pointing to them.

### Step 4: Choose Typography

Guide the user through choosing fonts from Google Fonts for heading, body, and mono roles.

**If design reference is available**, present the font families from `$reference_dir/extract.json` (use the `tokens.fonts` field for role assignment). Let the user confirm or override.

**If no design reference**, suggest options based on the product vision.

Also collect a typography scale with semantic roles (e.g., display, headline, title, body, label). Each role SHALL have a font size, font weight, and line height. Concrete role names and values come from the design reference at runtime — do not hardcode specific roles or sizes in this task.

### Step 5: Check Layout Blueprints

Read `required_tokens` from each blueprint already loaded for this stage. For each blueprint that declares `required_tokens`, extract its token groups and present them to the user with their default values.

Suggest adjusted values based on the product's design reference. Let the user confirm or override each group.

### Step 6: Optional — Additional Token Groups

Depending on the design, the user may want to define additional groups (breakpoints, spacing scale, radius, shadows, etc.). Ask if they need any of these.

### Step 7: Present Final Choices and Confirm

Summarize all chosen tokens before saving and wait for user approval.

## Token Hierarchy

All tokens live in `design-tokens.yml` organized in three fixed levels:

```yaml
primitive:        # Raw values — no references, only concrete values
  color:
    indigo-600: { $value: "#4F46E5", $type: color }
  spacing:
    4: { $value: "1rem", $type: dimension }

semantic:         # Purpose-based aliases referencing primitives
  color:
    primary: { $value: "{primitive.color.indigo-600}", $type: color }
  typography:
    heading: { $value: "Space Grotesk", $type: fontFamily }

component:        # Component-specific tokens from blueprint required_tokens
  container:
    max-width:
      lg: { $value: "1024px", $type: dimension }
```

## Format Constraints

- Every leaf token must have `$value` and `$type`
- Colors must be hex codes
- Fonts must be exact Google Fonts names
- Valid `$type` values: `color`, `fontFamily`, `dimension`, `number`, `fontWeight`, `duration`, `cubicBezier`, `shadow`, `gradient`, `transition`, `border`, `strokeStyle`, `typography`
- Three levels: primitive (raw) → semantic (aliases) → component (blueprint-derived)
- Semantic tokens MUST reference primitives via `{primitive.<group>.<key>}` — no raw values in semantics
- Read the css-naming blueprint from `task.blueprints[]` filtered by `type: css-naming` for token group names and CSS variable mapping
- Apply renderer hints per the `renderer-hints` rule
