---
name: debo-test
user-invocable: true
argument-hint: "[run|research|is-clear] <suite> [<case>] [--workspace <path>]"
description: >
  Test Designbook workflows with fresh fixture workspaces, saved-document execution,
  research scoring, or a read-only planning clarity audit. Use when testing a
  Designbook workflow or improving its agent-facing instructions.
metadata:
  internal: true
---

Choose the matching testing sub-skill:

| Command | Sub-skill | Purpose |
|---|---|---|
| `run` | [skills/run/](skills/run/SKILL.md) | Execute one fixture case in a fresh workspace |
| `research` | [skills/research/](skills/research/SKILL.md) | Run the bounded skill-improvement loop |
| `is-clear` | [skills/is-clear/](skills/is-clear/SKILL.md) | Audit whether a planning catalogue answers a question |

Shared resources:

- [audit criteria](resources/audit-criteria.md) — file-level research audit
- [eval scorer](resources/eval-score.mjs) — saved-workflow summary and case assertions

Unknown commands stop with the available sub-skills. Each sub-skill owns its
arguments and detailed procedure; this index only routes the request.
