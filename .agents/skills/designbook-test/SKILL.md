---
name: debo-test
user-invocable: true
argument-hint: "<subcommand> <suite> <case>"
subcommands:
  run:
    hint: "<suite> [<case>]"
    description: Set up a test workspace and run a workflow case
  research:
    hint: "<suite> <case> [--train-cases <a,b>] [--val-cases <x,y>] [--iterations N] [--target T] [--plateau M] [--baseline-only] [--scope <glob>] [--metric <jsonata>] [--direction min|max]"
    description: Autonomous skill-improvement loop with train/val split; --baseline-only for a single audit pass
  is-clear:
    hint: "<workflow> <task> <question>"
    description: Audit whether a specific question is answered by the loaded rules, blueprints, and schema of a workflow task. Suggests rule, schema, or task-body changes when the answer is missing.
description: >
  Test workspace runner and autonomous research loop for designbook workflows.
  Use for manual testing with pre-built fixture data, or for iterative skill improvement.
metadata:
  internal: true
---

## Dispatch

Parse `$ARGUMENTS` as: `<subcommand> <suite> [<case>] [options]`

| Subcommand | Signature | Description |
|---|---|---|
| `run` | `<suite> [<case>]` | Set up workspace and run a test case |
| `research` | `<suite> <case> [options]` | Autonomous improvement loop |
| `is-clear` | `<workflow> <task> <question>` | Read-only clarity audit against a workflow's plan |

Unknown subcommand → print available subcommands and stop.

---

## run

Load `workflows/run.md` and follow it.

---

## research

Parse from `$ARGUMENTS` (after `research <suite> <case>`):
- `--train-cases <a,b,...>` (comma-separated; train set = `[<case>] + these`, deduped)
- `--val-cases <x,y,...>` (comma-separated held-out gate set; default empty = single-set behaviour)
- `--iterations N` (default 25)
- `--target T` (default 100)
- `--plateau M` (default 5)
- `--baseline-only` — single audit pass (iteration 0 only); equivalent to `--iterations 0`
- `--scope <glob>` (comma-separated)
- `--metric <jsonata>` — decision metric expression; default = case yaml `metric:` field, fallback `flowRate`
- `--direction min|max` — metric direction; default = case yaml `direction:` field, fallback `max`

If `<case>` is missing: error "research requires a case", list available cases, stop.

Load `workflows/research.md` and follow it.

---

## is-clear

Parse `$ARGUMENTS` after `is-clear` as: `<workflow> <task>` followed by everything remaining as `<question>` (no quoting required; rest-of-line is the question).

Load `workflows/is-clear.md` and follow it.

---

## Error Handling

- If `fixtures/<suite>/` does not exist: list available suites from `fixtures/`
- If `fixtures/<suite>/cases/<case>.yaml` does not exist: list available cases
- If `setup-test.sh` fails: show the error and stop
