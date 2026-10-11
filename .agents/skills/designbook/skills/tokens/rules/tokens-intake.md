---
name: tokens-intake
description: Domain decisions required before planning tokens artifacts.
trigger:
  steps: [tokens:intake]
---

# tokens intake

For reference-derived tokens, reuse the bound published revision. Fix its subjects, views and states, then use the `tokens` package
through [reference queries](../../../design/resources/reference-packages.md).
Populate the task's `extract` with the bounded `DesignReference` observations
returned by the query and `reference_dir` with the selected revision directory.
Keep the prepared request and fingerprint with the plan.

Derive the palette, typography and scales from those observations. Semantic names
and grouping are planning decisions; distinguish them from measured values.
Inspect existing tokens, identify the output and whether CSS generation is
required, and resolve missing required values before sealing the plan.
For an explicitly reference-free request, record the agreed palette, fonts and
scales as concrete task parameters instead.

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes.
