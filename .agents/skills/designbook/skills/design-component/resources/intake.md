---
name: design-component-intake
description: Domain decisions for creating or changing the selected component artifacts.
---

# Component intake

Select the exact component ID and artifact paths from the request and current inventory. Inventory existing variants, props, slots, all stories (including non-default filenames), scripts and library wiring. Record the requested delta, concrete acceptance criteria, and everything to preserve. A clear text request supplies the change reference; a new visual reference is optional.

Inspect usages in components, scenes and entity/form mappings. Distinguish consumers requiring edits from those requiring verification only. Declare every affected story path, prop/slot rename consumer, prerequisite component and asset as a concrete target/output. Preserve sufficient existing components. For consumer scene writes, select the actual scene identity and `scene_scope`; carry its screen or shell constraints into that task even though this intake is design-component.

Use the request and existing artifacts with the effective catalogue from the [shared builder](../../../resources/workflow-building.md). For reference handling, preserved inputs, fixed dependencies and build/browser evidence, follow the [write planning contract](../../../design/resources/write-planning.md).

Completion: all identities, requested deltas, preserved content, acceptance criteria, consumer targets, outputs, dependencies and applicable rules are fixed in definition inputs and task parameters. Clarify unresolved identity or scope before saving a runnable definition.

Follow the [shared builder](../../../resources/workflow-building.md), then invoke [execute-workflow](../../execute-workflow/SKILL.md) with the saved document path automatically.
