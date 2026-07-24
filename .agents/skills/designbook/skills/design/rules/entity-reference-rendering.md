---
trigger:
  steps: [design-screen:intake, design-entity:intake, create-sample-data, design-screen:map-entity, design-entity:map-entity, create-scene]
---

# Entity Reference Rendering

Entity references render as entities in scene, mapping, and sample-data planning output.
They are not component props and they are not inline child data. Components may expose
slots that receive rendered child entities, but component generation does not resolve
entity references.

## Renderable Entity Closure

When a workflow produces `entity_mappings` and `sample_data_bundles`, those results MUST
contain the full renderable entity closure:

- Start with every entity the workflow explicitly renders.
- Recursively traverse each rendered bundle's `type: reference` fields whose target exists
  under `data_model.content`.
- Add every reached bundle to `entity_mappings` with the view mode used for that render.
- Add every reached `{ entity_type, bundle }` pair to `sample_data_bundles`.
- Order referenced child bundles before parents.

A field whose own data-model `type` is `image` may emit an ImageNode directly. A field
whose data-model `type` is `reference` is never that image shortcut, even when it targets a
media bundle.

If any task reaches a renderable `type: reference` target that is missing from
`entity_mappings` or `sample_data_bundles`, stop and repair the planning result before
generating files. Do not compensate by inlining the child record data into the parent.

## Sample Data Output

Sample data for a `type: reference` field stores references to target records, not embedded
target records. For content entities, the field value is the target record id (or an array
of target record ids for multi-value fields). The referenced bundle's own data file contains
the target fields.

```yaml
field_items:
  - "1"
  - "2"
```

```yaml
# Wrong: referenced child records are embedded in the parent record.
field_items:
  - field_title: "Child title"
```

## Mapping Output

JSONata mapping output MUST place rendered entity references in slots or as top-level
items. A mapping MUST NOT read fields from a referenced record through the parent record
and MUST NOT pass referenced entities through `props`.

```jsonata
{
  "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:parent",
  "slots": {
    "items": [
      { "entity": "paragraph.item", "view_mode": "full", "record": 0 }
    ]
  }
}
```

The referenced entity's own mapping is responsible for its fields and component choice.
Use the parent reference field value only to select the target record index/id for the
EntityNode.
