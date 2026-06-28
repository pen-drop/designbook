# Training Designbook skills

Designbook ships an autonomous loop that **improves the skill files themselves** —
not the model. It is text-space gradient descent: the "weights" are the skill
`.md`/`.yml` files, a workflow run is the forward pass, `design-verify` is the loss,
and a subagent proposes edits as the gradient step. The approach mirrors Microsoft's
[SkillOpt](https://github.com/microsoft/SkillOpt); it is implemented as the
`debo-test research` subcommand and needs no extra tooling.

> Internal tooling. The `debo-test` skill is `metadata.internal: true` — it is for
> developing the design skills, not for end users.

## The analogy

| Neural-net training | Designbook training |
|---|---|
| weights | the skill files in `scope.txt` (tasks, blueprints, addon `src/**`) |
| forward pass | a workflow run (e.g. `design-entity`) producing artifacts |
| loss function | `design-verify` score-report (visual diff vs a design reference) |
| optimizer | a subagent that reads the audit + logs and proposes **one** diff |
| gradient step | that diff applied to a scope file |
| mini-batch | mean score across the **train** case-set |
| validation gate | keep the edit only if a **held-out val** case-set also improves |
| epochs | the iteration cap |

The point: an edit that lowers the loss on one fixture by overfitting it will not
improve the held-out val set, so the gate discards it. Only changes that generalise
survive.

## The loop, step by step

For a run `debo-test research <suite> <case> [--val-cases …]`:

1. **Setup** — build a fresh workspace, start Storybook, tag a **case-agnostic**
   `workspace-baseline` (before any fixtures are layered), resolve the train and val
   case-sets.
2. **Iteration 0 (baseline)** — score the train set and the val set. A "score" =
   run each case's prompt, then `workflow summary --metric <jsonata>`; the set score
   is the mean over its cases (mini-batch).
3. **Iteration N**
   1. Dispatch the optimizer subagent. It sees **only the train set's** audits, logs,
      and score history, and must return one minimal unified diff touching one file
      from `scope.txt`.
   2. Apply the diff (scope-checked with `git apply --check`).
   3. Re-score the train set (each case resets the workspace to baseline, re-layers
      its own fixtures, runs, scores — so cases never contaminate each other).
   4. **Gate:** if a val set is configured, score it **only when train improved**, and
      keep the edit only if the val mean improves per `direction`. With no val set the
      gate is the train score (single-set mode).
   4. Commit on keep, `git restore` on discard, retry-then-block on crash.
4. **Termination** — stop on target reached, iteration cap, or plateau (N
   non-keep iterations in a row). Workspace + Storybook are left running for inspection.

## The metric

Each case yaml declares what to optimize:

```yaml
metric: after.`design-verify`.`score-report`.first_shot.score
direction: min        # visual diff: lower is better
```

`metric` is a JSONata expression over the `workflow summary` JSON (backtick-quote path
segments with dashes). `direction` is `min` (lower-is-better) or `max`. The same metric
and direction apply to every case in the train and val sets — mixing per-case metrics
would make the mean meaningless.

## Running it

```bash
# Single-set (no held-out gate — fast, overfit-prone):
debo-test research <suite> <case>

# Train/val split (the SkillOpt mode — keep only on held-out improvement):
debo-test research <suite> <case> \
  --train-cases caseA,caseB \
  --val-cases   caseC,caseD \
  --iterations 25 --target 95 --plateau 5

# Just measure today's baseline, change nothing:
debo-test research <suite> <case> --baseline-only
```

Key flags (full list in `debo-test/SKILL.md`):

| Flag | Meaning |
|---|---|
| `--train-cases a,b` | extra train cases; train set = `[<case>] + these` |
| `--val-cases x,y` | held-out gate set (default empty = single-set mode) |
| `--scope <glob,…>` | which files the optimizer may edit |
| `--metric <jsonata>` / `--direction min\|max` | override the case yaml |
| `--iterations` / `--target` / `--plateau` | stop conditions |

Train and val sets must be **disjoint**.

## Reading the results

Each run writes `research-runs/<slug>/`:

- `score-history.tsv` — one row per iteration: `iter, hypothesis, train, val, gate, delta, decision`.
- `iterations/<N>/hypothesis.md` + `proposed.patch` — what the optimizer tried.
- `iterations/<N>/cases/<case>/` — per-case `summary.json`, `audit.md`, `log-digest.json`.
- `overview.md` — config, baseline vs best train/val, kept hypotheses.

Kept hypotheses are real commits on the repo (`experiment: <headline>`); review them
before keeping or squashing.

## When to use which mode

- **Single-set** — quick iteration on one fixture; accept that wins may not generalise.
- **Train/val split** — the real training mode. Use 2+ train and 2+ val cases so the
  mean is not dominated by one noisy visual diff, and so the gate actually proves
  generalisation.

## See also

- `debo-test/SKILL.md` — subcommands and flag parsing
- `debo-test/workflows/research.md` — the authoritative loop spec
- `debo-test/resources/audit-criteria.md` — the per-case audit table
- `designbook/design/workflows/design-verify.md` — the loss (visual measurement)
