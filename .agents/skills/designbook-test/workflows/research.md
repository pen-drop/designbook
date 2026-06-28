---
name: research
description: Autonomous skill-improvement loop with train/val split. Score a train case-set → ideate one change via subagent → re-score → keep only if a held-out val case-set also improves → repeat until target / iteration cap / plateau.
---

# research subcommand

Loaded by `debo-test/SKILL.md` when `debo-test research <suite> <case>` is invoked.

This loop is text-space gradient descent over skill files: the **train** case-set is
the forward pass + loss the optimizer sees, a subagent proposes one bounded edit
(the gradient step), and a **held-out val** case-set is the validation gate that
decides keep/discard. With no val set it degrades to single-set gating.

## Inputs

| Variable | Source |
|---|---|
| `$SUITE` | arg 2 (`research <suite> ...`) |
| `$CASE` | arg 3 (`research <suite> <case>`) — the primary train case |
| `$TRAIN_CASES` | `--train-cases <a,b,...>`, default = `[$CASE]`. If given, the train set is `[$CASE] + these` (deduped). |
| `$VAL_CASES` | `--val-cases <x,y,...>`, default = `[]` (empty → no val gate, single-set behaviour) |
| `$ITERATIONS` | `--iterations N`, default 25 |
| `$TARGET` | `--target T`, default 100 |
| `$PLATEAU` | `--plateau M`, default 5 |
| `$BASELINE_ONLY` | `--baseline-only`, boolean — stops after iteration 0 |
| `$SCOPE` | `--scope <glob,glob,...>`, default = files resolved from `tasks.yml` + `packages/storybook-addon-designbook/src/**` |
| `$METRIC` | `--metric <jsonata>`, default = case yaml `metric:` field, fallback `flowRate` |
| `$DIRECTION` | `--direction min\|max`, default = case yaml `direction:` field, fallback `max` |

**One metric for the whole loop.** Every case in the train and val sets is scored
with the SAME `$METRIC` and `$DIRECTION`. Mixing per-case metrics across a set
would make the mean meaningless. `$METRIC`/`$DIRECTION` resolve from the positional
`$CASE` yaml (or the CLI flags) and apply to all cases.

## Case yaml fields

In addition to `fixtures`, `prompt`, and `assert`, a case yaml may declare:

```yaml
metric: after.`design-verify`.`score-report`.first_shot.score
direction: min
```

- `metric` — JSONata expression evaluated against the `workflow summary` JSON; selects the value used as the decision metric throughout the research loop. Backtick-quote path segments containing dashes (e.g. `` `design-verify` ``). Defaults to `flowRate` if omitted.
- `direction` — `min` or `max`; controls whether lower or higher metric values are considered improvements. `min` means lower-is-better (e.g. visual diff score); `max` means higher-is-better (e.g. flow-rate percentage). Defaults to `max` if omitted.

## Setup

1. Resolve workspace path: `workspaces/$SUITE`.
2. Run `./scripts/setup-workspace.sh $SUITE`. This deletes any prior workspace and rebuilds from scratch (rsync, symlinks, `git init`, `pnpm install`, baseline commit).
3. Start Storybook via the addon CLI (cd into the workspace first):
   ```
   eval "$(npx storybook-addon-designbook config)"
   npx storybook-addon-designbook storybook start
   ```
4. **Tag the case-agnostic workspace baseline BEFORE layering any case fixtures:**
   `cd workspaces/$SUITE && git tag workspace-baseline`. The baseline must contain
   NO case fixtures so every case in the train/val sets is layered onto a clean tree.
5. Tag the repo baseline: `cd <repo-root> && git tag research-baseline-$(date +%Y-%m-%d-%H%M)`.
6. Resolve the case sets:
   - `TRAIN = dedupe([$CASE] + $TRAIN_CASES)`
   - `VAL = $VAL_CASES`
   - `TRAIN` and `VAL` must be disjoint — if any case appears in both, error and stop.
   - Every named case must exist as `fixtures/$SUITE/cases/<case>.yaml` — else list available cases and stop.
7. Compute the slug: `<YYYY-MM-DD-HHMM>-$SUITE-$CASE`.
8. Create the run dir: `research-runs/<slug>/` with empty `score-history.tsv` (header row), `overview.md`, `scope.txt`. Write `config.json` recording `TRAIN`, `VAL`, `$METRIC`, `$DIRECTION`, `$TARGET`.

## Score-a-case procedure (reused everywhere)

Given an iteration number `N` and a case `c`, produce its metric value:

1. Reset + clean the workspace to the case-agnostic baseline:
   ```
   git reset --hard workspace-baseline
   git clean -fdx designbook/ workflows/
   ```
