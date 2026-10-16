---
type: data-mapping
name: single-template
trigger:
  domain: data-mapping
  config_name: 'template.*.single'
filter:
  backend: wordpress
---

# Blueprint: Single Template

Skip this unit when the bundle's `full` view-mode `template` / `build_form` is `gutenberg`;
the block-theme HTML template owns that mapping.

`template.<bundle>.single` — `single-<bundle>.php`, the thin Timber controller WordPress picks
for one post of the bundle:

```php
<?php
Timber\Timber::render('single-<bundle>.twig', Timber\Timber::context());
```
