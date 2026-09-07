---
name: design-verify-intake
description: Domain decisions required before planning design-verify artifacts.
---

# design-verify intake

Identify the exact Storybook story, completed reference revision, selected views/states and comparison criteria. Follow the [shared capture intake](../../extract-reference/resources/intake.md) with the Storybook source skill and role `actual` to produce actual structure, observations and screenshots through the same schema. Fix explicit source-to-actual subject/view/state correspondences; node IDs and native locators may differ. Bind both completed revisions for comparison. Decide CSS regeneration and prerequisites before planning the capture/comparison tasks. The check produces the complete issue list; use the verification handoff after completion.

Use the request and existing project artifacts as input. Load the effective planning catalogue using the [shared builder](../../../resources/workflow-building.md) before deciding framework/backend-specific constraints. Ask only questions not answered by those inputs.

Completion: every target, structural parameter, dependency and applicable rule is determined. Record the complete decisions as definition inputs and concrete task parameters; intake itself creates no run task or progress entry.

Follow the [shared builder](../../../resources/workflow-building.md), then invoke [execute-workflow](../../execute-workflow/SKILL.md) with the saved document path automatically.

After that check completes, follow [verification handoff](../../../resources/verification-handoff.md) with its complete issue list.
