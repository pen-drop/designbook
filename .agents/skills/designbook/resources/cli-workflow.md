# Workflow CLI

These commands are the specification. Skill descriptions fire the skill; they
are not the command contract. A nonzero exit ends the work; report that exact
stderr/stdout. The matched [CLI surface](../workflow/rules/cli-surface.md)
rule owns that failure contract.

The CLI has two roles: `intake` resolves the planning context; the `plan`
commands validate execution against the saved MD plan. No catalogue, no
YAML-definition writer — the plan is the definition.

Planning: `intake <workflow>` emits the config-filtered planning context as JSON —
the intake rules and blueprints (canonical body embedded, with `source`
provenance), the per-step task palette with frozen output contracts, the
`definitions` those contracts reference (pulled from `schemas.yml`), each step's
`context` key references with a `read_order`, and any `open_selectors` with their
`gated` candidate groups. The intake skill reads this, resolves the open
selectors, and writes the [MD plan](workflow-building.md).

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
