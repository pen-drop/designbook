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
   structural or visual decision is a planning defect to record (see Problems
   contract), not permission to invent a target or rediscover context. A nonzero
   CLI exit that prevents reading the plan or submitting any `plan done` is
   infrastructure failure: stop with that exact message. Completion: the step's
   context and contracts are loaded.
3. Produce every unfinished task's outputs. Parallel work is limited to the tasks
   of this step. Completion: each task's outputs are ready for validation.
4. For each task, write one JSON result object matching its contract and run
   `plan done <path> --task <name> --data-file <result.json>`. When several tasks
   of a step share a name (e.g. `write-component` for header and footer), add
   `--title <title>` to select one; the CLI refuses an ambiguous name. Direct file
   outputs use their declared paths. The CLI validates the result against the
   task's frozen in-plan contract and, on success, ticks the checkbox and records
   the results. Completion: every task of the step is `done`, or unfinished tasks
   are accounted for in the problems log.
5. A validation failure leaves the task open and reports the failing outputs.
   Attempt an in-scope correction (same task, sealed params and contracts only)
   and resubmit `plan done`. If the defect persists, or fixing it would require
   inventing scope, expanding targets, skipping approval, editing the sealed
   plan, or adding undeclared tasks: append one entry to the problems sidecar
   (Problems contract), leave the checkbox pending, and continue with the next
   unfinished task. Completion: the task is `done`, or it is logged and skipped
   for the remainder of this run.
6. Select the next step with unfinished tasks and repeat until every task is
   either `done` or recorded in the problems sidecar. Read `plan summary <path>`
   and report the outcome together with the problems file path and entry count.
   Completion: the loop has exhausted the plan; success means every task is
   `done` and the problems file is absent or empty.

## Problems contract

Unresolved task defects live in a **problems sidecar beside the plan**, not in
the sealed plan body (run state stays checkbox-only).

**Path:** same directory as the plan; replace a trailing `.plan.md` with
`.problems.md` (e.g. `design-shell.plan.md` → `design-shell.problems.md`). Create
the file on the first entry; append thereafter.

**Each entry** records: ISO-8601 time, step name, task name, task title, the
**exact why**, and the in-scope correction attempted (or that none was possible
inside the sealed plan). Prefer a single Markdown table:

```markdown
# Execution problems — <workflow>

| When | Step | Task | Title | Why | Attempted correction |
|---|---|---|---|---|---|
| 2026-09-11T21:50:00Z | validate | validate | Shell xl | … | … |
```

The executor must keep the sealed plan definition intact: no added tasks, no
invented planning decisions, no expanded targets, no skipped approval. Discovery
and follow-up planning belong to a new intake. A verification intake may consume
`plan summary` plus this problems file and plan a separate repair afterward.

Silent fallbacks that would mark a failing check as passed (e.g. shipping an
unavailable font as success) remain forbidden — log the defect and leave the
task pending.

## Ephemeral plans

An ephemeral plan path is a full sealed plan under
`$DESIGNBOOK_DATA/plans/.ephemeral/`. Execute it with the same loop as a durable
plan. After successful completion or explicit abandon, delete the ephemeral plan
file after caller/tester inspection when scoring needs the sealed plan; result
artifacts (`vision.yml`, scene files, …) and any sibling `.problems.md` remain
for inspection when useful. Crash leftovers may be removed later; they are not a
resume handoff — interrupted ephemeral work re-intakes (or the user switches to
persist first).
