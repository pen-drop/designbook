---
name: design-component-intake
description: Domain decisions for creating or changing the selected component artifacts.
trigger:
  steps: [design-component:intake]
---

# Component intake

Select the exact component ID and artifact paths from the request and current inventory. Inventory existing variants, props, slots, all stories (including non-default filenames), scripts and library wiring. Record the requested delta, concrete acceptance criteria, and everything to preserve. A clear text request supplies the change reference; a new visual reference is optional.

Inspect usages in components, scenes and entity/form mappings. Distinguish consumers requiring edits from those requiring verification only. Declare every affected story path, prop/slot rename consumer, prerequisite component and asset as a concrete target/output. Preserve sufficient existing components. For consumer scene writes, select the actual scene identity and `scene_scope`; carry its screen or shell constraints into that task even though this intake is design-component.

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes.
