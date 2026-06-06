---
trigger:
  steps: [find-target]
result:
  type: object
  required: [target_dir, namespace]
  properties:
    target_dir:
      $ref: ../schemas.yml#/TargetDir
    namespace:
      $ref: ../schemas.yml#/Namespace
---

# Find Target

Determine where designbook will be installed and the component namespace it uses.
The backend's rules for this step define how the target is located within the
project root — which directories to scan, how to choose between candidates, and when
to offer scaffolding a new one.

## Result: target_dir

The directory that will receive designbook's config, Storybook setup, and component
sources. When the backend's rules find exactly one candidate, use it; when several,
ask the user to pick one; when none, follow the rule's scaffolding offer. Abort if no
target can be established.

## Result: namespace

The component namespace derived from the chosen target by the backend's rules (e.g. a
theme machine name). Used for SDC/Storybook story resolution and written into the
config.
