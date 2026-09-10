---
name: design-screen-intake
description: Domain decisions for creating or changing the selected screen artifacts.
---

# Screen intake

For a supplied design reference, first follow [reference intake](../../../design/resources/reference-intake.md): load the effective extraction instructions and complete analysis before selecting the structure below. Text-only requests use their concrete acceptance criteria and retained artifacts.

Select one exact SceneFile path and SceneDef.name within a section. Keep file ID, scene name and Storybook URL distinct. Inspect the complete file, sibling scenes, metadata, shell inheritance, route-bearing main content, mappings, sample records and component usages. Resolve multiple matches or conflicting selectors before planning.

Record the requested delta, preserved siblings/order/metadata and unrelated selected-scene fields, concrete acceptance criteria and affected consumers. A clear text request is sufficient; a visual reference is optional. Identify exactly one route-bearing Entity or View, all supplementary blocks and their sample selectors. Set `scene_scope: screen`. Reuse sufficient components, mappings and sample pools; enumerate only necessary edits. Include `create-scene-file` only for an absent file. Repeating an identical request selects the same scene, preserving a single entry.

Use the request, existing artifacts, and the saved intake context as input. For reference handling, preserved inputs, fixed dependencies and build/browser evidence, follow the [write planning contract](../../../design/resources/write-planning.md).

Completion: all identities, requested deltas, preserved content, acceptance criteria, consumer targets, outputs, dependencies and applicable rules are fixed in the plan's task parameters. Clarify unresolved identity or scope before saving a runnable plan.

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes (caller override wins):

- **create / rebuild** → default `ask`
- **change** of an existing named target → may `ephemeral`; blockade when the work would add undeclared targets/tasks or widen scope

When the plan depends on a published revision, complete the [reference intake](../../../design/resources/reference-intake.md) approval gate (`reference approval-check`) before `plan build`. A missing or unapproved revision is a `ReferenceNeed` blockade — stop; start `extract-reference` separately when capture is required.
