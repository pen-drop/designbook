---
name: design-verify-intake
description: Domain decisions required before planning design-verify artifacts.
trigger:
  steps: [design-verify:intake]
---

# design-verify intake

Identify the exact Storybook story, bound reference revision, selected views/states
and comparison criteria. After the shared builder's source reference prerequisite
passes, use the **`extract-reference` skill** with source `storybook` and role
`actual`. Bind both completed revisions and explicit source-to-actual
subject/view/state correspondences; native locators may differ. Decide CSS
regeneration and prerequisites before planning comparison tasks. The check
produces the complete issue list for the verification handoff.

Use the request, existing project artifacts, and the saved intake context as input. Ask only questions not answered by those inputs.

Completion: every target, structural parameter, dependency and applicable rule is determined. Record the complete decisions as concrete task parameters in the plan; intake itself creates no run task or progress entry.

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes (`ephemeral` | `persist` | `ask`); caller override wins.

After the verify plan has been executed, write the deterministic score to a file with
`_debo verify score --result <compare-result.json> --output $DESIGNBOOK_DATA/verify-score.json`
(severity sum over the issues; 0 = perfect), then follow
[verification handoff](../../../resources/verification-handoff.md) with its complete
issue list. The score file is the run's machine-readable result.
