---
name: debo-config-sync
description: Run GAIA diagnose, spec, coding or review for designbook-to-config.
when:
  work_type: designbook-to-config
  workflow: [gaia_feature, gaia_bug, gaia_chore]
  step: [diagnose, spec, coding, review]
work_type_term:
  name: "work:designbook-to-config"
  description: "Sub-work: export Designbook display to Drupal config via sync-to; validate via sync-verify."
inputs:
  spec:
    description: intake that creates the executable plan during spec
    default: "Invoke @designbook/sync-to in persist mode."
  build:
    description: executor for the persisted plan from the handoff
    default: "Invoke @designbook/execute-workflow with the exact saved plan path."
  validate:
    description: verifier returning a ScoreReport for the acceptance criteria
    default: "@designbook/sync-verify"
  provision:
    description: command that brings up the test environment
    default: ddev init
  reference_capture:
    description: preparation of the reference used by planning and verification
    default: >
      Prepare the Designbook baseline for the selected config scope. Reuse upstream
      reference revisions; capture missing visual evidence in a separate
      @designbook/extract-reference run when needed.
---

# designbook-to-config

Run the shared start, then only the ticket's current step. Resolve inputs from
project overrides or these defaults. Spec produces the reference and a sealed durable plan; coding executes
that plan. Overrides must preserve this handoff and the verification output contract.

## Shared start and ownership

1. Invoke `@gaia/read-ticket`, including all comments and the latest handoff.
2. For `spec`, `diagnose` and `coding`, invoke `@gaia/ensure-qualification`;
   continue only on `qualified`, stop on `returned_to_qualification`.
3. Run `provision` via `@gaia/provision-ddev`, then invoke `@gaia/run-intake`.

Implementation and review subagents return artifacts and evidence. The parent
owns confirmations, merges, transitions and origin notifications.

For multiple `work:*` sub-works, run each matching skill in `WORKFLOW.md` load
order. Only the last matching skill performs the shared confirmation, merge,
transition and origin notifications, after every sub-work meets the current
step's gate. Outtakes and evidence remain per sub-work. Stop after the current
step; a transition does not start the next step.

## spec

1. Resolve the target scope, dependencies and acceptance criteria.
2. Run `reference_capture`. Publish the reference paths and screenshot links;
   complete required screenshot approval before dependent planning. If visual
   reference capture is unnecessary, record `not_required` with a reason and
   identify the existing source artifacts used for planning and validation.
   Capture is a separate workflow run; GAIA resumes spec after its closeout.
3. Run `spec` with an explicit `persist` override, following the Designbook
   [builder](../../../designbook/resources/workflow-building.md). Resolve all
   targets and task parameters and satisfy any `ReferenceNeed` approval gate.
   Completion: `plan build` returns `ok` and a sealed durable plan. Save its exact
   returned `plan` path; leave design/config execution for coding.
4. Commit the plan and publish the GAIA `spec` + `test` handoff: decision,
   alternatives, risks, `Task-Art`, reference paths and approval evidence, exact
   executable plan path, and an AC↔evidence matrix using `validate`.
5. Invoke `@gaia/run-outtake` with the decision, plan head and reference links.
   Ask the human to confirm the completed spec. Pending references or an absent
   executable plan block the handoff to coding.
6. After confirmation, invoke `@gaia/transition-ticket` to `coding` with the
   resolved reference links (`options.gaia.kind: reference`), then
   `@gaia/publish-origin-status` with `coding`.

## diagnose

1. Invoke `@gaia/diagnose-ticket` to establish the cause.
2. Author `@gaia/acceptance` → `@gaia/scenario` → a concrete check, then invoke
   `@gaia/verify` with `validate`. **RED:** the reported defect reproduces and
   the new check fails; leave implementation for coding.
3. Prepare the repair reference and durable plan using spec steps 2–4, retaining
   the RED evidence. This supplies the same executable handoff coding requires.
4. Invoke `@gaia/run-outtake` with the cause, RED evidence and config diff.
5. Invoke `@gaia/transition-ticket` to `coding`, then
   `@gaia/publish-origin-status` with `coding`.

## coding

1. Resolve the exact executable plan path and reference from the handoff. Check
   required reference approvals before execution. If the plan is missing or
   references are unresolved, report the missing handoff and stop for planning;
   coding consumes the saved plan rather than rebuilding it through an intake.
2. Invoke `@gaia/implement-ticket` with `build` and that plan path. Reuse the
   decisions recorded in spec.
3. Reuse diagnosis QA artifacts for bugs; for features/chores, create any missing
   `@gaia/acceptance` → `@gaia/scenario` → concrete checks. Run `@gaia/verify`
   with `validate` and fix until every applicable criterion and the verifier
   verdict are **GREEN**.
4. Record the measurement below before transitioning.
5. Invoke `@gaia/run-outtake` with the verdict, statistics, config diff and
   applicable preview links. Ask the human to confirm the implementation and MR.
6. After confirmation, invoke `@gaia/transition-ticket` to `review` with the same
   preview links plus artifact, MR, pipeline and report links. Invoke
   `@gaia/publish-origin-status` with `review` and
   `@gaia/publish-origin-feedback` with an interim note.

## review

1. Invoke `@gaia/review-ticket` in a review subagent. Run `@gaia/verify` with
   `validate` freshly against every acceptance criterion's abstract scenario.
   A `fail`, `red`, or uncovered criterion without written justification yields
   **Not OK**; otherwise **OK**. Record the fresh measurement before transition.
2. Invoke `@gaia/run-outtake` with the verdict, statistics, applicable preview
   links and any failing criteria. Ask the human to confirm the verdict.
3. After confirmation:
   - **OK:** the parent invokes `@gaia/merge-mr` with the resolved MR link.
     Require a green pipeline including required manual jobs, no conflicts and
     a verified successful merge before transitioning to `done`. On failure,
     report the actionable blocker and stop.
   - **Not OK:** transition to `coding`, leaving the MR unmerged.
   Use `@gaia/transition-ticket` with resolved additive links, including the
   applicable previews.
4. Invoke `@gaia/publish-origin-status` with the destination and
   `@gaia/publish-origin-feedback` with the delivery summary or review findings.

## Evidence contract

Use the same applicable previews in outtake and transition, including review:

- Changed Designbook artifacts: Storybook link (`options.gaia.kind: storybook`);
  otherwise omit with a one-line reason.
- Changed Drupal config: Drupal preview link (`options.gaia.kind: drupal-preview`);
  otherwise record `not_applicable` with a one-line reason.

From `validate`'s `ScoreReport`, record `config_verify` into `gaia_ticket.metrics`
with one `session` PATCH **before transition**. Use `final`'s `score`,
`avg_diff_percent`, `max_diff_percent`, `checks_passed`, `checks_total` and the
report's `delta`. Follow GAIA's
`review-ticket/measurements/definitions/sync-verify.json` and
`review-ticket/measurements/README.md`; review replaces the measurement with its
fresh result.
