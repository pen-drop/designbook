---
name: debo-designbook-design
description: Handle the GAIA workflow step for this Designbook work type. Use only for the matching work_type and current step.
when:
  work_type: design-to-designbook
  workflow: [gaia_feature, gaia_bug, gaia_chore]
  step: [diagnose, spec, coding, review]
work_type_term:
  name: "work:design-to-designbook"
  description: "Sub-work: build or fix the Designbook/SDC component; acceptance in Storybook, validated via design-verify."
inputs:
  spec:
    description: domain scope to record during spec without executing an intake
    default: describe intended artifacts, targets, references and acceptance checks
  build:
    description: how to build the design autonomously from the spec plan
    default: >
      Prefer @designbook/execute-workflow on a durable plan_path from a persist
      handoff when present. If references are pending or unapproved
      (approval-check fails or ReferenceNeed unresolved), surface the blockade
      and do not start design execute. Otherwise, when no durable plan exists yet
      and the mode allows, invoke the matching Designbook intake with the
      specified domain task — intakes honor ephemeral|persist|ask (not
      unconditional auto-execute).
  validate:
    description: command that validates the Designbook artifacts
    default: "@designbook/design-verify"
  provision:
    description: command that brings up the test environment
    default: ddev init
  reference_capture:
    description: how the spec step surfaces the design reference in the ticket — which reference images/screenshots to list and link
    default: |
      List existing reference images or capture the supplied reference independently of any
      Designbook intake. Pass resolved links with options.gaia.kind: reference to run-outtake
      and transition-ticket. If no reference is needed, record not_required.

---

# Designing to Designbook (work:design-to-designbook)

Work only the ticket's current step, then stop. In spec, describe intended artifacts,
references, targets, acceptance checks, intended execution mode
(`ephemeral` | `persist` | `ask`), and any `ReferenceNeed` without invoking a Designbook
intake. In coding, prefer `@designbook/execute-workflow` on a durable plan from a persist
handoff; otherwise use the matching intake under shared builder modes. Validate with the
configured verification skill. Project overrides replace the corresponding input defaults.

**Shared start.** Invoke `@gaia/read-ticket` (all comments + latest handoff). For `spec`,
`diagnose`, and `coding` also invoke `@gaia/ensure-qualification` — STOP on
`returned_to_qualification` (the guard already published findings, transitioned to `qualification`,
and published origin status); continue only on `qualified`. Bring up the test environment by
running `provision` via `@gaia/provision-ddev`, and frame the run with `@gaia/run-intake`. `review`
starts the same way **without** `@gaia/ensure-qualification`.

## spec

1. Shared start.
2. Describe the intended domain work: artifact types, exact target scope, references,
   dependencies and acceptance checks. Record the matching Designbook intake for coding,
   the intended execution mode (`ephemeral` | `persist` | `ask`), any `ReferenceNeed`, and
   whether coding should consume a pre-persisted durable plan. Do **not** invoke a Designbook
   intake during spec — intakes now honor modes, but spec still only records intent; coding
   owns build/execute. When capture is needed, point at `extract-reference` as a **separate**
   start (GAIA may assign a different agent); do not chain design execute from extract.
3. Publish the gaia `spec` + `test` handoff (design decision, alternatives, risks, `Task-Art`, the
   written plan path, intended mode / ReferenceNeed / persist handoff notes, and the
   AC↔evidence matrix mapping each acceptance criterion to the
   `@designbook/design-verify` evidence). Commit the plan.
4. Surface the design reference using `reference_capture`. Include the resolved links in
   run-outtake and transition-ticket; record not_required when no reference is needed.
5. Invoke `@gaia/run-outtake`, leading with the design decision and the plan head, and displaying the
   reference links from step 4.
6. Ask the human to confirm the design plan.
7. After confirmation, invoke `@gaia/transition-ticket` with destination `coding` and the reference
   resolved links from step 4, then `@gaia/publish-origin-status` with `coding`.
8. Stop. Do not start or prepare coding work.

## diagnose

1. Shared start (RED target gate).
2. Invoke `@gaia/diagnose-ticket`; diagnose only, do not implement the fix.
3. Author the QA artifacts: `@gaia/acceptance` → `@gaia/scenario` → the concrete check →
   `@gaia/verify` with `validate` (`@designbook/design-verify`). **RED gate:** the reported design
   defect still reproduces and the new check fails.
4. Invoke `@gaia/run-outtake`, leading with the confirmed cause, the RED evidence, and the
   `@designbook/design-verify` verdict.
5. Invoke `@gaia/transition-ticket` with destination `coding`, then `@gaia/publish-origin-status`
   with `coding`.
6. Stop. Do not start or prepare coding work.

## coding

1. Shared start (GREEN target gate). The guard protects `coding` even when entered through a manual
   state change or an import.
