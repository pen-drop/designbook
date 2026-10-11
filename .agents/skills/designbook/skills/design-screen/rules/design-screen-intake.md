---
name: design-screen-intake
description: Domain decisions for creating or changing the selected screen artifacts.
trigger:
  steps: [design-screen:intake]
---

# Screen intake

For a supplied design reference, inspect the bound revision’s observations before selecting the structure below. Text-only requests use their concrete acceptance criteria and retained artifacts.

Select one exact SceneFile path and SceneDef.name within a section. Keep file ID, scene name and Storybook URL distinct. Inspect the complete file, sibling scenes, metadata, shell inheritance, route-bearing main content, mappings, sample records and component usages. Resolve multiple matches or conflicting selectors before planning.

Record the requested delta, preserved siblings/order/metadata and unrelated selected-scene fields, concrete acceptance criteria and affected consumers. A clear text request is sufficient; a visual reference is optional. Identify exactly one route-bearing Entity or View, all supplementary blocks and their sample selectors. Set `scene_scope: screen`. Reuse sufficient components, mappings and sample pools; enumerate only necessary edits. Include `create-scene-file` only for an absent file. Repeating an identical request selects the same scene, preserving a single entry.

For reference handling, preserved inputs, fixed dependencies and build/browser evidence, follow the [write planning contract](../../../design/resources/write-planning.md).

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes.
