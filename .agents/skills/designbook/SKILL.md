---
name: debo
disable-model-invocation: true
argument-hint: "[vision|tokens|data-model|design-component|design-screen|design-shell|design-guidelines|design-test|sections|shape-section|sample-data|css-generate]"
description: >
  Designbook design system. Use when the user wants to create or design
  anything. Sub-commands: vision, tokens, data-model, design-component,
  design-screen, design-shell, design-guidelines, design-test, sections,
  shape-section, sample-data, css-generate.
---

## Rules

> ⛔ **Read `resources/workflow-execution.md` immediately upon loading this skill.** It contains the binding execution rules (Rules 0–7) for all `debo` workflows. No stage may start before these rules are loaded.

> ⛔ **Never load or apply this skill for `opsx-*` or `openspec-*` workflows.** Those workflows manage their own artifact lifecycle (changes, specs, archives) and must not be wrapped in a designbook workflow.

> ⛔ **OpenSpec spec files are forbidden inputs.** Never read change files, delta specs, or main specs (`.agents/changes/`, OpenSpec paths) inside a `debo` workflow. Task context comes only from `.agents/skills/*/tasks/` and `.agents/skills/*/rules/`.

## Dispatch

Sub-command: **$ARGUMENTS[0]**

**If `$ARGUMENTS[0]` is a known sub-command**, directly load and execute `<concern>/workflows/$0.md` — no scanning, no matching.

**If `$ARGUMENTS[0]` is an unknown or fuzzy argument**, or when user intent matches the design system domain:

1. Scan `**/workflows/*.md` within this skill for all `description` fields
2. Match `$ARGUMENTS` against each `description`
3. Dispatch to the closest matching workflow

**If `$ARGUMENTS[0]` is empty** (no argument given):

1. Scan `**/workflows/*.md` within this skill for all `title` and `description` fields
2. **Immediately output** a numbered list — do not ask first:
   ```
   Available workflows:
   1. <title> — <description>
   2. …
   ```
3. Invite the user to pick a number or type a sub-command

## Resources

- [workflow-execution.md](resources/workflow-execution.md) — AI execution rules (Rules 0–6, before/after hooks)
- [cli-reference.md](resources/cli-reference.md) — CLI commands
- [task-format.md](resources/task-format.md) — Task JSON format, tasks.yml format, directory structure, hook frontmatter
- [architecture.md](resources/architecture.md) — Stage-based architecture, task/rule file formats, Storybook integration
