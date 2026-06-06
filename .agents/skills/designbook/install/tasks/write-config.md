---
trigger:
  steps: [write-config]
params:
  type: object
  required: [target_dir, css_framework]
  properties:
    target_dir:
      $ref: ../schemas.yml#/TargetDir
    namespace:
      $ref: ../schemas.yml#/Namespace
    css_framework:
      type: string
      description: CSS framework to record in the config. Ask the user to choose; the choices are the installed designbook-css-* skills plus plain CSS (`css`). The CSS-framework detection rules pre-select the default; the user always confirms.
      examples: [css, tailwind]
result:
  type: object
  required: [config]
  properties:
    config:
      path: "{{ target_dir }}/designbook.config.yml"
      $ref: ../schemas.yml#/DesignbookConfig
---

# Write Config

Produce the designbook configuration file in the install target. The backend's
install blueprint supplies the concrete YAML shape (run command, directory layout,
extensions); the CSS-framework rules may extend it.

## Result: config

Record the detected backend, the chosen component framework, the `css_framework`
selection, the component namespace, and the active integration extensions. The config
must not already exist — the workflow preconditions stop when one is found, so never
overwrite an existing config without explicit user confirmation.
