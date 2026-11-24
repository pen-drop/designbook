---
trigger:
  steps: [find-target]
filter:
  backend: wordpress
---

# Find Theme

How the install target is located in a WordPress project: scan for a theme, choose among
candidates, or scaffold a new one. The chosen theme directory becomes `target_dir`; its
slug becomes `namespace`.

## Scan

Glob `<root>/wp-content/themes/*/style.css`. Keep entries whose `style.css` header carries a
`Theme Name:` line. Collect `{ slug (directory name), name (Theme Name), path }`.

## Choose

- Exactly one result → use it.
- Several → list them (`name` + slug) and ask the user to pick one.
- None → ask the user whether to scaffold a new theme:
  - On yes, ask for a human-readable name. Derive the slug: lowercase, replace spaces and
    hyphens with underscores, strip every remaining character outside `[a-z0-9_]`, and
    prefix `theme_` when the result does not start with a letter.
  - When `<root>/wp-content/themes/<slug>` already exists, ask the user before writing into
    it. Then create `<root>/wp-content/themes/<slug>/style.css` with the header
    `Theme Name: <Human Name>` and `Text Domain: <slug>`.
  - On no → abort: "designbook needs a theme directory to install into."

## Contribute

- `target_dir` → the chosen theme directory.
- `namespace` → the theme slug (the Twig namespace of its components).
