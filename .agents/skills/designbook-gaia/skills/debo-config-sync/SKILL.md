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
  spec.prompt:
    description: intake that creates the executable plan during spec
    default: "Invoke @designbook/sync-to in persist mode."
  build.prompt:
    description: executor for the persisted plan from the handoff
    default: "Invoke @designbook/execute-workflow with the exact saved plan path."
  validate.prompt:
    description: verification skill for the acceptance criteria
    default: "@designbook/sync-verify"
  provision.command:
    description: command that brings up the test environment
    default: ddev init
  reference.prompt:
    description: preparation of the reference used by planning and verification
    default: >
      Prepare the Designbook baseline for the selected config scope. Reuse upstream
      reference revisions; capture missing visual evidence in a separate
      @designbook/extract-reference run when needed.
---

# designbook-to-config

Read and apply `@gaia/method-context` and `@gaia/workflow-step` for the current
step. They own scope approval, checks, handoff publication, multi-work ordering,
authorization and transitions. Provision through `@gaia/provision-ddev` with
`provision.command` only when reference capture or a selected check needs it.
Resolve typed inputs from project overrides or defaults under the workflow-step
contract; preserve the reference → saved plan → execution handoff.

## spec

1. Read the ticket and all comments with `@gaia/read-ticket`; invoke
   `@gaia/ensure-qualification` and continue only on `qualified`. Resolve the
   selected method and project standards under `@gaia/method-context`.
2. Resolve scope, dependencies and acceptance criteria, then prepare the
   reference and executable plan under *Designbook planning* below.
3. Publish complete `spec`, `plan` and `test` comments through
   `@gaia/publish-comment`. Record decisions and risks, reference revisions and
   approval evidence, the executable plan path and commit, and the AC↔evidence
   mapping. Separate project checks from functional validation. The ticket's
   `plan` explains the implementation; the sealed Designbook plan is its
   executable artifact. Publish both the full explanation and artifact location.
4. The last matching work type obtains or reuses one approval for the complete
   proposal and records the confirmed comment IDs. Unresolved references or a
   missing executable plan block coding.
5. Render `@gaia/run-outtake` and persist its summary. Complete the
   `@gaia/workflow-step` publication order, with any authorized origin messages
   before the final transition to `coding`. Respect state restrictions and stop.

## Designbook planning

Apply in spec, or after RED diagnosis for a repair:

1. Follow `reference.prompt`. Complete required screenshot approval before
   dependent planning. Capture runs separately through `extract-reference`;
   resume planning after its closeout. When new visual capture is unnecessary,
   record `not_required` with a reason and identify the existing source artifacts.
2. Follow `spec.prompt` with explicit `persist` mode under the Designbook
   [builder](../../../designbook/resources/workflow-building.md). Resolve all
   targets, task parameters and any `ReferenceNeed`. Completion: `plan build`
   returns `ok` and the exact path of a sealed durable plan; execution has not
   started.
3. Commit the executable plan and required reference artifacts so coding can
   load them from its checkout. Hand off their exact paths, revision and approval
   evidence. Keep GAIA process narrative in ticket comments; this saved plan is
   the Designbook executor's input, not a replacement for those comments.

## diagnose

1. Read the ticket, invoke `@gaia/ensure-qualification`, and continue only on
   `qualified`. Frame RED with `@gaia/run-intake`.
2. Invoke `@gaia/diagnose-ticket` with the selected method. Record acceptance
   criteria and the actual failing check through the configured checks and
   `validate.prompt`. Diagnose without executing repairs: **RED** means the
   reported defect still reproduces.
3. Apply *Designbook planning* for the repair. Publish the diagnosis, RED evidence,
   complete repair plan and verification plan under `@gaia/method-context`.
4. Render and persist the outtake. The last matching work type obtains or reuses
   approval of the diagnosis, fix direction and verification plan. Complete the
   `@gaia/workflow-step` publication order, then transition once to `coding`
   unless state-restricted. Stop before implementation.

## coding

Follow `@gaia/method-context` → *Coding flow*, ending at *Coding gate*, with
these domain inputs:

- Before implementation, resolve the confirmed handoff's executable plan and
  reference. Check required reference approvals. Missing artifacts or unresolved
  references block execution; publish the incomplete handoff instead of re-intake.
- At the implementation step, the owner follows `build.prompt` directly with
  the exact saved plan path and approved scope. Apply the shared pre-build check.
- Run `validate.prompt` as functional verification alongside every applicable
  project check. Fix within approved scope and require GREEN for every applicable
  acceptance criterion. A repair that expands scope follows `@gaia/scope-change`.
- Include the verification report, config diff and the evidence below in the
  typed coding handoff and summary. The shared Coding gate owns destination
  choice and re-entry; confirming the summary alone does not choose a transition.

## review

Follow `@gaia/method-context` → *Review flow*, including evidence reuse, the
parent's closed repair list, cause-dependent `Not OK` routing and the merge gate.
Use `validate.prompt` for Designbook functional evidence; rerun when the shared
flow requires it. A verification run in diagnosis or review stops at its findings,
before Designbook's automatic repair handoff; review repairs remain governed by
GAIA's closed list. Review is mandatory for features; bug/chore destination
choices belong to the shared Coding gate.

## Evidence

Persist complete verification findings, checked scope, tested revision and report
links in the typed handoff. Include reference screenshot links with
`options.gaia.kind: reference`. Use the same applicable previews in the outtake
and transition:

- Changed Designbook artifacts: `options.gaia.kind: storybook`; otherwise omit
  with a one-line reason.
- Changed Drupal config: `options.gaia.kind: drupal-preview`; otherwise record
  `not_applicable` with a one-line reason.

For a measurement supplied by the project or review method, pass its definition
and actual reported values to `@gaia/record-measurement` before transition. Keep
verification reports as evidence regardless of whether a metric is configured;
missing required metric definitions or values block that measurement, never
justify fabricated values. `@gaia/workflow-step` owns the final publication order;
no workflow work follows the transition.
