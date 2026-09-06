---
type: blueprint
name: sample-records
trigger:
  steps: [create-sample-data]
---

# Sample Records

For a new pool, use these starting counts when intake has no more specific needs: six for a non-full listing/teaser/card mode, three for full layout-builder/canvas, and one for other full modes or config entities. Intake fixes the actual records and counts from the scene's selectors; a sufficient existing pool takes precedence.

Choose field values from the model's explicit sample template and settings, then the matching field-type guidance, then realistic scalar text. Content reference fields hold target IDs as strings (arrays for multiple values). Config listing rows can hold entity descriptors with their type, bundle, view mode and selection predicate. Resolve every reference against the selected sample pools.
