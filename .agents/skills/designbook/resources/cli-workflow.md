# Workflow CLI

These commands are the specification. Skill descriptions fire the skill; they
are not the command contract. A nonzero exit ends the work; report that exact
stderr/stdout. The matched [CLI surface](../workflow/rules/cli-surface.md)
rule owns that failure contract.

The CLI owns the plan: `intake` resolves the planning context, `plan build`
assembles + validates + seals the plan from an agent-authored task list, and the
`plan` execution commands validate against the saved MD plan. No catalogue, no
hand-written plan — the plan is the definition.

Planning: `intake <workflow> --palette` emits the lean palette an agent needs to
author a task list — per step the task names + each task's `params_schema`, the
`open_selectors` with their `gated` tasks, and the canonical `plan_path`. (The
full `intake <workflow>` also emits the embedded rule/blueprint bodies, task
contracts and `definitions`, but `plan build` reads those itself; the agent works
from the palette.) `plan build <workflow> --tasks tasks.json` then validates each
task's params against its `params_schema` and that every required step is covered,
embeds each rule/blueprint/task body once, freezes contracts + definitions,
computes the digest (auto-sealed), and writes the [MD plan](workflow-building.md)
to `plan_path`. It reports each unmet param or missing step precisely.

Execution (against the saved MD plan): `plan steps <path>` for the routing
overview, `plan instructions <path> --step <id>` for a step's referenced context
and task contracts, `plan done <path> --task <name> --data-file <json>` to
validate one task result against its frozen in-plan contract and record it, and
`plan validate <path>` to report obligations whose required task is absent.
`plan summary <path>` reports done/total. Execution reads only the plan — no
discovery, no flow construction.

`plan done` validates the result against the task's embedded output contract
(`$ref`s resolve against the plan's `definitions`) and refuses when the stored
digest no longer matches the plan. A mere "read" flag is not evidence; a missing
required output or obligation fails validation with its source.

Read the [builder](workflow-building.md) for the plan format and the
[executor](workflow-execution.md) for the task loop.
