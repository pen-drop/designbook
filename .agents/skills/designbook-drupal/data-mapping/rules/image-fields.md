---
trigger:
  domain: data-mapping
---

# Rule: Image Field Mapping

Hard constraints for mapping image and reference fields in entity-mapping JSONata expressions.

## Invariants

### 1. Images are always slots

An ImageNode or EntityNode representing an image MUST be placed in a named **slot** of a ComponentNode — never as a prop value.

```jsonata
/* correct — image in slot */
{
  "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:content-teaser",
  "props": { "title": title },
  "slots": {
    "image": [
      { "image": "leando_teaser", "alt": field_image.alt }
    ]
  }
}

/* wrong — image as prop */
{
  "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:content-teaser",
  "props": {
    "title": title,
    "image": field_image.url,
    "image_alt": field_image.alt
  }
}
```

### 2. `type: image` fields emit ImageNode via image style

When the data-model field type is `image`, the image data lives directly on the entity. The JSONata mapping emits an ImageNode with a mandatory image style name:

```jsonata
{ "image": "<style_name>", "alt": <field>.alt }
```

The `<style_name>` MUST reference a bundle defined under `config.image_style` in `data-model.yml`. No image without an image style.

### 3. `type: reference` fields emit EntityNode

When the data-model field type is `reference`, the JSONata mapping emits an EntityNode. The referenced entity renders itself — the mapping does not access the referenced entity's data.

```jsonata
{ "entity": "<entity_type>.<bundle>", "view_mode": "<view_mode>", "record": <index> }
```

This applies to ALL reference types — media, paragraph, node, taxonomy_term, etc. What the referenced entity produces (ImageNode, ComponentNode, etc.) is that entity's own mapping concern.
