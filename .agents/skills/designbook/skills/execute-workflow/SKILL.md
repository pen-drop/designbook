---
name: execute-workflow
user-invocable: true
description: >
  Execute or resume a saved Designbook workflow document. Use when an intake
  supplies a complete workflow path. Drive it with `workflow steps`,
  `workflow instructions`, `workflow start` and `workflow done`. Do not use
  to plan targets or discover task rules.
---

Follow the [executor](../../resources/workflow-execution.md) with the supplied
document path. Run `workflow steps`, `workflow instructions --step`, then
`workflow start|done` from that loop.
