---
trigger:
  steps: [find-target]
filter:
  backend: drupal
---

# Find Theme

How the install target is located in a Drupal project: scan for a custom theme,
choose among candidates, or scaffold a new one. The chosen theme directory becomes
`target_dir`; its machine name becomes `namespace`.

## Scan

Glob `<root>/themes/custom/*/*.info.yml`. Keep only files named exactly
`<dirname>.info.yml`, where `<dirname>` is the parent directory name (the machine name
is the filename with the full `.info.yml` suffix stripped). Parse each as YAML; skip
entries with `hidden: true` or a `type` other than `theme` (a missing `type` counts as
`theme` for legacy info files). Collect `{ machine_name, name, path }`.

## Choose

- Exactly one result → use it.
- Several → list them (`name` + machine name) and ask the user to pick one.
- None → ask the user whether to scaffold a new theme:
  - On yes, ask for a human-readable name. Derive the machine name: lowercase, replace
    spaces and hyphens with underscores, strip every remaining character outside
    `[a-z0-9_]`, and prefix `theme_` when the result does not start with a letter.
  - When `<root>/themes/custom/<machine_name>` already exists, ask the user before
    writing into it. Then create
    `<root>/themes/custom/<machine_name>/<machine_name>.info.yml`:

    ```yaml
    name: <Human Name>
    type: theme
    core_version_requirement: ^10 || ^11
    base theme: false
    ```
  - On no → abort: "designbook needs a theme directory to install into."

## Contribute

- `target_dir` → the chosen theme directory.
- `namespace` → the theme machine name (used as the SDC/component namespace).
