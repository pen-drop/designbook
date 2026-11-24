---
type: field-types
name: field-types
priority: 10
trigger:
  domain: data-model
filter:
  backend: wordpress
suggests:
  field_type_enum:
    enum: [text, textarea, wysiwyg, number, true_false, select, link, image, gallery, relationship, taxonomy, repeater]
    description: >
      Designbook field types for the WordPress backend; each maps 1:1 to the ACF field type of
      the same name. `repeater` carries `sub_fields`, `select` carries `settings.choices`,
      `relationship` carries `settings.target` (post type or `user`), `taxonomy` carries
      `settings.taxonomy`.
---

# Blueprint: Field Types

How a Designbook field definition becomes an ACF field inside the bundle's field group
(`acf_add_local_field_group`). The field `type` is the ACF type name.

## Multi-value fields

ACF fields hold one value; a field with `multiple: true` becomes the multi-value ACF form:

| Single value | Multiple values |
|---|---|
| `image` | `gallery` |
| `relationship` | `relationship` with `settings.multiple: true` (ACF `max` unset) |
| `taxonomy` | `taxonomy` with `settings.field_type: multi_select` |
| any structured record | `repeater` with `sub_fields` |

A repeater declares its columns under `sub_fields` with the same field shape:

```yaml
ingredients:
  type: repeater
  title: Ingredients
  sub_fields:
    quantity: { type: text }
    unit: { type: text }
    name: { type: text, required: true }
```

## ACF field shape

- `key`: `field_<bundle>_<name>` (sub fields: `field_<bundle>_<name>_<sub>`)
- `name`: the Designbook field name; `label`: `title`; `required`: `required`
- `image`/`gallery`: `return_format: array`
- `relationship`: `post_type: [<settings.target>]`, `return_format: object`
- `taxonomy`: `taxonomy: <settings.taxonomy>`, `return_format: object`
- `select`: `choices: <settings.choices>`
