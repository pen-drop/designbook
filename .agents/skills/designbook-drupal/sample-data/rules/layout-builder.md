---
trigger:
  domain: sample-data
filter:
  backend: drupal
  extensions: layout_builder
---

# Sample Data: Layout Builder

Applies **only to bundles where `purpose: landing-page`** is set in `data-model.yml` and the `layout_builder` extension is active. Ignore this rule for all other bundles.

## Record Structure

Each record for a Layout Builder landing page MUST include:

```yaml
layout_builder__layout:
  - component: "<provider>:<component-name>"
    slots:
      <slot-name>:
        type: entity
        entity_type: block_content
        bundle: <section_bundle>
        record: 0
```

- `layout_builder__layout` is an array of **component scene nodes** (with `component:` key)
- Each component's slots contain **entity scene nodes** referencing `block_content` records
- Use the `block_content` bundles defined in `data-model.yml`
- Generate at least 2–3 component entries per node record

## Ordering Constraint

`block_content` sample records MUST be generated **before** `node` records that reference them. Process `block_content` bundles first in the `create-sample-data` stage.

## Example

```yaml
content: 
    node:
      landing_page:
        - title: "Home"
          layout_builder__layout:
            - component: "COMPONENT_NAMESPACE:hero"
              slots:
                content:
                  type: entity
                  entity_type: block_content
                  bundle: hero
                  record: 0
            - component: "COMPONENT_NAMESPACE:feature-section"
              slots:
                content:
                  type: entity
                  entity_type: block_content
                  bundle: features
                  record: 0
            - component: "COMPONENT_NAMESPACE:cta"
              slots:
                content:
                  type: entity
                  entity_type: block_content
                  bundle: cta_banner
                  record: 0
    
    block_content:
      hero:
        - title: "Welcome Hero"
          field_media:
            type: image
            url: "/images/hero.jpg"
          body: "<p>Welcome to our site.</p>"
      features:
        - title: "Key Features"
          body: "<p>Our platform offers...</p>"
```
