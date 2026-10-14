---
type: data-mapping
name: taxonomy
trigger:
  domain: data-mapping
  config_name: 'taxonomy.*'
filter:
  backend: wordpress
---

# Blueprint: Taxonomy

`taxonomy.<bundle>` registers a taxonomy for every post type that references it through a
`taxonomy` field.

```php
<?php
add_action('init', function () {
    register_taxonomy('recipe_category', ['recipe'], [
        'label' => 'Recipe Categories',
        'public' => true,
        'show_in_rest' => true,
        'hierarchical' => true,
    ]);
});
```
