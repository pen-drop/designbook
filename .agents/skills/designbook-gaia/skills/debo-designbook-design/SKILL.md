---
name: debo-designbook-design
description: Own the diagnose, spec, coding, and review steps for a work:design-to-designbook sub-work — plan by loading the chosen design sub-skill in --plan mode, build with --from-plan <plan>, validate with @designbook/design-verify (recording its statistics as the design_verify measurement and resolving the final Storybook link), each step with its own transition.
when:
  work_type: design-to-designbook
  workflow: [gaia_feature, gaia_bug, gaia_chore]
  step: [diagnose, spec, coding, review]
work_type_term:
  name: "work:design-to-designbook"
  description: "Sub-work: build or fix the Designbook/SDC component; acceptance in Storybook, validated via design-verify."
inputs:
  spec:
    description: how to produce the design plan in the spec step (load the chosen design sub-skill, run to the last interactive stage, writing a plan file)
    default: load the chosen design sub-skill and run it with --plan   # candidates: @designbook/design-screen | @designbook/design-entity | @designbook/design-shell | @designbook/design-component
  build:
    description: how to build the design autonomously from the spec plan
    default: load the chosen design sub-skill and run it with --from-plan <plan>
  validate:
    description: command that validates the Designbook artifacts
    default: "@designbook/design-verify"
  provision:
    description: command that brings up the test environment
    default: ddev init
---

# Designing to Designbook (work:design-to-designbook)

You own the `diagnose`, `spec`, `coding`, and `review` steps for a `work:design-to-designbook`
sub-work. The Designbook flow is **plan → build → validate**: `spec` loads the chosen design
sub-skill and runs it with `--plan` to write the plan and stop; `coding` loads it and runs it with
`--from-plan <plan>` to build autonomously from that plan; `validate` (`@designbook/design-verify`)
checks the result. The `--plan` and `--from-plan <plan>` flags stay unchanged — each design sub-skill
parses them itself from `$ARGUMENTS` (per `designbook/SKILL.md` § Global Flags); only *how* the
workflow is started changes. One run works one step; do only the step matching the ticket's current
state, then STOP. Every value you reference (`spec`, `build`, `validate`, `provision`) has a short
description and a default in this skill's `inputs`; a project overrides any inline under this skill's
bullet in `WORKFLOW.md` (effective = override ?? default).
(`gaia_feature`/`gaia_chore` run `spec` then `coding`; `gaia_bug` runs `diagnose` then `coding` and
has no `spec`.)

**Shared start.** Invoke `@gaia/read-ticket` (all comments + latest handoff). For `spec`,
`diagnose`, and `coding` also invoke `@gaia/ensure-qualification` — STOP on
`returned_to_qualification` (the guard already published findings, transitioned to `qualification`,
and published origin status); continue only on `qualified`. Bring up the test environment by
running `provision` via `@gaia/provision-ddev`, and frame the run with `@gaia/run-intake`. `review`
starts the same way **without** `@gaia/ensure-qualification`.

## spec

1. Shared start.
2. Produce the design plan by running `spec`: choose the design workflow and load its matching
   sub-skill (candidates: `@designbook/design-screen`, `@designbook/design-entity`,
   `@designbook/design-shell`, `@designbook/design-component`), then run it with `--plan`. It runs
   the sub-skill up to its last interactive stage, writes the plan file, and stops — no artifacts are
   built yet. Explore and decide only.
3. Publish the gaia `spec` + `test` handoff (design decision, alternatives, risks, `Task-Art`, the
   written plan path, and the AC↔evidence matrix mapping each acceptance criterion to the
   `@designbook/design-verify` evidence). Commit the plan.
4. Invoke `@gaia/run-outtake`, leading with the design decision and the plan head.
5. Ask the human to confirm the design plan.
6. After confirmation, invoke `@gaia/transition-ticket` with destination `coding`, then
   `@gaia/publish-origin-status` with `coding`.
7. Stop. Do not start or prepare coding work.

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
2. Invoke `@gaia/implement-ticket` to **build** the design artifacts autonomously from the spec
   plan by running `build`: load the chosen design sub-skill and run it with `--from-plan <plan>` —
   it reads the decisions from the plan written in `spec` instead of asking, and runs the
   deterministic stages to completion. A `gaia_bug` has no `spec` plan; build directly with the
   chosen design sub-skill, following the Designbook skill. **The design build is no exception**: it
   goes through `@gaia/implement-ticket`, which owns the build-dispatch mechanism and runs it in an
   isolated subagent with a self-contained handoff and no credentials/no comment-publishing,
   returning its artifacts/evidence; this parent keeps confirmation, transition, and notification.
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
   statistics, and the **final Storybook link** for the built component(s).
6. Ask the human to confirm the implementation summary and MR.
7. After confirmation, invoke `@gaia/transition-ticket` with destination `review` and resolved
   links — the **final Storybook link** (mandatory for this sub-work) plus Designbook, MR, pipeline,
   and report links.
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
