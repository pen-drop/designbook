---
type: data-mapping
name: layout-bricks
trigger:
  domain: data-mapping
  config_name: 'layout.*'
filter:
  backend: wordpress
  extensions: bricks
---

# Blueprint: Bricks scene layout seed

Starting point when `unit.build_form` is `bricks`. `layout.<scene>` is a PHP seed run with `backend_cmd.seed_cmd` after import. It upserts a `page` by `_designbook_id` (`layout.<scene>`) and writes the scene component tree into `_bricks_page_content_2`.

```php
<?php
require_once WP_PLUGIN_DIR . '/<ns>-content/src/BricksAdapter.php';
$tree = [ /* scene component tree: component, props, slots */ ];
$elements = Designbook\Bricks\Adapter::fromScene($tree);
$found = get_posts([
    'post_type' => 'page',
    'meta_key' => '_designbook_id',
    'meta_value' => 'layout.<scene>',
    'numberposts' => 1,
    'post_status' => 'any',
    'fields' => 'ids',
]);
$postId = $found
    ? (int) $found[0]
    : wp_insert_post(['post_type' => 'page', 'post_status' => 'publish', 'post_title' => '<scene>', 'post_name' => '<scene>'], true);
if (is_wp_error($postId)) throw new RuntimeException($postId->get_error_message());
update_post_meta($postId, '_designbook_id', 'layout.<scene>');
update_post_meta($postId, '_bricks_editor_mode', 'bricks');
update_post_meta($postId, '_bricks_page_content_2', wp_slash(wp_json_encode($elements)));
echo ($found ? 'updated ' : 'created ') . "layout.<scene>\n";
```

Each tree node is `{ component, props, slots }`. `component` is `ns:id` or `id`; `slots` maps slot name → child nodes. Apply with `{{ backend_cmd.seed_cmd }}` on this file (path relative to the WordPress root: `wp-content/{{ unit.path }}`).
