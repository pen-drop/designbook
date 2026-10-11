---
name: design-shell-intake
description: Domain decisions for creating or changing the selected shell artifacts.
trigger:
  steps: [design-shell:intake]
---

# Shell intake

For a supplied design reference, inspect the bound revision’s observations before selecting the structure below. Text-only requests use their concrete acceptance criteria and retained artifacts.

Select the canonical `design-system:shell` target in `design-system/design-system.scenes.yml`, preserving its file identity and the existing scene named `shell`. Inspect the page/header/footer composition, navigation labels and destinations, slots, scripting, responsive behavior and every consuming screen.

Record the requested delta, concrete desktop/mobile acceptance criteria, preserved structure and affected consumers. A clear text request is sufficient; a new visual reference is optional. Set `scene_scope: shell`; preserve exactly one content injection point and plan verification of consuming screens with their route-bearing content intact. Enumerate all required component/story/consumer edits. Reuse the existing file; include `create-scene-file` only when it is absent, with canonical shell metadata.

For reference handling, preserved inputs, fixed dependencies and build/browser evidence, follow the [write planning contract](../../../design/resources/write-planning.md).

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes.
