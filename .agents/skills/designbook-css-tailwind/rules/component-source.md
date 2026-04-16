---
trigger:
  domain: components
filter:
  frameworks.style: tailwind
---

# Tailwind Component Source Registration

After creating a component, add a `@source` directive for the new component directory to `$DESIGNBOOK_CSS_APP` so Tailwind's JIT compiler picks up its utility classes.

```css
/* In $DESIGNBOOK_CSS_APP (e.g. app.src.css) */
@source "../components/new-component";
```

Without this directive, Tailwind utility classes used in the component's `.twig` template will not be compiled into the output CSS.
