---
title: Storybook Management
description: Start, stop, restart, or inspect the Storybook dev server
track: false
---

## Commands

| Argument | CLI Command | Description |
|----------|------------|-------------|
| `start` | `_debo storybook start` | Start Storybook as daemon, wait until ready |
| `stop` | `_debo storybook stop` | Stop running Storybook |
| `restart` | `_debo storybook restart` | Stop + start |
| `status` | `_debo storybook status` | Check if Storybook is running |
| `logs` | `_debo storybook logs` | Print Storybook log output |

## Dispatch

Map `$ARGUMENTS[1]` to the corresponding CLI command. If no argument given, run `status`.
