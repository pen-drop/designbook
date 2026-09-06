---
name: design-entity-intake
description: Domain decisions for creating or changing the selected entity artifacts.
---

# Entity intake

Select entity type, bundle and exactly one view-mode or form-mode identity. Inspect its current mapping, data model, selected mode's template/display settings, sample pool, component inventory and standalone preview. Include neighboring view/form modes and bundles in the preservation baseline.

Record the requested field-output delta, concrete acceptance criteria and preserved content. A clear text request is sufficient; a visual reference is optional. Reuse a component that already satisfies the mapping. Reuse a sufficient sample pool; declare only necessary record/field changes, retaining existing IDs and section tags. Limit mapping/model/display edits to the selected mode and preserve unrelated configuration and data. Use the existing standalone preview convention, with its exact story URL and mapped-field observations. Declare every affected consumer and required prerequisite before planning.

Use the request and existing artifacts with the effective catalogue from the [shared builder](../../../resources/workflow-building.md). For reference handling, preserved inputs, fixed dependencies and build/browser evidence, follow the [write planning contract](../../../design/resources/write-planning.md).

Completion: all identities, requested deltas, preserved content, acceptance criteria, consumer targets, outputs, dependencies and applicable rules are fixed in definition inputs and task parameters. Clarify unresolved identity or scope before saving a runnable definition.

Follow the [shared builder](../../../resources/workflow-building.md), then invoke [execute-workflow](../../execute-workflow/SKILL.md) with the saved document path automatically.
