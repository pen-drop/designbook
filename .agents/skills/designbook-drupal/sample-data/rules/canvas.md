---
trigger:
  domain: sample-data
filter:
  extensions: canvas
  backend: drupal
---

# Sample Data: Canvas

Applies to `canvas_page` bundles while the `canvas` extension is active.

## Entity Type

Canvas pages use the `canvas_page` entity type (not `node`). In `data-model.yml` these appear under `content.canvas_page.<bundle>`. In `data/canvas_page.<bundle>.yml` they appear as a bare record array, each record carrying the `__designbook.section` tag.

## Component inventory

Intake records the component allowlist from existing artifacts and all planned component writes. A declared predecessor may refresh artifact data after those writes, using only those fixed IDs. Every component in the sample tree belongs to this allowlist; missing required components block execution instead of adding work.

## Record Structure

On `canvas_page` the bundle's `component_tree` field is `components`; each record fills it with the page's component tree. The canvas entity mapper passes `$record.components` through unchanged, so Storybook renders exactly that tree. Component IDs and tree shape follow the generic `component-tree` sample-data rule (CT-01..03).

> ⛔ **Never invent component names.** Do not use `canvas_section`, `canvas_text`, `canvas_image`, `canvas_cta`, or any other fictional type. Use only what intake declared.

## Example

Using the components available from the intake inventory (e.g. `section`, `hero`, `feature-card`, `rich-snippet`):

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

