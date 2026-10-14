---
type: data-mapping
name: field-group
trigger:
  domain: data-mapping
  config_name: 'field_group.*'
filter:
  backend: wordpress
---

# Blueprint: ACF Field Group

`field_group.<et>_<bundle>` registers one local ACF field group with every non-base field of
the bundle (ACF types per the `field-types` blueprint). Location: `post_type == <bundle>` for
`post`, `taxonomy == <bundle>` for `term`, `attachment == all` for `attachment`.

```php
<?php
add_action('acf/init', function () {
    acf_add_local_field_group([
        'key' => 'group_post_recipe',
        'title' => 'Recipe',
        'fields' => [
            ['key' => 'field_recipe_prep_minutes', 'name' => 'prep_minutes', 'label' => 'Prep minutes', 'type' => 'number', 'required' => 1],
            ['key' => 'field_recipe_ingredients', 'name' => 'ingredients', 'label' => 'Ingredients', 'type' => 'repeater',
             'sub_fields' => [
                 ['key' => 'field_recipe_ingredients_name', 'name' => 'name', 'label' => 'Name', 'type' => 'text'],
             ]],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'recipe']]],
    ]);
});
```
