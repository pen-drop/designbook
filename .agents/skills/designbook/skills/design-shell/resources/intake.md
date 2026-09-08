---
name: design-shell-intake
description: Domain decisions for creating or changing the selected shell artifacts.
---

# Shell intake

For a supplied design reference, first follow [reference intake](../../../design/resources/reference-intake.md): load the effective extraction instructions and complete analysis before selecting the structure below. Text-only requests use their concrete acceptance criteria and retained artifacts.

Select the canonical `design-system:shell` target in `design-system/design-system.scenes.yml`, preserving its file identity and the existing scene named `shell`. Inspect the page/header/footer composition, navigation labels and destinations, slots, scripting, responsive behavior and every consuming screen.

Record the requested delta, concrete desktop/mobile acceptance criteria, preserved structure and affected consumers. A clear text request is sufficient; a new visual reference is optional. Set `scene_scope: shell`; preserve exactly one content injection point and plan verification of consuming screens with their route-bearing content intact. Enumerate all required component/story/consumer edits. Reuse the existing file; include `create-scene-file` only when it is absent, with canonical shell metadata.

Use the request, existing artifacts, and the saved discover catalogue as input. For reference handling, preserved inputs, fixed dependencies and build/browser evidence, follow the [write planning contract](../../../design/resources/write-planning.md).

Completion: all identities, requested deltas, preserved content, acceptance criteria, consumer targets, outputs, dependencies and applicable rules are fixed in definition inputs and task parameters. Clarify unresolved identity or scope before saving a runnable definition.

Follow the [shared builder](../../../resources/workflow-building.md), then invoke [execute-workflow](../../execute-workflow/SKILL.md) with the saved document path automatically.
