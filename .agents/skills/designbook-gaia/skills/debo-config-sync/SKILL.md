---
name: debo-config-sync
description: Own the diagnose, spec, coding, and review steps for a work:designbook-to-config sub-work — plan with debo --plan, build the config with debo --from-plan, validate with debo config-verify (recording its statistics as the config_verify measurement and resolving the Storybook + Drupal preview-module links), each step with its own transition.
when:
  work_type: designbook-to-config
  workflow: [gaia_feature, gaia_bug, gaia_chore]
  step: [diagnose, spec, coding, review]
work_type_term:
  name: "work:designbook-to-config"
  description: "Sub-work: sync Designbook components into Drupal configuration — built with debo --from-plan, validated with debo config-verify."
inputs:
  spec:
    description: how to produce the config plan in the spec step (debo, run to the last interactive stage, writing a plan file)
    default: debo <config workflow> --plan
  build:
    description: how to build the Drupal config autonomously from the spec plan
    default: debo <config workflow> --from-plan <plan>
  validate:
    description: command that validates the synced Drupal config against the Designbook reference
    default: debo config-verify
  provision:
    description: command that brings up the test environment
    default: ddev init
---

# Syncing Designbook to config (work:designbook-to-config)

You own the `diagnose`, `spec`, `coding`, and `review` steps for a `work:designbook-to-config`
sub-work. The flow is **plan → build → validate**: `spec` runs the debo config workflow with
`--plan` to write the plan and stop; `coding` runs it with `--from-plan` to build the Drupal config
autonomously from that plan; `validate` (`debo config-verify`) reconciles the backend render of that
config against the Designbook reference. One run works one step; do only the step matching the
ticket's current state, then STOP. Every value you reference (`spec`, `build`, `validate`,
`provision`) has a short description and a default in this skill's `inputs`; a project overrides any
inline under this skill's bullet in `WORKFLOW.md` (effective = override ?? default).
(`gaia_feature`/`gaia_chore` run `spec` then `coding`; `gaia_bug` runs `diagnose` then `coding` and
has no `spec`.)

**Shared start.** Invoke `@gaia/read-ticket` (all comments + latest handoff). For `spec`,
`diagnose`, and `coding` also invoke `@gaia/ensure-qualification` — STOP on
`returned_to_qualification`; continue only on `qualified`. Bring up the test environment by running
`provision` via `@gaia/provision-ddev`, and frame the run with `@gaia/run-intake`. `review` starts
the same way **without** `@gaia/ensure-qualification`.

## spec

1. Shared start.
2. Produce the config plan by running `spec` (`debo <config workflow> --plan`): it runs the debo
   config workflow up to its last interactive stage, writes the plan file, and stops — no config is
   built yet. Explore and decide only.
3. Publish the gaia `spec` + `test` handoff (design decision, alternatives, risks, `Task-Art`, the
   written plan path, and the AC↔evidence matrix mapping each acceptance criterion to the
   `debo config-verify` evidence). Commit the plan.
4. Invoke `@gaia/run-outtake`, leading with the decision and the plan head.
5. Ask the human to confirm the plan.
6. After confirmation, invoke `@gaia/transition-ticket` with destination `coding`, then
   `@gaia/publish-origin-status` with `coding`.
7. Stop. Do not start or prepare coding work.

## diagnose

1. Shared start (RED target gate).
2. Invoke `@gaia/diagnose-ticket`; diagnose only, do not implement the fix.
3. Author the QA artifacts: `@gaia/acceptance` → `@gaia/scenario` → the concrete check →
   `@gaia/verify` with `validate` (`debo config-verify`). **RED gate:** the reported config defect
   still reproduces and the new check fails.
4. Invoke `@gaia/run-outtake`, leading with the confirmed cause, the RED evidence, and the config
   diff.
5. Invoke `@gaia/transition-ticket` with destination `coding`, then `@gaia/publish-origin-status`
   with `coding`.
6. Stop. Do not start or prepare coding work.

## coding

1. Shared start (GREEN target gate). The guard protects `coding` even when entered through a manual
   state change or an import.
