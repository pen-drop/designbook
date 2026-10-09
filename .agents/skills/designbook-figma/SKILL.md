---
name: designbook-figma
user-invocable: false
description: >
  Capture selected Figma file nodes, frames, assets and visual evidence
  through host Figma tools. Use when extract-reference observes a Figma
  source, including when those tools are missing.
---

Supports source kind `figma` through extension `figma`. After
`intake extract-reference` has matched this
integration, load
[capture instructions](resources/capture.md) for source exploration and output
translation. The [capture task](tasks/observe-figma.md) contributes observations to the
[shared capture workflow](../designbook/skills/extract-reference/SKILL.md).
The [capture-observations rule](rules/capture-observations.md) owns unavailable
capability, native locators, and revision null.
