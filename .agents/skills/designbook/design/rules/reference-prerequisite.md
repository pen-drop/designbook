---
name: reference-intake
description: Consume a completed observation revision before fixing the design inventory.
trigger:
  domain: design.intake
---

# Bind a published reference during intake

Applies when consuming source reference evidence. The explicitly requested
`extract-reference` skill produces that evidence and is outside this prerequisite.

1. Bind a published revision with approval for the requested scope. A URL,
   node ID or screenshot alone does not satisfy this prerequisite. If the
   revision needs capture or refresh, return the handoff in step 2 and stop.
   Tell the caller to use the **`extract-reference` skill** in a separate start,
   then resume this consuming skill with its published, approved revision.
   Never start extraction or its source tools implicitly from a consuming skill.

   Verification may use that skill with role `actual` to capture the current
   implementation after its source `reference` prerequisite passes.
2. When the needed revision is missing, pending, rejected, fingerprint-drifted,
   or under-scoped, return a **ReferenceNeed YAML block** in the final response
   and stop before sealing the consuming plan. Fill every field below with the
   caller’s scope and unresolved decisions so another start can resume it. Shape (single contract — same fields the CLI
   `reference approval-check --need` covers):

   ```yaml
   kind: ReferenceNeed
   workflow: design-screen   # caller that paused
   return_to:                # enough to resume planning without re-deriving scope
     target: homepage
     unresolved: [hero visual baseline]
   need:
     role: reference
     source: website         # or figma | storybook
     subjects: [hero]
     states: [default]
     views: [desktop]
     candidate_locators: { hero: "…" }  # optional hints
   reason: "No approved revision covers hero@default@desktop"
   ```

   Text-only work that needs no new visuals records its limitation and skips
   inventing a ReferenceNeed.
3. **Link and confirm suitability** before binding a published revision. Resolve
   the live Storybook URL with `storybook status`; `GET <url>/__designbook/references/<id>/<revision>`
   lists the revision's captures, each with its `storyId`. Show the user the exact
   `<id>/<revision>`, the capture tuples (subject · view · state) relevant to the
   request, and one link `<url>/?path=/story/<storyId>` per tuple. Then ask:
   „Passt diese Referenz für den vorliegenden Anwendungsfall?"
   Record the **suitability** decision in the user-visible intake beside the
   selector inventory ([write planning](../resources/write-planning.md) step 3): `reference`
   (`<id>/<revision>`), `scope` (subjects, views, states), `answer` (`yes` | `no`),
   `rationale`, and the links. An explicit answer already given for the same
   revision and scope — in the request or an earlier closeout — is reused without
   asking again; a changed scope asks again. A `no` emits a ReferenceNeed
   (step 2) when new visual evidence is required, or continues as text-only work
   with its limitation recorded. A `yes` binds the revision only after the
   approval gate in step 4 passes: suitability confirms purpose, screenshot
   approval confirms the captured evidence. Completion: the recorded decision names
   the revision, scope, answer and links, and every bound revision has `answer: yes`.
4. Before `plan build` for any workflow that depends on a published revision, run
   `_debo reference approval-check --reference <revisionDir> --need <json>`
   ([CLI workflow](../../resources/cli-workflow.md)). Exit 0 with matching
   fingerprint and covering scope is required; otherwise retain the ReferenceNeed
   blockade with the check's exact reason.
5. Inspect bounded observations and the associated images from that approved
   revision. Confirm every source locator identifies the intended subject and
   state, not merely an existing node. Establish explicit correspondences with
   planned implementation selectors and views. Clarify required missing evidence.
6. The design planner now decides component decomposition, target structure,
   concrete styling, assets and behavior. Store these decisions in task work orders
   and context; the immutable extract contains only observed facts. Use
   [reference packages](../resources/reference-packages.md) for typed read-only bindings.
7. Present the selected source locators, implementation selectors, views, states
   and evidence through [write planning](../resources/write-planning.md). Save the exact
   completed revision binding with the design definition and bind each consuming
   task directly through its frozen reference query. Design execution consumes the completed revision without resubmitting captured
   metadata, extract or binary files.

A deliberately reference-free request records its limitation explicitly and uses
concrete build/browser criteria. A requested visual comparison requires valid
approved reference evidence.
