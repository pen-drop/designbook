---
name: import-intake
description: Domain decisions required before planning import artifacts.
---

# import intake

When the request depends on a visual source, follow the shared
[reference intake](../../../design/resources/reference-intake.md) before deriving
artifact decisions from that source.

Inspect the bound revision across the requested scope. Enumerate the product vision, tokens, entities/bundles, sections, shell, components and scenes in scope. Resolve ordering and prerequisites. Build a complete combined workflow or fully plan each subsequent workflow before starting it; complete structural reference analysis here.

Use the request, existing project artifacts, and the saved intake context as input. Ask only questions not answered by those inputs.

Completion: every target, structural parameter, dependency and applicable rule is determined. Record the complete decisions as concrete task parameters in the plan; intake itself creates no run task or progress entry.

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes (`ephemeral` | `persist` | `ask`); caller override wins.
