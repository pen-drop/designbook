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

`view.<bundle>.full` — `views/single-<bundle>.twig` renders one post of the bundle by
including the component that presents it. When an entity mapping for `<et>.<bundle>.full`
exists, follow its component tree and field bindings; otherwise pass each bundle field to the
component prop of the same meaning.

```twig
{% extends 'base.twig' %}
{% block content %}
  {% include '@<ns>/recipe-card/recipe-card.twig' with {
    title: post.title,
    image: post.thumbnail ? post.thumbnail.src : null,
    total_minutes: post.meta('prep_minutes') + post.meta('cook_minutes'),
  } only %}
{% endblock %}
```

Native post properties: `post.title`, `post.content`, `post.preview` (excerpt), `post.thumbnail`,
`post.author.name`; ACF fields via `post.meta('<name>')` (repeaters return arrays of rows,
images ACF arrays with `url` and `alt`).
