# Workflow CLI

These commands are the specification. Skill descriptions fire the skill; they
are not the command contract. A nonzero exit ends the work; report that exact
stderr/stdout. The matched [CLI surface](../workflow/rules/cli-surface.md)
rule owns that failure contract.

The CLI owns the plan: `intake` resolves the planning context, `plan build`
assembles + validates + seals the plan from an agent-authored task list, and the
`plan` execution commands validate against the saved MD plan. No catalogue, no
hand-written plan — the plan is the definition. Whether that sealed plan is
**durable** and whether a separate start runs **execute** are skill-level mode
decisions ([builder](workflow-building.md)); the CLI supplies the write path.

Planning: `intake <workflow> --palette` emits the lean palette an agent needs to
author a task list — per step the task names + each task's `params_schema`, the
`open_selectors` with their `gated` tasks, and `plans_dir` (the plans directory —
the exact file is only known once `plan build` also has `--name`). (The full
`intake <workflow>` also emits the embedded rule/blueprint bodies, task contracts
and `definitions`, but `plan build` reads those itself; the agent works from the
palette.) `plan build <workflow> --tasks tasks.json --name <text>` then validates
each task's params against its `params_schema` and that every required step is
covered, embeds each rule/blueprint/task body once, freezes contracts +
definitions, computes the digest (auto-sealed), and writes the
[MD plan](workflow-building.md) under a per-initiative folder inside `plans_dir`
(see the write-paths table below). It reports each unmet param or missing step
precisely.

### `plan build` write paths

| Invocation | Plan location | Notes |
|---|---|---|
| `plan build <wf> --tasks … --name <text>` | `$DESIGNBOOK_DATA/plans/<date>-<slug>/plan.md` | Default; use for **persist** (stop before execute). `--name` is required unless `--output`/`--ephemeral` is given; a same-day slug collision auto-suffixes (`-2`, `-3`, …), never overwrites |
| `plan build <wf> --tasks … --ephemeral` | `$DESIGNBOOK_DATA/plans/.ephemeral/<uuid>.md` | Same seal; `--format json` stdout includes `ephemeral: true` and `plan`; `--name` is ignored; does not write a durable folder |
| `plan build <wf> --tasks … --output <path>` | Caller path | Kept; `--output` wins over both `--name` and `--ephemeral` |

`--format text|json` applies to `plan build` and `plan tree`. Text is the
interactive default. `plan build` text contains the saved path and ends with the
composition tree. JSON is one parseable object: `{ ok, plan, steps, tasks, tree }`
plus `ephemeral: true` when `--ephemeral`. Callers that read the returned `plan`
path pass `--format json`. Do not mix trailing text into JSON stdout.

The JSON `plan` field is the single source of truth: every later command
(`plan done`/`steps`/`instructions`/`validate`/`summary`/`tree`) must be given that
exact returned path, never one reconstructed from `plans_dir`.

### `plan tree`

Two input forms, one renderer:

| Input | Command | Effect |
|---|---|---|
| JSON task list | `plan tree tasks.json --workflow <wf> [--config-dir <workspace>]` | Same build preparation as `plan build`, in memory; writes no plan file |
| Sealed Markdown plan | `plan tree <plan.md>` | Reads the sealed plan only; refuses a digest mismatch |

`--format json` returns the tree object. Default text is the deterministic
renderer. `plan build --format json` `.tree` equals `plan tree <plan> --format json`.

Ephemeral and durable builds share the same sealing and later `plan *` /
`execute-workflow` contract. Cleanup of ephemeral plan files after success or
abandon is the builder/executor's responsibility (see
[execution](workflow-execution.md)).

Execution (against the saved MD plan): `plan steps <path>` for the routing
overview, `plan instructions <path> --step <id>` for a step's referenced context
and task contracts, `plan done <path> --task <name> --data-file <json>` to
validate one task result against its frozen in-plan contract and record it, and
`plan validate <path>` to report obligations whose required task is absent.
`plan summary <path>` reports done/total. Persistent task defects are recorded in
the `problems.md` sidecar in the plan's per-initiative folder (see
[execution](workflow-execution.md)); the CLI checkbox state stays done/pending
only. Execution reads only the plan — no discovery, no flow construction.

`plan done` validates the result against the task's embedded output contract
(`$ref`s resolve against the plan's `definitions`) and refuses when the stored
digest no longer matches the plan. A mere "read" flag is not evidence; a missing
required output or obligation fails validation with its source.

### Reference approval helpers

Beside a published revision (`publication.json`), design planning that depends on
that revision must pass an approval gate before `plan build`:

- `reference approval-write --reference <dir> --status <pending|approved|rejected> --scope <json> [--note <text>]` — write/update `approval.yml`; fingerprint is sealed from the publication `files` map.
- `reference approval-check --reference <dir> --need <json>` — exit 0 only when status is `approved`, fingerprint still matches, and `approval.scope` covers the need (subjects/states; views/breakpoints when required). Nonzero exit / `{ ok: false, reason }` is the exact blockade message.

`extract-reference` closeout presents screenshots and records the decision; it
does not start design execute. See the [builder](workflow-building.md) for
ReferenceNeed + mode defaults.

Read the [builder](workflow-building.md) for modes and the plan format and the
[executor](workflow-execution.md) for the task loop.
