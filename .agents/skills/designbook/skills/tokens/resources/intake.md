---
name: tokens-intake
description: Domain decisions required before planning tokens artifacts.
---

# tokens intake

For an external reference, invoke the standalone [extract-reference workflow intake](../../extract-reference/resources/intake.md) and bind its completed revision before planning token writes. Inspect its bounded token observations and existing tokens. Decide the palette, semantic roles, typography, font sources, scales and spacing. Identify every token file and whether CSS generation is required. Complete color and typography choices before planning.

Use the request, existing project artifacts, and the saved intake context as input. Ask only questions not answered by those inputs.

Completion: every target, structural parameter, dependency and applicable rule is determined. Record the complete decisions as concrete task parameters in the plan; intake itself creates no run task or progress entry.

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes. Default mode for this simple foundation flow is `ephemeral` (caller override wins).
