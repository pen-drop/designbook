---
name: research
description: Autonomous skill-improvement loop for a single test case. Run case → score → ideate one change via subagent → re-run → keep or discard → repeat until target / iteration cap / plateau.
---

# research subcommand

Loaded by `debo-test/SKILL.md` when `debo-test research <suite> <case>` is invoked.

## Inputs

| Variable | Source |
|---|---|
| `$SUITE` | arg 2 (`research <suite> ...`) |
| `$CASE` | arg 3 (`research <suite> <case>`) |
| `$ITERATIONS` | `--iterations N`, default 25 |
| `$TARGET` | `--target T`, default 100 |
| `$PLATEAU` | `--plateau M`, default 5 |
| `$BASELINE_ONLY` | `--baseline-only`, boolean — stops after iteration 0 |
| `$SCOPE` | `--scope <glob,glob,...>`, default = files resolved from `tasks.yml` + `packages/storybook-addon-designbook/src/**` |

## Setup

1. Resolve workspace path: `workspaces/$SUITE`.
2. Run `./scripts/setup-workspace.sh $SUITE`. This deletes any prior workspace and rebuilds from scratch (rsync, symlinks, `git init`, `pnpm install`, baseline commit).
3. Run `./scripts/setup-test.sh $SUITE $CASE --into workspaces/$SUITE` to layer the case fixtures.
4. Start Storybook via the addon CLI (cd into the workspace first):
   ```
   eval "$(npx storybook-addon-designbook config)"
   npx storybook-addon-designbook storybook start
   ```
5. Tag the workspace baseline: `cd workspaces/$SUITE && git tag workspace-baseline`.
6. Tag the repo baseline: `cd <repo-root> && git tag research-baseline-$(date +%Y-%m-%d-%H%M)`.
7. Compute the slug: `<YYYY-MM-DD-HHMM>-$SUITE-$CASE`.
8. Create the run dir: `research-runs/<slug>/` with empty `score-history.tsv` (header row), `overview.md`, `scope.txt`.

## Iteration 0 — baseline

1. Inside the workspace, run the case prompt (read `fixtures/$SUITE/cases/$CASE.yaml` `prompt:` field).
2. Every `npx storybook-addon-designbook workflow …` CLI call inside the case run MUST be invoked with `--log` so dbo.log entries are tagged.
3. After the run completes, inside the workspace:
   - `npx storybook-addon-designbook workflow summary --workflow <id> --case ../../fixtures/$SUITE/cases/$CASE.yaml --json` → write to `research-runs/<slug>/iterations/000-baseline/summary.json`.
4. Generate the audit table per [`resources/audit-criteria.md`](resources/audit-criteria.md) → `research-runs/<slug>/iterations/000-baseline/audit.md`.
5. Save the dbo.log digest: copy the JSON output of `digestLog` (or run a small node one-liner that imports it) → `iterations/000-baseline/log-digest.json`.
6. Append a row to `score-history.tsv`:
   ```
   iter	hypothesis	flow_rate	delta	decision
   0	baseline	<flow_rate>	—	keep
   ```
7. If `$BASELINE_ONLY`: print the baseline score and stop.

## Loop iteration N (N ≥ 1)

### 1. Build subagent context bundle

Write/refresh these files under `research-runs/<slug>/`:
- `scope.txt` — list of editable file paths (one per line) derived from tasks.yml + `packages/storybook-addon-designbook/src/**`
- `last-kept.patch` — symlink (or copy) of the most recent kept iteration's `proposed.patch` (skip on iter 1)

### 2. Dispatch subagent

Use the `Agent` tool with `subagent_type: "general-purpose"`. Pass this prompt verbatim, replacing `<slug>` and `<N-1>`:

