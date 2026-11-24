---
type: data-mapping
name: template-parts
trigger:
  domain: data-mapping
  config_name: 'parts.*'
filter:
  backend: wordpress
---

# Blueprint: Template Parts

`parts.<ns>.header` / `parts.<ns>.footer` render the design-system shell's header and footer
components with their story props, so every page shares the shell:

```twig
{% include '@<ns>/header/header.twig' with { … } only %}
```
