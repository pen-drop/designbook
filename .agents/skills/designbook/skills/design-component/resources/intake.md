---
name: design-component-intake
description: Domain decisions required before planning design-component artifacts.
---

# design-component intake

Inspect the supplied design reference and current component inventory. Decide component ID, variants, props, slots, assets and every prerequisite component. Record reference measurements and responsive behavior. Enumerate exact component targets and output paths before planning.

Use the request and existing project artifacts as input. Load the effective planning catalogue using the [shared builder](../../../resources/workflow-building.md) before deciding framework/backend-specific constraints. Ask only questions not answered by those inputs.

Completion: every target, structural parameter, dependency and applicable rule is determined. Record the complete decisions as definition inputs and concrete task parameters; intake itself creates no run task or progress entry.

Follow the [shared builder](../../../resources/workflow-building.md), then invoke [execute-workflow](../../execute-workflow/SKILL.md) with the saved document path automatically.
