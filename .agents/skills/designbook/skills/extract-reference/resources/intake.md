---
name: extract-reference-intake
description: Assemble a fixed source-specific observation workflow and consume its completed revision.
---

# Capture the selected scope

1. Discover the installed source integration using its declared source support and
   configured extension. Load that integration's capture resource and effective
   task catalogue. Select an unambiguous match; clarify competing matches or
   unavailable tools. Website and Figma identities remain separate references.
2. Explore enough to identify source kind, stable identity and source revision
   (explicit null when unavailable). Fix the requested subjects, native locators,
   views, dimensions and states. A view has a breakpoint only when that mapping
   is explicitly established. Present the selected scope and evidence to the user
   through the [intake contract](../../../design/resources/write-planning.md).
   Resolve required missing observations before publishing a usable revision.
3. Follow the [shared builder](../../../resources/workflow-building.md) with the
   capture template. Add the definition's `capture` descriptor from `workflow schema`:
   source, role (`reference` or `actual`) and exact scope cells. Resolve the
   CLI-owned location with `workflow capture-location --source-kind <kind> --source-identity <identity>
   --workflow-id <id>` before finalizing output paths. Every file output lies inside
   the returned directory. Declare PNG screenshots and PNG image assets as `capture-image` direct outputs
   with the shared image validator. Declare fonts and other binary assets, including
   SVG and JPEG images, as `capture-file` direct outputs under their real format
   extensions. File completion supplies validated evidence; screenshot and asset
   associations remain distinct in the extract. Each selected integration contributes its applicable source tasks and
   concrete file outputs. The final `publish-capture` task depends on every
   source task and consumes their structured results through predecessor bindings.
4. Save and invoke `execute-workflow <path>`. Complete tasks through ordinary
   `workflow done` and its declared output contracts. The shared writer writes
   one metadata and extract pair for the entire revision. Capture files use the
   declared direct-file outputs. The definition stays fixed; extra scope requires
   a new capture workflow.
5. Use the completed publication binding to plan the design. Partial capture
   directories are not usable references. A refresh creates a new revision;
   earlier plans keep their original revision. Record planned component structure,
   styling and behavior in the design plan, separately from captured observations.

Storybook capture uses the same schema with role `actual`. Establish explicit
source-to-story subject/view/state correspondences for verification; native node
IDs need not match. Missing stories and error pages are failed evidence, not
valid captures of the intended subject.
