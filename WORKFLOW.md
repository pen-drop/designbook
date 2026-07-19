# designbook — WORKFLOW

Execute only the section matching the ticket's current state, from top to bottom. One run works
one state. Skills produce outcomes; this file alone owns order, decisions, confirmation,
destinations, and stopping.

## State: triage

1. Invoke `@gaia/read-ticket`, including all comments.
2. Classify the ticket: bug uses workflow `gaia_bug` and destination `diagnose`; feature uses
   `gaia_feature` and `spec`; chore uses `gaia_chore` and `spec`.
3. Publish the `acceptance` handoff, including `Task-Art`, with a validated session write.
4. Invoke `@gaia/transition-ticket` once with the explicit workflow and destination above.
5. Stop. Do not start or prepare the destination state.

## State: spec

1. Invoke `@gaia/read-ticket`, including all comments.
2. Invoke `@gaia/create-spec` with this project policy:
   - UI/design surface: designbook IS the design surface — plan each UI artifact with the `debo`
     skill (sub-command design-entity | design-component | sections | design-screen, run in
     `--plan` mode); commit the generated `.plan.md` files and reference them in the plan. Build
     nothing in spec. No hand-coded components.
   - debo-test tester ticket (a designbook-test tester run, not a UI/design change): the whole
     spec is recording the target debo-test `<suite>` and `<case>` plus which validate workflow
     runs after the main workflow (typically `design-verify`; "none" = no validate pass) — when
     unspecified, list options with `debo-test run <suite>` (no case arg) and confirm the pick.
     No design/component planning and no BDD: the executable test IS `debo-test run <suite>
     <case>` (with `--validate <workflow>` when spec recorded one), so the `test` also-author
     comment just names that invocation (no Gherkin/`.feature`). Write `Task-Art: debo-test` into
     the spec comment so coding and review pick up the kind.
3. Ask the human to confirm the specification and implementation plan.
4. After confirmation, invoke `@gaia/transition-ticket` with destination `coding`.
5. Stop. Do not start or prepare coding work.

## State: diagnose

1. Invoke `@gaia/read-ticket`, including all comments.
2. Invoke `@gaia/diagnose-ticket`; diagnose only and do not implement the fix.
3. Invoke `@gaia/transition-ticket` with destination `coding`.
4. Stop. Do not start or prepare coding work.

## State: coding

1. Invoke `@gaia/read-ticket`, including all comments and the latest confirmed handoff.
2. Invoke `@gaia/implement-ticket` with this project policy:
   - UI/design surface: execute the spec's plans with `debo --from-plan <plan-file>` (path, exact
     name, or substring); do not hand-code the components.
   - Task-Art debo-test: run `debo-test run <suite> <case> --validate <workflow>` for the
     suite+case and validate workflow recorded by spec (append `--validate` only when spec
     recorded one) — never ad-hoc — and capture the tester output (the `workflow summary --json`
     block). Do not hand-edit skill files. TDD does not apply — the work is running one fixed
     tester command, not writing code.
   - Runtime surface (any change to a designbook skill — workflow/task/rule/blueprint/schema):
     verify it end-to-end through the matching `debo-test` tester (never ad-hoc) — pick the
     suite/case whose fixture exercises the changed skill and run `debo-test run <suite> <case>`
     for a single functional pass, or `debo-test research <suite> <case> --baseline-only` for a
     scored audit; the tester provisions the test workspace (and, for a Drupal `sync-*` case, the
     live Drupal target via `start-drupal-workspace.sh`). If no fixture exercises the change yet,
     author it first.
   - App or conductor change: run `pnpm check` (typecheck → lint → test, fail-fast) from the repo
     root; also run it when a change touches the addon/TS.
   - Run every `debo-test` tester from a plain checkout, NOT from inside a git worktree — the
     tester's setup runs `git reset --hard` / `git clean -fd` and assumes the workspace theme dir
     is its own git repo.
3. Ask the human to confirm the implementation summary and MR.
4. After confirmation, invoke `@gaia/transition-ticket` with destination `review` and resolved
   MR, pipeline, feature, report, and Designbook links.
5. Stop. Do not start or prepare review work.

## State: review

1. Invoke `@gaia/read-ticket`, including all comments.
2. Invoke `@gaia/review-ticket` in a review subagent with this project's gates:
   - Non-debo-test tickets: require fresh verification and a green pipeline; the verdict is
     exactly `OK` or `Not OK`.
   - Task-Art debo-test: decide — and document the decision in the summary — whether an
     additional `debo-test research <suite> <case> --baseline-only` (scored audit) pass is
     warranted beyond coding's `run`. Gate on the tester result, not a pipeline: a debo-test
     ticket may have no MR/diff. Post the `summary` comment holding the tester/workflow results
     (run outcome + any research score); that comment is the write-back to the ticket.
3. Ask the human to confirm the verdict.
4. After confirmation, on `OK` invoke `@gaia/transition-ticket` with destination `done`; on
   `Not OK` invoke it with destination `coding`. Supply only resolved additive links.
5. Stop. Do not start or prepare another state.
