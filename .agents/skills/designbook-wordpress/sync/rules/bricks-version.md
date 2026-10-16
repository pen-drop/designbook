---
trigger:
  steps: [sync-to:intake, sync-to:transform]
filter:
  backend: wordpress
---

# Rule: Bricks version

The WordPress Bricks adapter targets **Bricks 2.0 or later**. Nestable elements exist since 1.5; the stored element envelope is `id`, `name`, `parent`, `children`, `settings` as documented for 2.x.
