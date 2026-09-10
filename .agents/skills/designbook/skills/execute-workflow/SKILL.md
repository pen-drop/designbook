---
name: execute-workflow
user-invocable: true
description: >
  Execute or resume a saved Designbook workflow plan. Use when an intake
  supplies a complete MD plan path. Drive it with `plan steps`,
  `plan instructions`, and `plan done`. Do not use to plan targets or
  discover task rules.
---

Follow the [executor](../../resources/workflow-execution.md) with the supplied
plan path. Run `plan steps`, `plan instructions --step`, then `plan done --task`
from that loop.