2. Invoke `@gaia/implement-ticket` with `build`:
   - If a durable `plan_path` exists from a persist handoff / spec artifact → run
     `@designbook/execute-workflow` on that path only; do **not** re-intake into a path that
     would rebuild and auto-start execute.
   - If references are pending or unapproved (`reference approval-check` fails or a
     `ReferenceNeed` is unresolved) → do not start design execute; surface the blockade.
     Capture and screenshot approval remain a separate `extract-reference` start (GAIA routes;
     Designbook presents the PNGs).
   - When no durable plan yet and the mode allows, may invoke the matching Designbook intake
     with the specified domain task and reference inputs — the intake follows shared builder
     modes (`ephemeral` | `persist` | `ask`), not unconditional auto-execute. Reuse decisions
     already answered by the spec.
   The implementation subagent returns artifacts and evidence; this parent owns confirmation,
   transitions and notifications.
3. Drive the acceptance criteria to GREEN. For a feature or chore author the QA artifacts now
   (`@gaia/acceptance` → `@gaia/scenario` → the concrete check) if `spec` did not; a bug reuses the
   `diagnose` artifacts. Then invoke `@gaia/verify` with `validate` (`@designbook/design-verify`) and
   fix until every applicable criterion reports GREEN. **GREEN gate:** do not proceed until the
   `@designbook/design-verify` verdict is green; include the component paths and the verdict in the
   handoff.
4. **Record the measurement.** From the `@designbook/design-verify` `ScoreReport`, record the
   `design_verify` measurement (`measurements/definitions/design-verify.json`: `score`, `delta`,
   `avg_diff_percent`, `max_diff_percent`, `checks_passed`, `checks_total` — the `final`
   `VerifyResult` plus the report `delta`) into `gaia_ticket.metrics` with **one `session` PATCH
   before the transition** (footprint-before-transition; a retired run loses its write scope), per
   `review-ticket/measurements/README.md`.
5. Invoke `@gaia/run-outtake`, leading with the `@designbook/design-verify` verdict and its
   statistics. Lead the **Storybook preview link** (`kind: storybook`) **only when the build changed
   Designbook artifacts** (scene/component files); if it did not, omit it with a one-line documented
   reason. Lead the **Drupal preview link** (`kind: drupal-preview`) **only when the build changed
   Drupal config**; a `work:design-to-designbook` build normally changes no config, so record it
   explicitly as `not_applicable` with a one-line reason otherwise.
6. Ask the human to confirm the implementation summary and MR.
7. After confirmation, invoke `@gaia/transition-ticket` with destination `review` and resolved
   links — the **Storybook preview link** (when Designbook artifacts changed) and the **Drupal
   preview link** (when Drupal config changed; else omitted as `not_applicable`), each carrying its
   `options.gaia.kind`, plus Designbook, MR, pipeline, and report links. Both preview links appear
   here **and** in the `run-outtake` (step 5).
8. Invoke `@gaia/publish-origin-status` with `review`, then `@gaia/publish-origin-feedback` with an
   interim note.
9. Stop. Do not start or prepare review work.

## review

1. Shared start **without** the qualification guard (the OK/Not OK decision this run must reach).
2. Invoke `@gaia/review-ticket` in a review subagent: run `@gaia/verify` with `validate`
   (`@designbook/design-verify`) **fresh**, re-validating each acceptance criterion from its abstract
   scenario. Any criterion reporting `fail` or `red`, or left uncovered without written
   justification, forces `Not OK`. The result is exactly `OK` or `Not OK`. Re-record the
   `design_verify` measurement from this fresh `@designbook/design-verify` `ScoreReport` (session
   PATCH, before the transition).
3. Invoke `@gaia/run-outtake`, leading with the verdict, the `@designbook/design-verify` statistics,
   and the final Storybook link; for `Not OK` the failing criterion.
4. Ask the human to confirm the verdict.
5. After confirmation, on `OK` **run the merge gate in this parent before transitioning** — invoke
   `@gaia/merge-mr` with the resolved MR link (gates: MR present, pipeline green incl. required
   manual jobs, no conflict, merge succeeds). Only after a **verified-successful merge** invoke
   `@gaia/transition-ticket` with destination `done`; on any gate failure render the actionable
   failure and do **not** transition to `done`. On `Not OK` invoke `@gaia/transition-ticket` with
   destination `coding` and **perform no merge** (every non-`done` destination leaves the MR
   unmerged). Supply only resolved additive links, including the final Storybook link.
6. Invoke `@gaia/publish-origin-status` with the chosen destination and `@gaia/publish-origin-feedback`
   with the delivery summary (`OK`) or a findings note (`Not OK`).
7. Stop. Do not start or prepare another state.

## Multi-work single transition

When the ticket carries more than one `work:*` sub-work, one skill matches per work type and each
runs its own build+validate body in `WORKFLOW.md` load order; the **last matching skill in load
order** performs the single confirmation, transition, and origin-status, gated on all sub-works
reaching this step's gate. Every other part of the flow is per-skill.
