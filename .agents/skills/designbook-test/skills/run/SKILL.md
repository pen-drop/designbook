---
name: debo-test-run
user-invocable: true
description: Set up a fresh fixture workspace and execute one Designbook case from a saved workflow document.
metadata:
  internal: true
---

Parse `run <suite> [<case>] [--workspace <path>] [--validate <workflow>] [--provider codex|claude] [--model <id>]` and follow [run procedure](resources/run.md).

All workflow execution uses Promptfoo. The procedure owns workspace isolation,
mandatory visual verification for design-shell, design-entity and design-screen,
evidence auditing and reporting.
