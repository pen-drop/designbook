---
name: sync-verify-intake
description: Domain decisions required before planning sync-verify artifacts.
---

# sync-verify intake

Identify the story and kind (config, entity mapping or scene), live backend URL, access requirements and capture viewports. Resolve the matching Storybook render and comparison scope. Plan the complete check with its output paths; use the verification handoff after completion.

Use the request and existing project artifacts as input. Load the effective planning catalogue using the [shared builder](../../../resources/workflow-building.md) before deciding framework/backend-specific constraints. Ask only questions not answered by those inputs.

Completion: every target, structural parameter, dependency and applicable rule is determined. Record the complete decisions as definition inputs and concrete task parameters; intake itself creates no run task or progress entry.

Follow the [shared builder](../../../resources/workflow-building.md), then invoke [execute-workflow](../../execute-workflow/SKILL.md) with the saved document path automatically.

After that check completes, follow [verification handoff](../../../resources/verification-handoff.md) with its complete issue list.
