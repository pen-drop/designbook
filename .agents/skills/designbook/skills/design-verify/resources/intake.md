---
name: design-verify-intake
description: Domain decisions required before planning design-verify artifacts.
---

# design-verify intake

Identify the exact Storybook story, completed reference revision, selected views/states and comparison criteria. Follow the [shared capture intake](../../extract-reference/resources/intake.md) with the Storybook source skill and role `actual` to produce actual structure, observations and screenshots through the same schema. Fix explicit source-to-actual subject/view/state correspondences; node IDs and native locators may differ. Bind both completed revisions for comparison. Decide CSS regeneration and prerequisites before planning the capture/comparison tasks. The check produces the complete issue list; use the verification handoff after completion.

Use the request, existing project artifacts, and the saved intake context as input. Ask only questions not answered by those inputs.

Completion: every target, structural parameter, dependency and applicable rule is determined. Record the complete decisions as concrete task parameters in the plan; intake itself creates no run task or progress entry.

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes (`ephemeral` | `persist` | `ask`); caller override wins.

After the verify plan has been executed, write the deterministic score to a file with
`_debo verify score --result <compare-result.json> --output $DESIGNBOOK_DATA/verify-score.json`
(severity sum over the issues; 0 = perfect), then follow
[verification handoff](../../../resources/verification-handoff.md) with its complete
issue list. The score file is the run's machine-readable result.
