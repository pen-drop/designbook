---
title: "Setup Storybook"
trigger:
  steps: [setup-storybook]
params:
  type: object
  required: [target_dir]
  properties:
    target_dir:
      $ref: ../schemas.yml#/TargetDir
    namespace:
      $ref: ../schemas.yml#/Namespace
result:
  type: object
  required: [storybook]
  properties:
    storybook:
      $ref: ../schemas.yml#/StorybookSetup
---

# Setup Storybook

Produce a working Storybook configuration in the install target, including a manifest
that declares the required dependencies. The concrete files, dependency versions,
package-manager choice, and the fresh-vs-extend handling come from the backend's
install blueprint and the active CSS-framework rules.

## Result: storybook

Report whether Storybook was set up fresh or an existing instance was extended, and
which config entry point was written or updated. When extending, touch only what the
blueprint requires (addon registrations, story globs, missing dependencies) and leave
every other setting untouched.
