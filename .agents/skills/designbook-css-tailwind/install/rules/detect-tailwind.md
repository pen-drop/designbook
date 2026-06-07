---
trigger:
  steps: [write-config]
---

# Detect Tailwind

Detection criteria that pre-select Tailwind as the `css_framework` default for the
install target. This rule has no `filter:` — it runs while the CSS framework is still
being chosen.

Pre-select Tailwind as the default choice when either holds for the install target:

- `package.json` lists `tailwindcss` under `dependencies` or `devDependencies`.
- Any `*.css` file under the target contains `@import "tailwindcss"` or `@tailwind`.

Detection only pre-selects — the user always confirms the CSS framework choice.
