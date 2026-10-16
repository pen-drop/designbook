---
type: data-mapping
name: elementor-layout
trigger:
  domain: data-mapping
  config_name: 'layout.*'
filter:
  backend: wordpress
---

# Blueprint: Elementor Scene Seed

`layout.<scene>` — `plugins/<ns>-elementor/seeds/<scene>.php`, run by `backend_cmd.seed_cmd`.
Inline the scene `items` and token values. Build the document, upsert the page, mirror the kit,
print the permalink.

```php
<?php
$ns = '<ns>';
$items = [ /* scene items */ ];
$images = [
    'public/images/hero.png' => get_stylesheet_directory() . '/public/images/hero.png',
];
$palette = [ /* color slug => hex */ ];
$fontFamilies = [ /* typography slug => family */ ];

$registry = new Designbook\ComponentRegistry(get_stylesheet_directory() . '/components', $ns);
$definitions = [];
foreach ($registry->all() as $id => $def) {
    $definitions[$id] = ['id' => $def->id, 'ui' => $def->ui, 'slots' => $def->slots];
}
$elements = Designbook\Elementor\Document::fromScene($items, $definitions, $ns);
$postId = Designbook\Elementor\Seed::upsert('<scene>', $elements, $images);
Designbook\Elementor\Tokens::mirrorKit($palette, $fontFamilies);
echo get_permalink($postId), "\n";
```