2. Invoke `@gaia/implement-ticket` to **build** the config autonomously from the spec plan by
   running `build` (`debo <config workflow> --from-plan <plan>`) — it reads the decisions from the
   plan written in `spec` instead of asking. A `gaia_bug` has no `spec` plan; build directly with
   the debo config workflow. Ship config in both `config/sync` and the matching recipe copy so the
   server's CIM and a fresh recipe install stay in sync. **The debo build is no exception**: it goes
   through `@gaia/implement-ticket`, which owns the build-dispatch mechanism and runs it in an
   isolated subagent with a self-contained handoff and no credentials/no comment-publishing,
   returning its artifacts/evidence; this parent keeps confirmation, transition, and notification.
3. Drive the acceptance criteria to GREEN. For a feature or chore author the QA artifacts now
   (`@gaia/acceptance` → `@gaia/scenario` → the concrete check) if `spec` did not; a bug reuses the
   `diagnose` artifacts. Then invoke `@gaia/verify` with `validate` (`debo config-verify`) and fix
   until every applicable criterion reports GREEN. **GREEN gate:** do not proceed until the
   `debo config-verify` verdict is green; include the config diff and the verdict in the handoff.
4. **Record the measurement.** From the `debo config-verify` `ScoreReport`, record the `config_verify`
   measurement (`measurements/definitions/config-verify.json`: `score`, `delta`, `avg_diff_percent`,
   `max_diff_percent`, `checks_passed`, `checks_total`) into `gaia_ticket.metrics` with **one
   `session` PATCH before the transition** (footprint-before-transition), per
   `review-ticket/measurements/README.md`.
5. Invoke `@gaia/run-outtake`, leading with the `debo config-verify` verdict and its statistics, the
   config diff, the **Storybook link** (the baseline the render was reconciled against), and the
   **Drupal preview-module link** (the backend render of the synced config).
6. Ask the human to confirm the implementation summary and MR.
7. After confirmation, invoke `@gaia/transition-ticket` with destination `review` and resolved
   links — the **Storybook link** and the **Drupal preview-module link** (both mandatory for this
   sub-work) plus MR, pipeline, config-diff, and report links.
8. Invoke `@gaia/publish-origin-status` with `review`, then `@gaia/publish-origin-feedback` with an
   interim note.
9. Stop. Do not start or prepare review work.

## review

1. Shared start **without** the qualification guard (the OK/Not OK decision this run must reach).
2. Invoke `@gaia/review-ticket` in a review subagent: run `@gaia/verify` with `validate`
   (`debo config-verify`) **fresh**, re-validating each acceptance criterion from its abstract
   scenario. Any criterion reporting `fail` or `red`, or left uncovered without written
   justification, forces `Not OK`. The result is exactly `OK` or `Not OK`. Re-record the
   `config_verify` measurement from this fresh `debo config-verify` `ScoreReport` (session PATCH,
   before the transition).
3. Invoke `@gaia/run-outtake`, leading with the verdict, the `debo config-verify` statistics, the
   Storybook link, and the Drupal preview-module link; for `Not OK` the failing criterion.
4. Ask the human to confirm the verdict.
5. After confirmation, on `OK` **run the merge gate in this parent before transitioning** — invoke
   `@gaia/merge-mr` with the resolved MR link (gates: MR present, pipeline green incl. required
   manual jobs, no conflict, merge succeeds). Only after a **verified-successful merge** invoke
   `@gaia/transition-ticket` with destination `done`; on any gate failure render the actionable
   failure and do **not** transition to `done`. On `Not OK` invoke `@gaia/transition-ticket` with
   destination `coding` and **perform no merge** (every non-`done` destination leaves the MR
   unmerged). Supply only resolved additive links, including the Storybook link and the Drupal
   preview-module link.
6. Invoke `@gaia/publish-origin-status` with the chosen destination and `@gaia/publish-origin-feedback`
   with the delivery summary (`OK`) or a findings note (`Not OK`).
7. Stop. Do not start or prepare another state.

## Multi-work single transition

When the ticket carries more than one `work:*` sub-work, one skill matches per work type and each
runs its own build+validate body in `WORKFLOW.md` load order; the **last matching skill in load
order** performs the single confirmation, transition, and origin-status, gated on all sub-works
reaching this step's gate. Every other part of the flow is per-skill.
