---
when:
  stages: [create-sample-data]
  extensions: canvas
  backend: drupal
---

# Sample Data: Canvas<

Applies **only to fields where `sample_template.template: canvas`** is set in `data-model.yml`. Ignore this rule for all other fields.

## Entity Type

Canvas pages use the `canvas_page` entity type (not `node`). In `data-model.yml` these appear under `content.canvas_page.<bundle>`. In `data.yml` they appear under `canvas_page.<bundle>`.

## Record Structure

Each record for a Canvas page MUST include a `components` field with a nested component in scene node structures. See in skill designbook-scenes/resources/scenes-schema.md for full reference. 


```yaml
components:
  - component: [provider]:canvas_section
    slots:
      - column_1:
          - component: [provider]:canvas_text
            props:
              text: "..."
          - component: [provider]:canvas_image
            props:
              src: "/path/to/image.jpg"
              alt: "..."
          - component: [provider]:canvas_cta
            props:
              label: "..."
              href: "/..."
            slots:
              action:
                - component: [provider]:button
                  props:
                    label: "..."
                    href: "/..."  
```
