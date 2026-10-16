---
type: data-mapping
name: single-view
trigger:
  domain: data-mapping
  config_name: 'view.*'
filter:
  backend: wordpress
---

# Blueprint: Single View

Skip this unit when the bundle's `full` view-mode `template` / `build_form` is `gutenberg`;
the seeded `post_content` plus `templates/single-<bundle>.html` own that mapping.

`view.<bundle>.full` — `views/single-<bundle>.twig` renders one post of the bundle by
including the component that presents it. When an entity mapping for `<et>.<bundle>.full`
exists, follow its component tree and field bindings; otherwise bind each prop of the
component's `<name>.schema.yml` to the bundle field (or expression of fields) of the same
meaning.

```twig
{% extends 'designbook-base.twig' %}
{% block content %}
  {% include '@<ns>/<component>/<component>.twig' with {
    <prop>: <post expression>,
  } only %}
{% endblock %}
```

Post expressions, by the kind of value a prop expects:

| Value | Expression |
|---|---|
| Native field | `post.title`, `post.content`, `post.preview` (excerpt), `post.link`, `post.author.name` |
| Featured image | `post.thumbnail.src`, `post.thumbnail.alt` |
| ACF field | `post.meta('<name>')`; a repeater returns an array of rows, an image an ACF array with `url` and `alt`, a select its stored key |
| Derived text | Twig expressions over fields, e.g. `(post.meta('<a>') + post.meta('<b>')) ~ ' Min'`, `post.meta('<select>')\|upper` |
