---
type: data-mapping
name: theme-bootstrap
trigger:
  domain: data-mapping
  config_name: 'theme.*'
filter:
  backend: wordpress
---

# Blueprint: Theme Base View and Index

`theme.<ns>.base` — `views/designbook-base.twig`, the document frame every generated view
extends. Timber itself is booted by the content plugin.

```twig
<!doctype html>
<html {{ function('language_attributes') }}>
<head>{{ function('wp_head') }}</head>
<body>
{% include 'parts/header.twig' ignore missing %}
<main>{% block content %}{% endblock %}</main>
{% include 'parts/footer.twig' ignore missing %}
{{ function('wp_footer') }}
</body>
</html>
```

`theme.<ns>.index` — `index.php`, the fallback controller that also makes a scaffolded theme
activatable:

```php
<?php
if (class_exists('Timber\Timber')) Timber\Timber::render('designbook-base.twig', Timber\Timber::context());
```
