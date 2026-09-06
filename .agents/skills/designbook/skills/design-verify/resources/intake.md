---
name: design-verify-intake
description: Domain decisions required before planning design-verify artifacts.
---

# design-verify intake

Identify exact Storybook story, reference, viewport/breakpoints and comparison criteria. Inspect the reference and resolve all capture paths. Decide CSS regeneration and baseline setup before planning the capture/comparison tasks. The check produces the complete issue list; use the verification handoff after completion.

Use the request and existing project artifacts as input. Load the effective planning catalogue using the [shared builder](../../../resources/workflow-building.md) before deciding framework/backend-specific constraints. Ask only questions not answered by those inputs.

Completion: every target, structural parameter, dependency and applicable rule is determined. Record the complete decisions as definition inputs and concrete task parameters; intake itself creates no run task or progress entry.

Follow the [shared builder](../../../resources/workflow-building.md), then invoke [execute-workflow](../../execute-workflow/SKILL.md) with the saved document path automatically.

After that check completes, follow [verification handoff](../../../resources/verification-handoff.md) with its complete issue list.
