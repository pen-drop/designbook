---
type: data-mapping
name: theme-bootstrap
trigger:
  domain: data-mapping
  config_name: 'theme.*'
filter:
  backend: wordpress
---

# Blueprint: Theme Base View

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