2. Layer case `c`'s fixtures: `./scripts/setup-test.sh $SUITE c --into workspaces/$SUITE`.
3. Run case `c`'s prompt via a **driver subagent** (do NOT run the workflow inline on
   the research thread — that would flood the loop's context across 25 iterations × N
   cases). Use the `Agent` tool, `subagent_type: "general-purpose"`, with the workspace
   path as its working directory. The driver contract is run.md's, with one override:
   **research runs never have a user.**
   - Give it the case `prompt:` (from `fixtures/$SUITE/cases/c.yaml`) verbatim.
   - Instruct it to drive the full workflow lifecycle inline per
     `resources/workflow-execution.md` (`workflow create` → task loop → `workflow done`),
     running every stage inline including `isolate: true` ones (it cannot spawn further
     subagents).
   - Every `npx storybook-addon-designbook workflow …` CLI call MUST be invoked with
     `--log` so dbo.log entries are tagged.
   - **No user, ever:** if a task/stage needs a decision it cannot answer from the case
     prompt + data model + fixtures, it MUST fail the run (return `status: error` with
     the unanswered question) — it must NOT return `status: needs_user` and it must NOT
     stall waiting. The research loop treats such a return, and any thrown error, as a
     **crash** for this case (see Decide). A case that keeps needing a user is a fixture
     defect — fix the fixture, not the loop.
   - Report contract: return `status: done` plus the `workflow summary --json`, or
     `status: error` with the reason. No task bodies, rule text, or file contents.
   - **Friction log (the trajectory signal).** In the same report, return a `friction`
     list capturing where the driver had to guess, found a task/rule/blueprint
     ambiguous or contradictory, or could not answer from the inputs. This is the
     compressed rollout trajectory SkillOpt edits from — far cheaper than the raw
     transcript and pointed straight at the skill prose that caused trouble. Each entry:
     ```yaml
     friction:
       - locus: <task|rule|blueprint name, e.g. map-entity--design-screen>
         issue: <one line: what was unclear / contradictory / missing>
         guessed: <true|false>   # true = had to invent an answer
     ```
     Empty list if the run was unambiguous. On `status: error`, the blocking question
     MUST appear here with `guessed: false`.
4. Score: `npx storybook-addon-designbook workflow summary --workflow <id> --case ../../fixtures/$SUITE/cases/c.yaml --metric "$METRIC" --json` → write to `research-runs/<slug>/iterations/<NNN>/cases/c/summary.json`. The returned `metric` value is this case's score.
5. Generate the audit per [`resources/audit-criteria.md`](resources/audit-criteria.md) → `iterations/<NNN>/cases/c/audit.md`.
6. Save the dbo.log digest (`digestLog` JSON) → `iterations/<NNN>/cases/c/log-digest.json`.
7. Save the driver's `friction` list → `iterations/<NNN>/cases/c/friction.json` (`[]` if none).
8. Return the case's `metric` value, or treat as **crash** if the summary CLI exits non-zero or `metric: null`.

**Score-a-set(`N`, cases):** run Score-a-case for each case in order; the set score is
the **arithmetic mean** of the case metric values (mini-batch). If ANY case in the set
crashes, the whole set score is `crash` (no partial mean).

## Iteration 0 — baseline

1. `train_score` = Score-a-set(`000-baseline`, TRAIN).
2. `val_score` = Score-a-set(`000-baseline`, VAL) if VAL non-empty, else `—`.
3. Set `best_train = train_score`; `best_val = val_score`. The **gate metric** is
   `val_score` when VAL is non-empty, otherwise `train_score`. `best_gate` tracks it.
4. Append a row to `score-history.tsv`:
   ```
   iter	hypothesis	train	val	gate	delta	decision
   0	baseline	<train_score>	<val_score or —>	<best_gate>	—	keep
   ```
5. If `$BASELINE_ONLY`: print the baseline train/val scores and stop.

## Loop iteration N (N ≥ 1)

### 1. Build subagent context bundle

Write/refresh these files under `research-runs/<slug>/`:
- `scope.txt` — list of editable file paths (one per line) derived from tasks.yml + `packages/storybook-addon-designbook/src/**`
- `last-kept.patch` — symlink (or copy) of the most recent kept iteration's `proposed.patch` (skip on iter 1)

### 2. Dispatch subagent

Use the `Agent` tool with `subagent_type: "general-purpose"`. The optimizer sees the
**train** set only — never the val set (that would defeat the held-out gate). When the
train set has multiple cases, point it at every train case's audit/log/summary. Pass
this prompt verbatim, replacing `<slug>`, `<N-1>`, and `<train-cases>`:

```
Goal: propose ONE change to improve the mean train score across the train case-set on this run.

Context bundle (read these files for EACH train case <c> in <train-cases>):
- research-runs/<slug>/iterations/<N-1>/cases/<c>/audit.md
- research-runs/<slug>/iterations/<N-1>/cases/<c>/log-digest.json
- research-runs/<slug>/iterations/<N-1>/cases/<c>/friction.json   ← where the driver guessed / hit ambiguity; prioritise fixing these
- research-runs/<slug>/iterations/<N-1>/cases/<c>/summary.json
Plus:
- research-runs/<slug>/score-history.tsv
- research-runs/<slug>/scope.txt
- research-runs/<slug>/last-kept.patch  (skip if missing)

Constraints:
- One change. One file. Smallest possible diff.
- Only edit files listed in scope.txt.
- Prefer a change that resolves a `friction` entry (especially `guessed: true` or an
  error locus) — ambiguity the driver hit is higher-signal than score noise. Make the
  skill prose answer it so the next run need not guess.
- Aim for a change that generalises across ALL train cases, not a fix tuned to one fixture.
- Avoid hypotheses already discarded (see decision column in score-history.tsv).
- Read the file before editing.

Return: a one-paragraph hypothesis followed by a unified diff in your final message. Do NOT apply the diff yourself.
```