```
Goal: propose ONE change to improve composite score on this run.

Context bundle (read these files):
- research-runs/<slug>/iterations/<N-1>/audit.md
- research-runs/<slug>/iterations/<N-1>/log-digest.json
- research-runs/<slug>/iterations/<N-1>/summary.json
- research-runs/<slug>/score-history.tsv
- research-runs/<slug>/scope.txt
- research-runs/<slug>/last-kept.patch  (skip if missing)

Constraints:
- One change. One file. Smallest possible diff.
- Only edit files listed in scope.txt.
- Avoid hypotheses already discarded (see decision column in score-history.tsv).
- Read the file before editing.

Return: a one-paragraph hypothesis followed by a unified diff in your final message. Do NOT apply the diff yourself.
```

### 3. Apply the diff

1. Save the subagent's reply to `iterations/<N>/hypothesis.md` (full text, including diff).
2. Extract the unified diff into `iterations/<N>/proposed.patch`.
3. Validate scope: `git apply --check iterations/<N>/proposed.patch` from the repo root. If patch fails check, OR diff touches a file not in scope.txt → mark as `ideate-failed`, re-dispatch with hint (max 3 ideate-failures in a row → bail).
4. Apply: `git apply iterations/<N>/proposed.patch` (no commit yet).

### 4. Reset workspace

Inside the workspace:
```
git reset --hard workspace-baseline
git clean -fdx designbook/ workflows/
```

### 5. Re-verify + score

Re-run the case prompt with `--log` on every `npx storybook-addon-designbook workflow …` call, then:
- `npx storybook-addon-designbook workflow summary --workflow <id> --case <path> --json` → `iterations/<N>/summary.json`
- Generate audit per [`resources/audit-criteria.md`](resources/audit-criteria.md) → `iterations/<N>/audit.md`
- Generate digest → `iterations/<N>/log-digest.json`

### 6. Decide

Compare `iterations/<N>/summary.json:.flowRate` with the **best-so-far** flow_rate (max from previous keeps + baseline).

| Outcome | Condition | Action |
|---|---|---|
| keep | new > best | Repo root: `git commit -am "experiment: <hypothesis-headline>"`. Update best. |
| discard | new ≤ best, no crash | Repo root: `git restore <files-touched-by-patch>`. |
| crash | re-run threw / score CLI failed | Repo root: `git restore`. Retry SAME hypothesis up to 3 times. |
| blocked | crash count ≥ 3 | Log as blocked, ideate again next iteration with this discard recorded. |

Write `iterations/<N>/decision.txt` with one of: `keep`, `discard`, `crash`, `blocked`.

### 7. Append history

Append to `score-history.tsv`:
```
<N>	<hypothesis-headline>	<score>	<delta>	<decision>
```

### 8. Termination check (after EVERY iteration)

Stop if any condition holds:
- Best score ≥ `$TARGET` → terminate-target
- N ≥ `$ITERATIONS` → terminate-cap
- Last `$PLATEAU` iterations all have decision != `keep` → terminate-plateau

Otherwise continue to iteration N+1.

## Termination

1. Append final row to `score-history.tsv` with `decision: terminate-<reason>`.
2. Run audit one last time per [`resources/audit-criteria.md`](resources/audit-criteria.md) → `research-runs/<slug>/final-audit.md`.
3. Write `overview.md` with: config, baseline score, best score, total kept/discarded/crashed, list of kept hypotheses (one per line).
4. Print overview to stdout.
5. Leave workspace + Storybook running so the user can inspect.

## Resume semantics

If `research-runs/<slug>/` already exists at launch:
- If workspace `git status` is clean: prompt "resume from iteration N+1 or start fresh?" — start fresh deletes the run dir and re-runs setup.
- If workspace has uncommitted scope-file changes: refuse with a message; user must clean up manually.

## Failure modes

| Failure | Recovery |
|---|---|
| Workflow crash mid-run | `git restore`, retry same hypothesis up to 3, then `blocked`. |
| `npx storybook-addon-designbook workflow summary` returns non-zero | Bail loop. Print `summary CLI failed — inspect <path>`. |
| Subagent returns invalid patch | Re-dispatch with hint, max 3 in a row, then bail. |
| Workspace reset fails | Bail. Tell user to rebuild via `debo-test run $SUITE $CASE`. |
| User Ctrl-C | Stop after current iteration completes. Print partial summary. |
