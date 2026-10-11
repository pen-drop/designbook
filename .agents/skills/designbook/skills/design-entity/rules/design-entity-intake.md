---
name: design-entity-intake
description: Domain decisions for creating or changing the selected entity artifacts.
trigger:
  steps: [design-entity:intake]
---

# Entity intake

For a supplied design reference, inspect the bound revision’s observations before selecting the structure below. Text-only requests use their concrete acceptance criteria and retained artifacts.

Select entity type, bundle and exactly one view-mode or form-mode identity. Inspect its current mapping, data model, selected mode's template/display settings, sample pool, component inventory and standalone preview. Include neighboring view/form modes and bundles in the preservation baseline.

Record the requested field-output delta, concrete acceptance criteria and preserved content. A clear text request is sufficient; a visual reference is optional. Reuse a component that already satisfies the mapping. Reuse a sufficient sample pool; declare only necessary record/field changes, retaining existing IDs and section tags. Limit mapping/model/display edits to the selected mode and preserve unrelated configuration and data. Use the existing standalone preview convention, with its exact story URL and mapped-field observations. Declare every affected consumer and required prerequisite before planning.

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes.

If a prerequisite below is missing, leave the plan unsealed and return this
handoff with the matching skill and reason. The prerequisite skill runs separately.

| Missing prerequisite | Skill | Reason |
|---|---|---|
| Required typography tokens | `tokens` | missing typography tokens |
| `@font-face` coverage for a required family; a token name is not coverage | `css-generate` | missing font face |
| A `config.image_style` bundle required by the mapping's ImageNode | `data-model` | missing config.image_style bundle required by image-fields |

```yaml
kind: PrerequisiteNeed
workflow: design-entity
need:
  workflow: <skill from table>
  reason: <reason from table>
```
