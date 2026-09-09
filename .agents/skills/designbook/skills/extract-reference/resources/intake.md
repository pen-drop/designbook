---
name: extract-reference-intake
description: Domain decisions for a fixed source observation workflow.
---

# Capture the selected scope

Select one source from the saved intake context. Website and Storybook
blocks are always present; a missing Figma block means that source is not
configured. Competing sources remain separate references.

Select source kind, identity, revision (explicit null when unavailable), subjects,
candidate native locators, views, states, the session each state is observed as, and role
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
2. Assemble a draft capture block — role, source, optional `prelude` pair, and
   the selected scope with candidate locators and a session on every cell.
3. Resolve its directory with `_debo workflow capture-location --capture
   <capture.json> --workflow-id <id>`. The revision digest covers the scope and
   the prelude; changing either requires resolving the directory again.
4. Read the source catalogue from `_debo reference save --reference
   <revision-dir> --url <source-identity> --state <name> --session <name>`
   stdout, once per declared state. Pass the prelude and state steps required
   by the selected source's observation rule so each dump shows that state.
5. Confirm every selected locator against the saved dump with `_debo reference
   inspect --reference <revision-dir> --state <name> --locator <css>` in every
   state selected for its subject. Completion: every response has
   `subject.found: true` and identifies the intended subject. If a locator
   changes, update the draft and repeat steps 3–5, saving the declared states
   into the newly resolved directory. An unresolved or ambiguous subject blocks
   finalizing the plan.
6. Author the MD plan with the observe, capture-file/capture-image and
   publish-capture steps, their outputs in the resolved revision directory.
   Carry the confirmed capture block as the publish-capture task's params, and
   embed `Reference`, `DesignReference` and their transitive definitions in the
   plan's `## Schemas`: later design workflows derive the published revision's
   query contract from the publication. Follow the
   [shared builder](../../../resources/workflow-building.md) to write and seal
   the plan. The publish-capture step runs `_debo reference publish --capture
   <capture.json> --workflow-id <id> --owner <plan-path> --contract
   <contract.json>` (contract = `{ referenceSchema: <Reference>, definitions }`)
   to validate the observations and write the self-contained binding, then
   records that result with `plan done`. Completion: the sealed plan carries the
   capture block in the publish task params, matching output paths, and the
   query schemas.

Invoke [execute-workflow](../../execute-workflow/SKILL.md) with the saved plan path.

Close the run by naming the published revision to the user: the full revision
directory, and what that directory now holds. `_debo reference validate
--reference <revision-dir>` prints both — the binding directory, every
fingerprinted file, and the covered subjects, cells and queryable packages. The
directory is the path every later design workflow binds to, so report it in
full. Completion: the user has the revision directory plus a per-subject account
of its states, views, screenshots and asset files.
