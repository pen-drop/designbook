---
name: debo-designbook-design
description: Run GAIA diagnose, spec, coding or review for design-to-designbook.
when:
  work_type: design-to-designbook
  workflow: [gaia_feature, gaia_bug, gaia_chore]
  step: [diagnose, spec, coding, review]
work_type_term:
  name: "work:design-to-designbook"
  description: "Sub-work: build or fix the Designbook/SDC component; acceptance in Storybook, validated via design-verify."
---

# design-to-designbook

Read and apply `@gaia/method-context` and `@gaia/workflow-step` for the current
step. They own scope approval, checks, handoff publication, multi-work ordering,
authorization and transitions. Storybook is the render environment for planning
and verification — no separate test-environment provisioning is used.
Per-step skill selection follows the [skill map](../../references/designbook.md)
under `@gaia/method-context`; preserve the reference → saved plan → execution handoff.

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

1. Prepare the required published design reference with screenshot approval.
   `@designbook/extract-reference` runs as a separate capture, loaded only when a
   reference source is named in the ticket or `vision.md` (see the [skill map](../../references/designbook.md)).
   Complete required screenshot approval before dependent planning; resume planning
   after its closeout. When new visual capture is unnecessary, record `not_required`
   with a reason and identify the existing source artifacts.
2. Invoke the matching Designbook design intake in explicit `persist` mode under the Designbook
   [builder](../../../designbook/resources/workflow-building.md). Resolve all
   targets, task parameters and any `ReferenceNeed`. Completion: `plan build`
   returns `ok` and the exact path of a sealed durable plan; execution has not
   started.
3. Commit the executable plan and required reference artifacts so coding can
   load them from its checkout. Hand off their exact paths, git revision, plan
   digest and approval evidence. In the spec publication, include the exact
   `plan tree <sealed-plan>` CLI text for that plan — copy the output, with the
   path, revision and digest beside it. Keep GAIA process narrative in ticket
   comments; this saved plan is the Designbook executor's input, not a
   replacement for those comments.

## diagnose

1. Read the ticket, invoke `@gaia/ensure-qualification`, and continue only on
   `qualified`. Frame RED with `@gaia/run-intake`.
2. Invoke `@gaia/diagnose-ticket` with the selected method. Record acceptance
   criteria and the actual failing check through the configured checks and
   `@designbook/design-verify`. Diagnose without executing repairs: **RED** means the
   reported defect still reproduces.
3. Apply *Designbook planning* for the repair. Publish the diagnosis, RED evidence,
   complete repair plan and verification plan under `@gaia/method-context`.
4. Render and persist the outtake. The last matching work type obtains or reuses
   approval of the diagnosis, fix direction and verification plan. Complete the
   `@gaia/workflow-step` publication order, then transition once to `coding`
   unless state-restricted. Stop before implementation.

## coding

Follow `@gaia/method-context` → *Coding flow*, ending at *Coding gate*, with
these domain steps:

- Before implementation, resolve the confirmed handoff's executable plan and
  reference. Check required reference approvals. Missing artifacts or unresolved
  references block execution; publish the incomplete handoff instead of re-intake.
- At the implementation step, the owner invokes `@designbook/execute-workflow`
  directly with the exact saved plan path and approved scope. Apply the shared pre-build check.
- Run `@designbook/design-verify` as functional verification alongside every applicable
  project check. Fix within approved scope and require GREEN for every applicable
  acceptance criterion. A repair that expands scope follows `@gaia/scope-change`.
- Include the verification report, component paths and the evidence below in the
  typed coding handoff and summary. The shared Coding gate owns destination
  choice and re-entry; confirming the summary alone does not choose a transition.

## review

Follow `@gaia/method-context` → *Review flow*, including evidence reuse, the
parent's closed repair list, cause-dependent `Not OK` routing and the merge gate.
Use `@designbook/design-verify` for Designbook functional evidence; rerun when the shared
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
