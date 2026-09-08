# Workflow CLI

These commands are the specification. A nonzero exit ends the work; report that
exact stderr/stdout. The matched [CLI surface](../workflow/rules/cli-surface.md)
rule owns that failure contract.

Planning: `workflow discover <id>` is the intake catalogue. Optional `--step <id>` resolves one step from the workflow file. Then `workflow schema`, `workflow validate <definition.yml> --catalogue <catalogue.json>`, `workflow create <definition.yml> --catalogue <catalogue.json> --output <path>`.

Runtime: `workflow steps <path>`, `workflow instructions <path> --step <id> --format md`, `workflow start <path> --step <id>`, `workflow done <path> --step <id> --data-file <json>`, `workflow block <path> --step <id> --reason <text> --correction <action>`, `workflow summary <path>`.

Read the [builder](workflow-building.md) for definition fields and the [executor](workflow-execution.md) for task processing.


Execution uses `workflow steps <path>` for a compact routing overview and
`workflow instructions <path> --step <id> --format md` for all tasks of that step.
`workflow start|done|block <path> --step <id>` operates on the complete batch.
For `done`, `--data-file` contains an object keyed by every task ID of the step;
values are per-task output objects. Every result must pass before any task in
the batch is marked done. Lifecycle replies contain only the status overview.

Human inspection: `workflow read <path> --format md` prints the full saved plan
as Markdown with stable internal links and each shared body once. This export contains only the fixed definition, without execution state or resolved predecessor results; the default JSON format exposes the full saved document. Execution does not load this full export.
