# Execute a saved workflow plan

Input: a path to a complete MD plan (durable `plan_path` or an ephemeral path from
`plan build --ephemeral`). This is the sole owner of the task loop. The executor
reads only the plan — no discovery, no rule selection, no added tasks, no widened
scope.

1. Run `npx storybook-addon-designbook plan steps <path>`. It validates the
   plan's digest and returns the steps with each task's checkbox state. Choose a
   step with unfinished tasks in order. Completion: the next step is identified.
2. Load `plan instructions <path> --step <id>` once for that step. It returns the
   step's referenced context (resolved from the plan's registry) and each task's
   contract and params. Read the specified project code and input artifacts as
   needed; use the embedded context and fixed planning decisions. A missing
   structural or visual decision is a planning blockade, not permission to invent
   a target or rediscover context. A nonzero CLI exit is the diagnosis: stop with
   that exact message. Completion: the step's context and contracts are loaded.
3. Produce every unfinished task's outputs. Parallel work is limited to the tasks
   of this step. Completion: each task's outputs are ready for validation.
4. For each task, write one JSON result object matching its contract and run
   `plan done <path> --task <name> --data-file <result.json>`. When several tasks
   of a step share a name (e.g. `write-component` for header and footer), add
   `--title <title>` to select one; the CLI refuses an ambiguous name. Direct file
   outputs use their declared paths. The CLI validates the result against the
   task's frozen in-plan contract and, on success, ticks the checkbox and records
   the results. Completion: every task of the step is `done`.
5. A validation failure leaves the task open and reports the failing outputs.
   Correct the outputs and resubmit `plan done` for that task. If a concrete
   blockade persists after an attempted correction, stop and report it with the
   task name, the **exact why**, and the correction you attempted. Completion: the
   task is valid, or a resumable blockade is reported.
6. Select the next step with unfinished tasks and repeat until every task is done
   or one is blocked. Read `plan summary <path>` and report the outcome.
   Completion: all tasks are done, or execution has stopped at the blockade.

## Blockade contract

If intake or execution cannot proceed without inventing scope, expanding targets,
skipping approval, or adding undeclared tasks: **stop**. Report the exact reason
(missing approval, would need new component X, palette requires a cascade the
plan did not declare, digest/param failure, …). Wait for the user (standalone) or
return that blockade to GAIA (orchestrated). Do not silently widen the plan.

The executor must **not** add tasks, invent missing planning decisions, or expand
targets beyond the sealed plan. Discovery, context selection, adding tasks, and
follow-up planning belong to intake, never this loop. A verification intake may
receive a completed check's results and plan a separate repair after this
executor returns.

## Ephemeral plans

An ephemeral plan path is a full sealed plan under
`$DESIGNBOOK_DATA/plans/.ephemeral/`. Execute it with the same loop as a durable
plan. After successful completion or explicit abandon, delete the ephemeral plan
file after caller/tester inspection when scoring needs the sealed plan; result
artifacts (`vision.yml`, scene files, …) remain. Crash leftovers may be removed
later; they are not a resume handoff — interrupted ephemeral work re-intakes
(or the user switches to persist first).
