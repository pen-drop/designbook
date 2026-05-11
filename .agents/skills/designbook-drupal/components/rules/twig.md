---
trigger:
  steps: [create-component]
filter:
  frameworks.component: sdc
---

# .twig Template Constraints

See `resources/twig.md` for the full how-to. Naming spec (prop/slot keys → variable references) lives in `component-yml.md`.

- **One root element**, `attributes.addClass` on it: `<div{{ attributes.addClass(['name']) }}>`. No fragments.
- **Slot rendering** conditional: `{% if slot %}{{ slot }}{% endif %}`. No wrapper unless the surrounding markup requires it.
- **Layout components** (`container`, `section`, `grid`) wrap each slot in `{% block <slot> %}…{% endblock %}` for `{% embed %}` compatibility. Non-layout components don't.
- **No hardcoded colors** — use CSS custom properties from design tokens or utility classes derived from them.
- **One `.twig` file** per component. Variants inline with `{% if variant == '…' %}` blocks. Never create `<name>--<variant>.twig` — the SDC addon imports every `.twig` in the directory and partials collide.
