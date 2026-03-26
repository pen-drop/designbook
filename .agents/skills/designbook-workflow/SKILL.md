
---
name: designbook-workflow
description: Manages workflow task tracking via CLI commands. Stage-based: reads stages from workflow frontmatter, discovers task files per stage, executes with validate + done per task. Ensure to create ALWAYS a workflow if any debo-* workflow or designbook skills are used. Do NOT load or create workflows for opsx-* or openspec-* workflows — those manage their own artifact lifecycle independently.
---

## Rules

> ⛔ **Read `resources/workflow-execution.md` immediately upon loading this skill.** It contains the binding execution rules (Rules 0–7) for all `debo-*` workflows. No stage may start before these rules are loaded.

> ⛔ **Never load or apply this skill for `opsx-*` or `openspec-*` workflows.** Those workflows manage their own artifact lifecycle (changes, specs, archives) and must not be wrapped in a designbook workflow.

> ⛔ **OpenSpec spec files are forbidden inputs.** Never read change files, delta specs, or main specs (`.agents/changes/`, OpenSpec paths) inside a `debo-*` workflow. Task context comes only from `.agents/skills/*/tasks/` and `.agents/skills/*/rules/`.

## Resources

- [workflow-execution.md](resources/workflow-execution.md) — AI execution rules (Rules 0–6, before/after hooks)
- [cli-reference.md](resources/cli-reference.md) — CLI commands
- [task-format.md](resources/task-format.md) — Task JSON format, tasks.yml format, directory structure, hook frontmatter
- [architecture.md](resources/architecture.md) — Stage-based architecture, task/rule file formats, Storybook integration
