---
name: tokens-intake
description: Domain decisions required before planning tokens artifacts.
---

# tokens intake

When the request names a reference or a published revision already exists, reuse
that revision. Fix its subjects, views and states, then use the `tokens` package
through [reference queries](../../../design/resources/reference-packages.md).
Populate the task's `extract` with the bounded `DesignReference` observations
returned by the query and `reference_dir` with the selected revision directory.
Keep the prepared request and fingerprint with the plan. A supplied reference
with missing observations blocks token planning; it is not a no-reference case.
Only when a new capture is needed, use the standalone
[extract-reference intake](../../extract-reference/resources/intake.md).

Derive the palette, typography and scales from those observations. Semantic names
and grouping are planning decisions; distinguish them from measured values.
Inspect existing tokens, identify the output and whether CSS generation is
required, and resolve missing required values before sealing the plan.
For an explicitly reference-free request, record the agreed palette, fonts and
scales as concrete task parameters instead.

Use the request, existing project artifacts, and the saved intake context as input. Ask only questions not answered by those inputs.

Completion: every target, structural parameter, dependency and applicable rule is determined. Record the complete decisions as concrete task parameters in the plan; intake itself creates no run task or progress entry.

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes. Default mode for this simple foundation flow is `ephemeral` (caller override wins).
