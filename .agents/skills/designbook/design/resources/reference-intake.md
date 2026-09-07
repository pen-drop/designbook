---
name: reference-intake
description: Consume a completed observation revision before fixing the design inventory.
---

# Prepare the design reference during intake

1. Select the source integration and complete the
   [capture workflow intake](../../skills/capture-reference/resources/intake.md).
   Reuse an already completed revision only when its selected scope supports the
   request. A refresh uses a new fixed capture workflow and revision.
2. Inspect bounded observations and the associated images from that completed
   revision. Confirm every source locator identifies the intended subject and
   state, not merely an existing node. Establish explicit correspondences with
   planned implementation selectors and views. Clarify required missing evidence.
3. The design planner now decides component decomposition, target structure,
   concrete styling, assets and behavior. Store these decisions in task work orders
   and context; the immutable extract contains only observed facts. Use
   [reference packages](reference-packages.md) for typed read-only bindings.
4. Present the selected source locators, implementation selectors, views, states
   and evidence through [write planning](write-planning.md). Save the exact
   completed revision binding with the design definition. If an `extract-reference`
   dependency task is needed, it returns only `reference_dir`; it has no reference
   file write outputs. Design execution never resubmits the captured metadata,
   extract or binary files.

A deliberately reference-free request records its limitation explicitly and uses
concrete build/browser criteria. A requested visual comparison requires valid
reference evidence.
