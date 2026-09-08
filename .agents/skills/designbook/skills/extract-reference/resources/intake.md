---
name: extract-reference-intake
description: Domain decisions for a fixed source observation workflow.
---

# Capture the selected scope

Select one source from the saved discover catalogue. Website and Storybook
blocks are always present; a missing Figma block means that source is not
configured. Competing sources remain separate references.

Fix source kind, identity, revision (explicit null when unavailable), subjects,
native locators, views, states and role (`reference` or `actual`) from the
request. A view has a breakpoint only when that mapping is explicitly
established. Present the selected scope through the
[intake contract](../../../design/resources/write-planning.md).
Resolve output paths with `workflow capture-location --source-kind <kind>
--source-identity <identity> --workflow-id <id>` before authoring file tasks.

Follow the [shared builder](../../../resources/workflow-building.md), then
invoke [execute-workflow](../../execute-workflow/SKILL.md) with the saved
document path.
