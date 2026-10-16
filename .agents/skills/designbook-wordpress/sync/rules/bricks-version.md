---
trigger:
  steps: [sync-to:intake, sync-to:transform]
filter:
  backend: wordpress
  extensions: bricks
---

# Rule: Bricks version

The WordPress Bricks adapter targets **Bricks 2.0 or later**. Nestable elements exist since 1.5; the stored element envelope is `id`, `name`, `parent`, `children`, `settings` as documented for 2.x.

The plugin loads `src/BricksAdapter.php` from `designbook/register_components` after `\Bricks\Element` exists:

```php
add_action('designbook/register_components', function ($registry) {
    if (!class_exists(\Bricks\Element::class)) return;
    require_once __DIR__ . '/src/BricksAdapter.php';
    \Designbook\Bricks\Adapter::register($registry);
});
```