### 3. Apply the diff

1. Save the subagent's reply to `iterations/<N>/hypothesis.md` (full text, including diff).
2. Extract the unified diff into `iterations/<N>/proposed.patch`.
3. Validate scope: `git apply --check iterations/<N>/proposed.patch` from the repo root. If patch fails check, OR diff touches a file not in scope.txt → mark as `ideate-failed`, re-dispatch with hint (max 3 ideate-failures in a row → bail).
4. Apply: `git apply iterations/<N>/proposed.patch` (no commit yet).

### 4. Re-score the train set

`train_score` = Score-a-set(`<NNN>`, TRAIN). (The Score-a-case procedure handles the
per-case workspace reset + fixture re-layer, so cases never contaminate each other.)

### 5. Validation gate

- If `train_score` is `crash` → handle as **crash** (see Decide), skip val.
- If VAL is empty → the gate metric is `train_score`; skip to Decide.
- If VAL is non-empty → only compute val when the train step improved on `best_train`
  per `$DIRECTION` (no point gating an edit the optimizer itself didn't help on):
  - train did NOT improve → decision is `discard` immediately; record `val: —`.
  - train improved → `val_score` = Score-a-set(`<NNN>`, VAL). The gate metric is `val_score`.

### 6. Decide

`improves(a, b)` = `a < b` when `$DIRECTION` is `min`, `a > b` when `max`.
Compare the **gate metric** (val_score if VAL non-empty, else train_score) against `best_gate`:

| Outcome | Condition | Action |
|---|---|---|
| keep | gate metric `improves(best_gate)` | Repo root: `git commit -am "experiment: <hypothesis-headline>"`. Update `best_gate`, `best_train`, `best_val`. |
| discard | gate metric does not improve, no crash (includes "train improved but val did not") | Repo root: `git restore <files-touched-by-patch>`. |
| crash | any case driver returned `status: error` (incl. would-need-user) / threw / summary CLI exits non-zero / `metric: null` | Repo root: `git restore`. Retry SAME hypothesis up to 3 times. |
| blocked | crash count ≥ 3 | Log as blocked, ideate again next iteration with this discard recorded. |

Write `iterations/<N>/decision.txt` with one of: `keep`, `discard`, `crash`, `blocked`.

The keep gate is the held-out val set: an edit that overfits a single train fixture
lowers train but fails to improve val, so it is discarded. This is the SkillOpt
"accept only on held-out improvement" rule.

### 7. Append history

Append to `score-history.tsv`:
```
<N>	<hypothesis-headline>	<train_score>	<val_score or —>	<gate metric>	<delta>	<decision>
```
Where `delta` = gate metric − `best_gate` (signed), or `—` on crash.

### 8. Termination check (after EVERY iteration)

Stop if any condition holds (evaluated on the **gate metric**'s best, `best_gate`):
- `best_gate` meets `$TARGET` per `$DIRECTION` (max: best ≥ target; min: best ≤ target) → terminate-target
- N ≥ `$ITERATIONS` → terminate-cap
- Last `$PLATEAU` iterations all have decision != `keep` → terminate-plateau

Otherwise continue to iteration N+1.

## Termination

1. Append final row to `score-history.tsv` with `decision: terminate-<reason>`.
2. Run audit one last time (over the train set) per [`resources/audit-criteria.md`](resources/audit-criteria.md) → `research-runs/<slug>/final-audit.md`.
3. Write `overview.md` with: config (train set, val set, metric, direction, target), baseline train/val scores, best train/val scores, total kept/discarded/crashed, list of kept hypotheses (one per line).
4. Print overview to stdout.
5. Leave workspace + Storybook running so the user can inspect.

## Resume semantics

If `research-runs/<slug>/` already exists at launch:
- If workspace `git status` is clean: prompt "resume from iteration N+1 or start fresh?" — start fresh deletes the run dir and re-runs setup.
- If workspace has uncommitted scope-file changes: refuse with a message; user must clean up manually.

## Failure modes

| Failure | Recovery |
|---|---|
| Workflow crash mid-run (any case) | `git restore`, retry same hypothesis up to 3, then `blocked`. |
| Driver returns `status: error` / would-need-user | Treated as `crash`. Recurring need-user on a case = fixture defect; fix the fixture, not the loop. |
| `workflow summary` exits non-zero or returns `metric: null` | Treated as `crash` (see Decide). After 3 retries, bail. Print `summary CLI failed — inspect <path>`. |
| Subagent returns invalid patch | Re-dispatch with hint, max 3 in a row, then bail. |
| Workspace reset fails | Bail. Tell user to rebuild via `debo-test run $SUITE $CASE`. |
| Train and val sets overlap | Error at setup; sets must be disjoint. |
| User Ctrl-C | Stop after current iteration completes. Print partial summary. |
