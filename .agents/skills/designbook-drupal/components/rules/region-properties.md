---
trigger:
  steps: [create-component, create-scene]
filter:
  frameworks.component: sdc
---

# Region Properties — SDC / Twig output

When materializing `region_properties` into SDC Twig templates:

- Apply classes via `{{ attributes.addClass([...]) }}` on the root element.
  Never write `<header style="...">` — Twig's `attributes` is the only
  attribute interface in SDC.
- Slot content goes through `{% block <slot> %}{{ <slot> }}{% endblock %}`.
- If the matched root carries a vendor / framework custom-element tag
  (e.g. `app-site-header` from an Angular source), translate to the
  semantically correct HTML tag (`<header>`, `<footer>`, `<nav>`) on the
  generated component.
