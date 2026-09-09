---
name: extract-reference-intake
description: Domain decisions for a fixed source observation workflow.
---

# Capture the selected scope

Select one source from the saved discover catalogue. Website and Storybook
blocks are always present; a missing Figma block means that source is not
configured. Competing sources remain separate references.

Fix source kind, identity, revision (explicit null when unavailable), subjects,
native locators, views, states, the session each state is observed as, and role
(`reference` or `actual`) from the request. A view has a breakpoint only when
that mapping is explicitly established. A state name identifies one page load
across the whole revision, so it carries one session and gets one dump; a
subject seen both signed out and signed in is two states, not one. Present the
selected scope through the
[intake contract](../../../design/resources/write-planning.md).

Order the resolution steps so each one has what it needs:

1. Author the prelude module in the project repository when the source needs
   preparing before it can be observed, and take its `{ path, digest }` from
   `_debo reference prelude --path <file>`.
2. Assemble the capture block — role, source, that `prelude` pair, and the fixed
   scope with a session on every cell.
3. Resolve output paths with `_debo workflow capture-location --capture
   <capture.json> --workflow-id <id>`, then author the file tasks. The revision
   digest covers the scope and the prelude, so both are fixed before this call;
   changing either afterwards addresses a different revision.
4. Read the source catalogue from `_debo reference save --reference
   <revision-dir> --url <source-identity> --state <name> --session <name>`
   stdout, once per declared state.
5. Confirm every selected locator against the saved dump with `_debo reference
   inspect --reference <revision-dir> --state <name> --locator <css>`.

Follow the [shared builder](../../../resources/workflow-building.md), then
invoke [execute-workflow](../../execute-workflow/SKILL.md) with the saved
document path.
