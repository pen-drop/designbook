# Experiments

Versioned **experiment / evaluation contract** for comparing a single Task or Rule
change across quality, flow, tokens, time, and tool calls (DESIGNBOOK-62).

## Layout

```
docs/experiments/<experiment-id>/
  experiment.yml     # committed contract (schema_version: 1)
  comparison.md      # committed Markdown report (CLI-generated)
  runs.json          # optional committed/local run summaries for report

promptfoo/evidence/<experiment-id>/<run-id>/   # gitignored durable proof
  envelope.yml
  native/
  screenshots/
  tool-ledger.jsonl
  phases/
  evaluations.yml
  judgment.yml
  approval-provenance.yml
```

Workspace cleanup under `promptfoo/workspaces/` must **never** delete
`promptfoo/evidence/`.

## Authoring `experiment.yml`

Required fields:

- `schema_version: 1`
- `id`, `ticket` (e.g. `DESIGNBOOK-62`)
- `primary_key.branch` + `primary_key.experiment` (primary identity)
- `baseline.commit` and `candidate.commit`
- `harness.commit` (tester/promptfoo/schema — separate from product commits)

See `_fixtures/minimal/experiment.yml` for a minimal valid stub, and
`_fixtures/task-change/` / `_fixtures/rule-change/` for representative shapes.

Joint Task+Rule edits must set `affected.note` and only claim joint-change
effects.

## CLI

```bash
# Validate a manifest
node promptfoo/scripts/experiment-cli.mjs validate docs/experiments/<id>/experiment.yml

# Render/update comparison.md (reads optional runs.json beside experiment.yml)
node promptfoo/scripts/experiment-cli.mjs report <experiment-id>

# Record human optical judgment into an evidence run
node promptfoo/scripts/experiment-cli.mjs judge <evidence-run> \
  --result <result.png> --reference <reference.png> \
  --status pass|fail|unclear|rejected \
  --criteria "layout parity" [--blind] [--rationale "..."]
```

Via designbook-test: `debo-test experiment validate|report|judge …`.

## Evaluation levels

1. **Static** — files/schemas/refs present and valid  
2. **Flow** — completion shape, failures, corrections, blocks, budgets  
3. **Optical** — `design-verify` ⊥ human `judgment.yml` (independent channels)

`final_positive` is true only when required channels allow. For visual cases,
human optical `pending` or `rejected` keeps `final_positive` false.

## Reference approval modes

`interactive` | `recorded` | `simulated`

Only **interactive** (attended ask→answer) counts as real human **reference**
approval. Simulated/recorded must never be promoted to human optical design
judgment.

## Measurement rules (short)

- Missing usage → `unknown`, never coerce to `0`
- Do not double-count cache/reasoning into totals that already include them
- Publish parallel **elapsed** and **summed active** distinctly
- Count top-level tool calls only
- Planned reference-approval tool calls are ledgered but excluded from flow disturbance
- Early abort / skipped verify ≠ token savings improvement

## Contract tests

```bash
node --test promptfoo/tests/experiment-*.test.mjs
pnpm check
```

Acceptance criteria AC-1…AC-11 are covered by the Spec plus these modules/tests
(schema, envelope/`final_positive`, usage/tool ledger, evidence store, approval
provenance, report/judge CLI, Task/Rule fixtures, attended interactive checklist
in the `debo-test experiment` skill).
