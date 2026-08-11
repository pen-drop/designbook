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

## Registering a build form

The scene branch dispatches on `ConfigNameUnit.build_form`; `layout-builder` and `canvas` ship built in. A project skill registers a further form by widening that closed enum from its own rule/blueprint `extends:` frontmatter and shipping the blueprint that expands it (matched by `trigger.config_name`) — no addon or plugin-cache edit. See [`../../../designbook-skill-creator/resources/schema-composition.md`](../../../designbook-skill-creator/resources/schema-composition.md) › *Widening a Closed Enum*.
