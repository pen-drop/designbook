---
type: data-mapping
name: post-type
trigger:
  domain: data-mapping
  config_name: 'post_type.*'
filter:
  backend: wordpress
---

# Blueprint: Post Type

`post_type.<bundle>` registers a custom post type. Label from the bundle `purpose` (plural,
human-readable); `supports` lists the base fields the bundle declares; `taxonomies` lists the
bundle's `taxonomy` field targets.

```php
<?php
add_action('init', function () {
    register_post_type('recipe', [
        'label' => 'Recipes',
        'public' => true,
        'show_in_rest' => true,
        'has_archive' => true,
        'rewrite' => ['slug' => 'recipe'],
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail'],
        'taxonomies' => ['recipe_category'],
    ]);
});
```
