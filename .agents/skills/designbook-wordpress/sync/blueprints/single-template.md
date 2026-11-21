---
type: data-mapping
name: single-template
trigger:
  domain: data-mapping
  config_name: 'template.*'
filter:
  backend: wordpress
---

# Blueprint: Single Template

`template.<bundle>.single` — `single-<bundle>.php`, the thin Timber controller WordPress picks
for one post of the bundle:

```php
<?php
Timber\Timber::render('single-<bundle>.twig', Timber\Timber::context());
```
