---
name: reference-intake
description: Consume a completed observation revision before fixing the design inventory.
---

# Prepare the design reference during intake

1. Prefer an already published revision whose selected scope supports the
   request and whose `approval.yml` is approved for that need. When none fits
   (or a refresh is required), emit a ReferenceNeed (step 2) and leave capture
   plus screenshot approval to a separate
   [extract-reference](../../skills/extract-reference/resources/intake.md) start.
   Design intake resumes after that start leaves an approved revision.
2. When the needed revision is missing, pending, rejected, fingerprint-drifted,
   or under-scoped, emit a transportable **ReferenceNeed** and stop before
   sealing the design plan. Shape (single contract — same fields the CLI
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
   selector inventory ([write planning](write-planning.md) step 3): `reference`
   (`<id>/<revision>`), `scope` (subjects, views, states), `answer` (`yes` | `no`),
   `rationale`, and the links. An explicit answer already given for the same
   revision and scope — in the request or an earlier closeout — is reused without
   asking again; a changed scope asks again. A `no` emits a ReferenceNeed
   (step 2) when new visual evidence is required, or continues as text-only work
   with its limitation recorded. A `yes` binds the revision only after the
   approval gate in step 4 passes: suitability confirms purpose, screenshot
   approval confirms the captured evidence. Completion: the recorded decision names
   the revision, scope, answer and links, and every bound revision has `answer: yes`.
4. Before `plan build` for a design that depends on a published revision, run
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
   [reference packages](reference-packages.md) for typed read-only bindings.
7. Present the selected source locators, implementation selectors, views, states
   and evidence through [write planning](write-planning.md). Save the exact
   completed revision binding with the design definition and bind each consuming
   task directly through its frozen reference query. Reference extraction belongs
   to the standalone `extract-reference` workflow, not a task in the design plan.
   Design execution consumes the completed revision without resubmitting captured
   metadata, extract or binary files.

A deliberately reference-free request records its limitation explicitly and uses
concrete build/browser criteria. A requested visual comparison requires valid
approved reference evidence.
