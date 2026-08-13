---
name: sync-to
description: >
  Export a filtered subset of the data model as Drupal config YAML into the config-sync directory. Use when the user wants to sync or export the data model to Drupal config.
---

# Sync to Drupal

**Workflow ID:** `sync-to`

> ⛔ **Load [`../../resources/workflow-execution.md`](../../resources/workflow-execution.md) immediately upon loading this skill.** It holds the binding execution rules (Rules 0–7) for every `debo` workflow — no stage may start before they are loaded.

> ⛔ **Spec/change files are forbidden inputs.** Task context comes only from `.agents/skills/**/tasks/`, `.agents/skills/**/rules/`, and `.agents/skills/**/blueprints/`.

## Global Flags

Parse `--optimize`, `--plan`, and `--from-plan <name|hint>` from `$ARGUMENTS` before starting. Flags are not sub-commands and do not change workflow selection; multiple may be combined. `--from-plan` consumes the value immediately following it. See the parent index [`../../SKILL.md`](../../SKILL.md) → Global Flags and `workflow-execution.md` § 10 for their exact effects.

## Start

```bash
_debo workflow create --workflow sync-to
```

Handle the create response and enter the task loop as described in [`../../resources/workflow-execution.md`](../../resources/workflow-execution.md).
