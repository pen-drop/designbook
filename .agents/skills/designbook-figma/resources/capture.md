---
name: figma-capture
description: Assemble a source capture using the integration's observed-data instructions.
---

Use the **`extract-reference` skill** for capture intake.
Every intake's first command is `intake <id>`.
This integration's rules match `observe-figma` when extension `figma`
is configured. Execution uses the catalogue `observe-figma` block. Shared
intake owns scope, paths and completion. The
[capture-observations rule](../rules/capture-observations.md) owns
unavailable Figma capability, native locators, and revision null.
