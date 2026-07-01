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
| trajectory | the driver's `friction` log — where it guessed or hit ambiguous/contradictory skill prose |
| optimizer | a subagent that reads the audit + logs + friction and proposes **one** diff |
| gradient step | that diff applied to a scope file |
| mini-batch | mean score across the **held-out val** case-set |
| validation gate | keep the edit only if that **val** mean also improves |
| epochs | the iteration cap |

The point: an edit that lowers the loss on one fixture by overfitting it will not
improve the held-out val set, so the gate discards it. Only changes that generalise
survive.

## The loop, step by step

For a run `debo-test research <suite> <case> [--val-cases …]`:

1. **Setup** — build a fresh workspace, start Storybook, tag a **case-agnostic**
   `workspace-baseline` (before any fixtures are layered), resolve the train case and
   the val set.
2. **Iteration 0 (baseline)** — score the train case and the val set. A "score" =
   run a case's prompt, then `workflow summary --metric <jsonata>`; the val-set score
   is the mean over its cases (mini-batch). Each case run is driven by its own
   **autonomous subagent** (keeps the loop's context clean and bounds each run). Runs
   never have a user: if a case cannot be answered from its prompt + fixtures, the run
   fails (counts as a crash) rather than stalling — that signals a fixture defect.
3. **Iteration N**
   1. Dispatch the optimizer subagent. It sees **only the train case's** audit, logs,
      friction, and the score history, and must return one minimal unified diff
      touching one file from `scope.txt`.
   2. Apply the diff (scope-checked with `git apply --check`).
   3. Re-score the train case (resets the workspace to baseline, re-layers fixtures,
      runs, scores — so runs never contaminate each other).
   4. **Gate:** if a val set is configured, score it **only when the train score improved**,
      and keep the edit only if the val mean improves per `direction`. With no val set
      the gate is the train score itself.
   5. Commit on keep, `git restore` on discard, retry-then-block on crash.
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
and direction apply to the train case and every val case — mixing per-case metrics
would make the val mean meaningless.

## Running it

```bash
# No held-out gate — fast, overfit-prone (keep decided on the train case itself):
debo-test research <suite> <case>

# Held-out val gate (the SkillOpt mode — keep only on held-out improvement):
debo-test research <suite> <case> \
  --val-cases caseC,caseD \
  --iterations 25 --target 95 --plateau 5

# Just measure today's baseline, change nothing:
debo-test research <suite> <case> --baseline-only
```

Key flags (full list in `debo-test/SKILL.md`):

The positional `<case>` is the **train case** — the one the optimizer optimizes on,
and the source of the default metric/direction and the run slug. There is no separate
train-set flag; train is always exactly that one case.

| Flag | Default | What it does | Example |
|---|---|---|---|
| `--val-cases` | empty | The **held-out** cases used only to decide keep/discard. The optimizer never sees them, and the gate score is their mean (mini-batch). Empty = no separate gate: keep is decided on the train score itself (overfit-prone). `<case>` may not appear here. | `--val-cases hero,footer` |
| `--scope` | files from `tasks.yml` + addon `src/**` | The allow-list of files the optimizer may edit. A proposed diff touching anything outside this is rejected before it runs. Narrow it to focus the search on one area. | `--scope ".agents/skills/designbook/design/blueprints/**"` |
| `--metric` | the case yaml `metric:` field | A JSONata expression picking the number to optimize out of the `workflow summary` JSON. Overrides the yaml. | `--metric "after.\`design-verify\`.\`score-report\`.first_shot.score"` |
| `--direction` | the case yaml `direction:` field | `min` = lower score is better (visual diff), `max` = higher is better (flow-rate %). | `--direction min` |
| `--iterations` | 25 | Hard cap on loop iterations (= max edits tried). | `--iterations 40` |
| `--target` | 100 | Stop early once the best score reaches this (interpreted per `--direction`: `max` → ≥ target, `min` → ≤ target). | `--target 95` |
| `--plateau` | 5 | Stop early if this many iterations in a row are all non-keep (no progress). | `--plateau 8` |

**Train vs val in one line:** train = the single `<case>` the optimizer *tries to improve* and *looks at*; val = the *separate exam* set it never sees, used only to keep or throw away an edit. `<case>` may not appear in `--val-cases`, or the exam isn't held-out.

## Reading the results

Each run writes `research-runs/<slug>/`:

- `score-history.tsv` — one row per iteration: `iter, hypothesis, train, val, gate, delta, decision`.
- `iterations/<N>/hypothesis.md` + `proposed.patch` — what the optimizer tried.
- `iterations/<N>/cases/<case>/` — per-case `summary.json`, `audit.md`, `log-digest.json`, `friction.json` (where the driver guessed / hit ambiguity).
- `overview.md` — config, baseline vs best train/val, kept hypotheses.

Kept hypotheses are real commits on the repo (`experiment: <headline>`); review them
before keeping or squashing.

## When to use which mode

- **No val set** — quick iteration on one fixture; accept that wins may not generalise.
- **With `--val-cases`** — the real training mode. Use 2+ val cases so the gate mean is
  not dominated by one noisy visual diff, and so it actually proves generalisation
  beyond the single train case.

## See also

- `debo-test/SKILL.md` — subcommands and flag parsing
- `debo-test/workflows/research.md` — the authoritative loop spec
- `debo-test/resources/audit-criteria.md` — the per-case audit table
- `designbook/design/workflows/design-verify.md` — the loss (visual measurement)
