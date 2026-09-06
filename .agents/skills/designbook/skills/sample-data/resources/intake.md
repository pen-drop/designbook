---
name: sample-data-intake
description: Domain decisions required before planning sample-data artifacts.
---

# sample-data intake

Read the data model and section scope. Enumerate all entity/bundle targets, sample counts, stable identifiers, cross-entity references and section tags. Resolve required media inputs before planning one concrete task per selected target.

Use the request and existing project artifacts as input. Load the effective planning catalogue using the [shared builder](../../../resources/workflow-building.md) before deciding framework/backend-specific constraints. Ask only questions not answered by those inputs.

Completion: every target, structural parameter, dependency and applicable rule is determined. Record the complete decisions as definition inputs and concrete task parameters; intake itself creates no run task or progress entry.

Follow the [shared builder](../../../resources/workflow-building.md), then invoke [execute-workflow](../../execute-workflow/SKILL.md) with the saved document path automatically.
