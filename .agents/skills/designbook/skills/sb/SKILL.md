---
name: sb
description: >
  Start, stop, restart, or inspect the Storybook dev server. Use when the user
  wants to manage the Storybook server for a designbook project.
---

# Storybook Management

**Workflow ID:** `sb` — `track: false`: a CLI passthrough, **not** a tracked `workflow create`.

> ⛔ **Load [`../../resources/workflow-execution.md`](../../resources/workflow-execution.md)** for the engine model and [`../../resources/cli-storybook.md`](../../resources/cli-storybook.md) for the Storybook CLI reference.

Unlike the tracked workflows, `sb` does not call `_debo workflow create`. It dispatches directly to the Storybook CLI.

## Global Flags

The tracked-workflow flags (`--optimize`, `--plan`, `--from-plan`) do not apply to this CLI passthrough. Only the sub-command in `$ARGUMENTS[1]` is consulted.

## Dispatch

Map `$ARGUMENTS[1]` to the corresponding CLI command. If no argument is given, run `status`.

| Argument | CLI Command | Description |
|----------|------------|-------------|
| `start` | `_debo storybook start` | Start Storybook as daemon, wait until ready |
| `stop` | `_debo storybook stop` | Stop running Storybook |
| `restart` | `_debo storybook restart` | Stop + start |
| `status` | `_debo storybook status` | Check if Storybook is running |
| `logs` | `_debo storybook logs` | Print Storybook log output |
