# Workflow CLI

Planning: `workflow discover <template>`, `workflow schema`, `workflow validate <definition.yml>`, `workflow create <definition.yml> --output <path>`.

Runtime: `workflow read <path>`, `workflow instructions <path> --task <id>`, `workflow start <path> --task <id>`, `workflow done <path> --task <id> --data-file <json>`, `workflow block <path> --task <id> --reason <text> --correction <action>`, `workflow summary <path> --json`.

Read the [builder](workflow-building.md) for definition fields and the [executor](workflow-execution.md) for task processing.
