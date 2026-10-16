---
trigger:
  steps: [sync-to:intake, sync-to:transform]
filter:
  backend: wordpress
  extensions: bricks
---

# Rule: Bricks version

The WordPress Bricks adapter targets **Bricks 2.0 or later**. Nestable elements exist since 1.5; the stored element envelope is `id`, `name`, `parent`, `children`, `settings` as documented for 2.x.

The plugin main file requires `src/BricksAdapter.php` and hooks `Designbook\Bricks\Adapter::register` on `designbook/register_components`.
