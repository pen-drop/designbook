---
name: theme
description: Find the target custom theme or scaffold a new one; derive the component namespace.
---

# Theme — find or scaffold

1. Glob `DOCROOT/themes/custom/*/*.info.yml`. Keep only files named exactly
   `<dirname>.info.yml` where `<dirname>` is the parent directory name (the stem
   is the filename with the full `.info.yml` suffix stripped). Parse each as
   YAML; skip entries with
   `hidden: true` or a `type` other than `theme` (a missing `type` counts as
   `theme` for legacy info files). Collect `{ machine_name (stem), name, path }`.
2. Decide:
   - Exactly one result → use it.
   - Several → list them (`name` + machine name) and ask the user to pick one.
   - None → ask the user whether to scaffold a new theme. On yes, ask for a
     human-readable name, derive the machine name: lowercase, replace spaces and
     hyphens with underscores, strip every remaining character outside
     `[a-z0-9_]`, and prefix `theme_` when the result does not start with a
     letter, and create
     `DOCROOT/themes/custom/<machine_name>/<machine_name>.info.yml`:

     ```yaml
     name: <Human Name>
     type: theme
     core_version_requirement: ^10 || ^11
     base theme: false
     ```

     On no → abort with: "designbook needs a theme directory to install into."
3. Record:
   - `THEME_DIR` — the theme directory
   - `NAMESPACE` — the theme machine name (used as SDC/component namespace)
