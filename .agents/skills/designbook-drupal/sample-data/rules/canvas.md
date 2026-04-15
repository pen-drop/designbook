---
domain: sample-data
when:
  extensions: canvas
  backend: drupal
---

# Sample Data: Canvas

Applies **only to bundles where `purpose: landing-page`** is set in `data-model.yml` and the `canvas` extension is active. Ignore this rule for all other bundles.

## Entity Type

Canvas pages use the `canvas_page` entity type (not `node`). In `data-model.yml` these appear under `content.canvas_page.<bundle>`. In `data.yml` they appear under `canvas_page.<bundle>`.

## Step 0: Scan available components (mandatory)

> ⛔ **Do this before writing any `components` field.** The `create-component` stage may have added new components — always read the current state.

Read all `*.component.yml` files in `$DESIGNBOOK_HOME/components/*/`. Build an allowlist:

```
available_components = [provider:name, ...]  # one entry per *.component.yml
```

Only component names from this allowlist may appear in the `components` tree. Any component not in the allowlist is forbidden — do not invent names.

## Record Structure

Each record MUST include a `components` field containing a `ComponentNode[]` tree. The canvas entity mapper is a direct passthrough — `$record.components` is rendered as-is in Storybook. This means **every component name in `components` must be a real SDC component** from the Step 0 allowlist.

> ⛔ **Never invent component names.** Do not use `canvas_section`, `canvas_text`, `canvas_image`, `canvas_cta`, or any other fictional type. Use only what Step 0 found.

## Slots Format

Slot values in `components` are either plain strings (for text/HTML content) or arrays of nested `ComponentNode`. Use `slots:` as an object (not an array):

```yaml
slots:
  header: "Section heading text"
  content:
    - component: "$COMPONENT_NAMESPACE:child_component"
      props: {}
      slots: {}
```

## Example

Using the components available from the Step 0 scan (e.g. `section`, `hero`, `feature-card`, `rich-snippet`):

```yaml
components:
  - component: "$COMPONENT_NAMESPACE:section"
    props:
      max_width: "lg"
      padding_top: "lg"
      padding_bottom: "lg"
      columns: 1
    slots:
      column_1:
        - component: "$COMPONENT_NAMESPACE:hero"
          slots:
            content:
              - component: "$COMPONENT_NAMESPACE:rich-snippet"
                props:
                  headline: "Quality Nutrition for Happy Pets"
                  headline_level: "h1"
                  text: "Curated, quality-verified products for dogs, cats, birds, and more."

  - component: "$COMPONENT_NAMESPACE:section"
    props:
      max_width: "lg"
      padding_top: "md"
      padding_bottom: "md"
      columns: 2
    slots:
      column_1:
        - component: "$COMPONENT_NAMESPACE:feature-card"
          slots:
            content:
              - component: "$COMPONENT_NAMESPACE:rich-snippet"
                props:
                  headline: "Premium Dog Food"
                  headline_level: "h3"
                  text: "High-protein formula for adult dogs"
      column_2:
        - component: "$COMPONENT_NAMESPACE:feature-card"
          slots:
            content:
              - component: "$COMPONENT_NAMESPACE:rich-snippet"
                props:
                  headline: "Cat Treats"
                  headline_level: "h3"
                  text: "Irresistible flavours cats love"
```

