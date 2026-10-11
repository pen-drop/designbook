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
`actual`, or reuse a published actual capture when it still matches the current
implementation and requested scope. Follow the capture skill's role-specific
closeout. Bind the approved source reference and validated actual revision with
explicit source-to-actual
subject/view/state correspondences; native locators may differ. Decide CSS
regeneration and prerequisites before planning comparison tasks. The check
produces the complete issue list for the verification handoff.

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes.

After the verify plan has been executed, write the deterministic score to a file with
`_debo verify score --result <compare-result.json> --output $DESIGNBOOK_DATA/verify-score.json`
(severity sum over the issues; 0 = perfect), then follow
[verification handoff](../../../resources/verification-handoff.md) with its complete
issue list. The score file is the run's machine-readable result.
