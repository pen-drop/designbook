---
type: data-mapping
name: theme-bootstrap
trigger:
  domain: data-mapping
  config_name: 'theme.*'
filter:
  backend: wordpress
---

# Blueprint: Theme Bootstrap

The theme is the Storybook project; Timber resolves the component namespace to the same
`components/` directory Storybook renders.

`theme.<ns>.functions` — `functions.php`:

```php
<?php
require_once ABSPATH . 'vendor/autoload.php';
Timber\Timber::init();
add_filter('timber/locations', function ($paths) {
    $paths['<ns>'] = [get_stylesheet_directory() . '/components'];
    $paths[] = [get_stylesheet_directory() . '/views'];
    return $paths;
});
add_filter('timber/twig/environment/options', fn ($o) => ['autoescape' => false] + $o);
add_action('wp_enqueue_scripts', function () {
    $css = get_stylesheet_directory() . '/css/app.css';
    if (is_file($css)) wp_enqueue_style(get_stylesheet(), get_stylesheet_directory_uri() . '/css/app.css', [], (string) filemtime($css));
});
```

`css/app.css` is the compiled stylesheet (`compile-css`), the same CSS Storybook renders with.

`theme.<ns>.single` — `single.php`:

```php
<?php
$context = Timber\Timber::context();
Timber\Timber::render(['single-' . $context['post']->post_type . '.twig', 'base.twig'], $context);
```

`theme.<ns>.base` — `views/base.twig`, the document frame every view extends:

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
