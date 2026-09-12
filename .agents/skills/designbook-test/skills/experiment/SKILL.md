---
name: debo-test-experiment
user-invocable: true
description: >
  Validate experiment manifests, render Markdown comparison reports, and record
  human optical judgments for Designbook Task/Rule experiments.
metadata:
  internal: true
---

Parse `experiment <validate|report|judge> …` and follow
[experiment procedure](resources/experiment.md).

| Subcommand | Purpose |
|---|---|
| `validate <path>` | Validate `experiment.yml` (schema_version 1) |
| `report <experiment-id>` | Write/update `docs/experiments/<id>/comparison.md` |
| `judge <evidence-run> …` | Write `judgment.yml` for human optical design judgment |

This sub-skill owns the experiment **contract surface** (manifest, report, judge).
Case execution remains `run` / `verify` / `research`. Reference approval modes are
`interactive` | `recorded` | `simulated` — only interactive is real human approval;
never promote simulated/recorded to optical human judgment.
