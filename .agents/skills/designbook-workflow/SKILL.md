
---
name: designbook-workflow
description: Manages workflow task tracking via CLI commands. Stage-based: reads stages from workflow frontmatter, discovers task files per stage, executes with validate + done per task. Ensure to create ALWAYS a workflow if any debo-* workflow or designbook skills are used.
---

# Designbook Workflow Tracking

Tracks AI workflow progress via CLI commands. Storybook's panel polls these files and shows notifications on task completion.

## Task Types

| Type | Used for |
|------|----------|
| `component` | Creating/updating UI components |
| `scene` | Creating/updating scenes.yml |
| `data` | Creating/updating data.yml, vision.md, etc. |
| `tokens` | Creating/updating design tokens |
| `view-mode` | Creating/updating view mode mappings |
| `css` | Generating CSS token files |
| `validation` | Running validation commands |

## Rules

> ⛔ **Read `rules/workflow-execution.md` immediately upon loading this skill.** It contains the binding execution rules (Rules 0–7) for all `debo-*` workflows. No stage may start before these rules are loaded.

- [workflow-execution.md](rules/workflow-execution.md) — AI execution rules (Rules 0–6, before/after hooks)

## Resources

- [cli-reference.md](resources/cli-reference.md) — CLI commands + `--loaded` JSON shape
- [task-format.md](resources/task-format.md) — Task JSON format, tasks.yml format, directory structure, hook frontmatter
- [architecture.md](resources/architecture.md) — Stage-based architecture, task/rule file formats, Storybook integration
