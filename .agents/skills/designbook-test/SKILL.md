---
name: debo-test
user-invocable: true
argument-hint: "[run|verify|research|is-clear|experiment] …"
description: >
  Test Designbook workflows with fresh fixture workspaces, saved-document execution,
  research scoring, a read-only planning clarity audit, or experiment report/judge
  flows. Use when testing a Designbook workflow, comparing Task/Rule changes, or
  improving agent-facing instructions.
metadata:
  internal: true
---

Choose the matching testing sub-skill:

| Command | Sub-skill | Purpose |
|---|---|---|
| `run` | [skills/run/](skills/run/SKILL.md) | Run one fixture case through Promptfoo |
| `verify` | [skills/verify/](skills/verify/SKILL.md) | Verify a run’s actual design through Promptfoo |
| `research` | [skills/research/](skills/research/SKILL.md) | Improve instructions using Promptfoo evaluations |
| `is-clear` | [skills/is-clear/](skills/is-clear/SKILL.md) | Audit whether a planning catalogue answers a question |
| `experiment` | [skills/experiment/](skills/experiment/SKILL.md) | Validate manifests, comparison reports, human judge |

Shared resources:

- [audit criteria](resources/audit-criteria.md) — file-level research audit
- [run procedure](skills/run/resources/run.md) — shared Promptfoo execution and quality gates

Unknown commands stop with the available sub-skills. Each sub-skill owns its
arguments and detailed procedure; this index only routes the request.
