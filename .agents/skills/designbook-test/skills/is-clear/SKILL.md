---
name: debo-test-is-clear
user-invocable: true
description: Audit whether a Designbook planning catalogue explicitly answers a task question.
metadata:
  internal: true
---

Parse `is-clear <workflow> <task> <question>` and follow [clarity audit](resources/is-clear.md).

This sub-skill is read-only. It inspects the output of `workflow discover` and
never creates or executes a saved workflow.
