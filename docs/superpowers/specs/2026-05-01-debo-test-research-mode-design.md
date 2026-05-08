# Design: `debo-test --research` autonomous skill-improvement loop

**Date:** 2026-05-01
**Branch:** `feat/research-mode`
**Worktree:** `.claude/worktrees/research-mode/`
**Status:** Draft — pending user approval

## Goal

Replace the current human-in-the-loop `debo --research` audit with an autonomous goal-directed iteration loop that lives on `debo-test`. A single test case is selected, the loop runs it, scores it against a composite metric, proposes one targeted change to the loaded skill files (or CLI source), re-runs the case, and keeps or discards the change based on the score delta. The loop continues until the score reaches a target, an iteration cap is hit, or the score plateaus.

The design transplants Karpathy-style autoresearch principles (modify → verify → keep/discard → repeat, mechanical metric, git-as-memory) into the designbook skill-development workflow. It removes `--research` from the `debo` skill entirely.

## Non-goals

- Multi-case optimization across a suite. v1 optimizes one case at a time.
- Cross-case regression guarantees. When CLI or schema changes break other cases, that surfaces only on the next run that touches those cases. Acceptable for v1.
- Calling `npx promptfoo eval` from the loop. We reuse the assertion DSL from case files but evaluate inline — no second Claude process per iteration.

## Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Primary intent | Single-case convergence (loop one case to zero friction) |
| Placement | `debo-test --research <suite> <case>` |
| Old `debo --research` flag | Removed entirely. `--log` flag stays. |
| Metric | Composite: `success_rate*100 + assertions_ratio*30 - errors*5 - retries*2 - unresolved*3` |
| Modification scope | All files resolved in `workflows/archive/<workflow>/tasks.yml` (tasks, rules, blueprints, `$ref`'d schemas) PLUS `packages/storybook-addon-designbook/src/**` (CLI source) |
| Ideate strategy | Hybrid — audit table + dbo.log digest + score history feed a `general-purpose` subagent that returns one diff per iteration |
| Workspace handling | Two-tier git: repo root commits experiments, workspace `git reset --hard baseline` per iteration |
| Termination | Score ≥ target (default 100) OR `Iterations: N` (default 25) OR plateau M (default 5), whichever first |
| Commit policy | Commit-after-keep (discarded experiments are NOT committed; `git restore` reverts them in-place) |
| Guard / multi-case verification | Skipped for v1. No `--guard` flag. |
| Promptfoo integration | Reuse `assert:` DSL via inline JS sandbox in `npx storybook-addon-designbook workflow score`; do not invoke promptfoo as a process |

## Architecture

### Two-tier git model

```
repo-root/                            ← experiments commit here
├── .agents/skills/...                ← editable scope
├── packages/storybook-addon-...      ← editable scope (CLI source)
├── research-runs/                    ← gitignored: per-run state
│   └── 2026-05-01-1432-drupal-petshop-design-screen/
│       ├── overview.md
│       ├── score-history.tsv
│       ├── final-audit.md
│       └── iterations/
│           ├── 000-baseline/
│           ├── 001/
│           └── ...
└── workspaces/<suite>/               ← workspace, separate git repo
    ├── designbook/                   ← reset per iteration (dbo.log + workflows/)
    └── (everything else)             ← pinned at baseline commit
```

### Loop topology

```
[Setup]
  parse args → delete + setup-workspace.sh + setup-test.sh → start storybook
  workspace git: tag workspace-baseline
  repo-root git: tag research-baseline-<timestamp>
  research-runs/<slug>/ created with overview.md, scope.txt
  iter 0: run case once → write iterations/000-baseline/ (audit, log-digest, score)

[Loop iteration N]
  1. Verify+Score:    workspace clean → run case → npx storybook-addon-designbook workflow score → score.json
  2. Ideate:          dispatch general-purpose subagent → proposed.patch
  3. Modify:          apply proposed.patch in repo root (in-tree, uncommitted)
  4. Reset workspace: git reset --hard workspace-baseline + git clean -fdx designbook/
  5. Re-Verify+Score: run case → score.json
  6. Decide:
       improved → repo-root: git commit -m "experiment: <hypothesis>" → log "keep"
       same/worse → repo-root: git restore <scope-files> → log "discard"
       crash (≤3) → repo-root: git restore → retry same hypothesis
       crash (>3) → log "blocked", new ideation
  7. Log:             append to score-history.tsv, write iterations/<N>/decision.txt

[Stop]
  target hit (≥100) | iterations exhausted | plateau | fatal-bail
  → run audit → final-audit.md
  → write overview.md (config + baseline → best + counts)
  → print summary, leave workspace + storybook running
```

## Invocation

```bash
# Default: 25 iterations, target 100, plateau 5
debo-test <suite> <case> --research

# Bounded explicitly
debo-test <suite> <case> --research --iterations 10

# Custom target / plateau
debo-test <suite> <case> --research --target 90 --plateau 8

# Dry-run: setup + score baseline, but don't loop
debo-test <suite> <case> --research --baseline-only

# Custom modify scope
debo-test <suite> <case> --research --scope ".agents/skills/designbook/design/**"
```

### Dispatch rules

| Args | Behavior |
|---|---|
| `<suite>` only | Existing flow: list cases. `--research` rejected with error. |
| `<suite> <case>` (no flag) | Existing flow: run once, offer fixture snapshot. |
| `<suite> <case> --research` | New autoresearch loop. Skips the existing prompt-confirm and snapshot-offer steps. |
| `<suite> <case> --research --baseline-only` | Setup + iter 0 + stop. |

### Flags supported in research mode

| Flag | Default | Purpose |
|---|---|---|
| `--iterations N` | 25 | Hard cap on loop count |
| `--target T` | 100 | Stop when composite score ≥ T |
| `--plateau M` | 5 | Stop after M iterations with no improvement |
| `--baseline-only` | off | Run once, score, stop |
| `--scope <glob>` | (loaded files + CLI src) | Override modify scope (comma-separated globs) |

### Resume semantics

If `research-runs/<slug>/` exists at launch:
- If workspace `git status` is clean: offer "resume from iteration N+1" or "start fresh".
- If workspace has uncommitted scope-file changes: refuse to resume; instruct manual cleanup. This is the "crashed mid-modify" case.

## Composite metric

```
score = success_rate * 100                                 (0 if absent)
      + (assertions_passed / assertions_total) * 30        (skipped if no assertions)
      - errors * 5
      - retries * 2
      - unresolved * 3
```

### Fallback hierarchy

- Both `success_rate` AND assertions present → both contribute (max 130).
- Only `success_rate` present → primary correctness signal, max 100.
- Only assertions present → primary correctness signal, max 30.
- Neither → friction-only (`-errors*5 - retries*2 - unresolved*3`); negative-only metric, target should be set near 0.

### Score CLI shape

`npx storybook-addon-designbook workflow score --json` emits:

```json
{
  "score": 88,
  "components": {
    "success_rate": 0.7,
    "assertions": { "passed": 3, "total": 4, "failures": ["output.newFiles.some(...)"] },
    "errors": 0,
    "retries": 1,
    "unresolved": 0
  },
  "computed_from": "composite",
  "case": "design-screen"
}
```

`assertions.failures` (the JS expressions that returned false) is included in subagent context as a hypothesis source.

### Inputs to scoring

| Input | Source |
|---|---|
| `success_rate`, `metrics.{validation_errors, retries, invalid_calls}` | Latest `WorkflowOutput` from `workflows/archive/<workflow>/output.json` |
| `errors`, `retries`, `unresolved`, `long_running` | Tagged entries from `designbook/dbo.log` (filter `tagged: true`) |
| `assertions.{passed, total, failures}` | Inline JS-sandbox eval of `caseFile.assert[].value` against an `output` object built from the run |

The `output` object passed to assertion evaluation includes:

```ts
{
  newFiles: string[],         // files created in workspace during the run
  changedFiles: string[],     // tracked files modified during the run
  errors: LogEntry[],
  workflowOutput: WorkflowOutput | null,
}
```

This object shape is documented in the score CLI and tested.

## Components

### New

1. **`.agents/skills/designbook-test/research.md`** — Resource describing the loop protocol. Loaded by the skill when `--research` is parsed from `$ARGUMENTS`.
2. **`npx storybook-addon-designbook workflow score` CLI subcommand** — Reads `dbo.log` + `workflow archive output.json` + the case YAML, evaluates assertions, emits the composite score JSON. Implementation lives at `packages/storybook-addon-designbook/src/cli/workflow-score.ts`.

### Extracted (refactored from existing)

3. **Audit module** — Step 3 of the current `--research` flow becomes a callable utility. Two consumers: subagent context bundle and final-summary print. Spec at `.agents/skills/designbook-test/research-audit.md`.
4. **dbo.log digester** — Step 2b of the current flow, pulled into `packages/storybook-addon-designbook/src/log/digest.ts`. Used by the score CLI and by subagent context-bundle generation.

### Modified

5. **`.agents/skills/designbook-test/SKILL.md`** — Add `--research` dispatch branch that parses flags, runs setup steps 1–3 (delete, setup-workspace, setup-test), skips steps 4–5 (prompt-confirm, snapshot offer), loads `research.md`.

### Deleted

6. **`debo --research` flag** — Remove from:
   - `.agents/skills/designbook/SKILL.md` (flag table + dispatch parser)
   - `.agents/skills/designbook/resources/workflow-execution.md` (Research Pass section)
   - `.agents/skills/designbook-skill-creator/SKILL.md` (reference)
   - `.agents/skills/designbook-skill-creator/resources/research.md` — rewritten to point at the new `designbook-test/research.md`. Audit-criteria portion (table from Step 3) stays, since it's reused by the audit module.
7. **`<repo-root>/designbook/`** — local cleanup. CLI gains a runtime guard (next section) so it can't reappear.

### CLI guard against repo-root runtime data

In `packages/storybook-addon-designbook/src/config.ts` (or wherever DESIGNBOOK_DATA resolves): if the resolved path's parent directory contains BOTH `pnpm-workspace.yaml` AND `.git/` (the markers of the repo root), exit with:

```
error: designbook CLI cannot write runtime data to the repo root.
       Run from a workspace (cd workspaces/<suite>) or set DESIGNBOOK_DATA explicitly.
```

This is a hard fence. Repeat offenders should set `DESIGNBOOK_DATA` to an absolute path or run from a workspace.

### `.gitignore` updates

Replace the four current `designbook/` entries with a single line: `designbook/`. Add: `research-runs/`. The previous `.pnpm-store/` entry stays.

## Subagent contract

The ideate step dispatches a `general-purpose` subagent per iteration with this prompt:

```
Goal: propose ONE change to improve composite score on this run.

Context bundle (read these files):
- research-runs/<slug>/iterations/<N-1>/audit.md          ← latest audit (or 000-baseline)
- research-runs/<slug>/iterations/<N-1>/log-digest.json   ← tagged dbo.log digest
- research-runs/<slug>/iterations/<N-1>/score.json        ← last score, including assertions.failures
- research-runs/<slug>/score-history.tsv                  ← all past iterations: hypothesis, delta, decision
- research-runs/<slug>/scope.txt                          ← list of editable file paths (one per line)
- research-runs/<slug>/last-kept.patch                    ← diff of most recent kept experiment (absent on iter 1)

Constraints:
- One change. One file. Smallest possible diff.
- Only edit files listed in scope.txt.
- Avoid hypotheses already discarded (see decision column in score-history.tsv).
- Read the file before editing.

Return: a single unified diff in your final message, prefixed with a one-paragraph hypothesis.
Do NOT apply the diff yourself.
```

The main loop applies the returned diff with `git apply --check` first, then `git apply`. If the patch is invalid (no diff, malformed, scope violation), the subagent is re-dispatched with a hint about the failure (max 3 ideate-failures before bailing).

Subagent context exposure is bounded to ~5 files per iteration; the main session never reads them. Across 25 iterations this keeps the main context clean.

## Run directory layout

```
research-runs/<YYYY-MM-DD-HHMM>-<suite>-<case>/
├── overview.md                              ← config + final summary
├── score-history.tsv                        ← iter, hypothesis, score, delta, decision
├── final-audit.md                           ← audit table after loop terminates
├── scope.txt                                ← editable file paths (input to subagent)
└── iterations/
    ├── 000-baseline/
    │   ├── audit.md                         ← audit at baseline
    │   ├── log-digest.json
    │   └── score.json
    ├── 001/
    │   ├── hypothesis.md                    ← subagent's reasoning + chosen file
    │   ├── proposed.patch                   ← unified diff
    │   ├── audit.md
    │   ├── log-digest.json
    │   ├── score.json
    │   └── decision.txt                     ← keep | discard | crash | blocked
    └── ...
```

`research-runs/` is gitignored at repo root. No automatic cleanup; user can `rm -rf research-runs/<slug>/` when done.

## Error handling

| Failure | Detection | Recovery |
|---|---|---|
| Workflow crashes mid-run | Non-zero exit from `npx storybook-addon-designbook workflow done` or unhandled error in dbo.log | `score = -∞`. Log `crash`. `git restore <scope>`. Retry same hypothesis up to 3 times. After 3 → `blocked`, new ideation. |
| Score computation fails | `npx storybook-addon-designbook workflow score --json` returns invalid JSON or non-zero | Bail loop with clear message. The score CLI itself is broken; no point continuing. |
| Subagent returns invalid patch | `git apply --check` fails or empty diff | Re-dispatch subagent with failure hint. After 3 ideate-failures → bail. |
| Workspace reset fails | git error during `reset --hard` or `clean -fdx` | Bail immediately. Workspace state untrusted. Tell user to rebuild via `debo-test <suite> <case>`. |
| User Ctrl-C | SIGINT | Stop after current iteration. Print partial summary. Workspace + storybook left running. Run-dir is fully populated up to last completed iteration. |

### Termination order

1. Append final row to `score-history.tsv` with `decision: terminate-<reason>`.
2. Run audit, write `final-audit.md`.
3. Compute and write `overview.md`.
4. Print overview to stdout.
5. Leave workspace + storybook running so the user can inspect best-state results interactively.

## Testing strategy

### Unit tests

In `packages/storybook-addon-designbook/src/cli/__tests__/workflow-score.test.ts`:
- Composite formula across all four fallback combinations (both / success_rate-only / assertions-only / neither).
- Assertion sandbox: passes valid JS, isolates from outer scope, surfaces failures with their source string.
- Edge: empty `dbo.log`, missing `output.json`, malformed JSON.

In `packages/storybook-addon-designbook/src/log/__tests__/digest.test.ts`:
- Grouping correctness for errors, retries, unresolved, long-running.
- `tagged: true` filter excludes untagged entries.

### CLI guard test

In `packages/storybook-addon-designbook/src/__tests__/config.test.ts` (or similar):
- Resolving DESIGNBOOK_DATA to a path under repo root (with `pnpm-workspace.yaml` + `.git/` siblings) exits non-zero.
- Resolving inside a workspace succeeds.
- Explicit `DESIGNBOOK_DATA=/abs/path` always succeeds.

### Loop integration test

A minimal "fake" suite under `fixtures/research-test/` with:
- A case YAML that runs a trivial workflow with predictable failure modes (one task that fails first try, succeeds on retry, etc.).
- Skill files small enough to audit cleanly.
- Assertions covering `output.newFiles`.

The integration test runs the loop with `--iterations 3 --target 999` (force the cap), asserts:
- `research-runs/<slug>/` exists with the documented layout.
- `score-history.tsv` has 4 rows (baseline + 3 iterations).
- Repo-root git history has at most 3 `experiment:` commits (one per kept iteration).
- Workspace returns to baseline state after the loop (clean `git status`).

This is run manually for now (full pnpm install + storybook startup is heavy for CI). Document in `research.md` how to run it.

## Implementation order (rough plan input)

1. **CLI guard + cleanup**: add the repo-root guard, delete local `designbook/`, simplify `.gitignore`. First commit on this branch.
2. **`npx storybook-addon-designbook workflow score`**: implement the score CLI, including the assertion sandbox and dbo.log digester. Unit-tested.
3. **Audit module extraction**: pull current Step 3 logic into a callable form.
4. **`research.md`** in `designbook-test`: write the loop protocol.
5. **`SKILL.md` dispatch**: parse `--research` and the new flags.
6. **Subagent prompt template + run-dir scaffolding**: build the context bundle, dispatch.
7. **Loop wiring**: keep/discard, score-history, termination conditions.
8. **Removal of `debo --research`**: delete flag, update docs, rewrite `designbook-skill-creator/resources/research.md` as a pointer.
9. **Integration smoke test**: minimal fake case, verify run-dir layout.

The detailed order is the writing-plans step's job — this is just a sketch.

## Open questions / future work

- **Multi-case optimization** (post-v1) — A `--research --suite <name>` mode that loops a whole suite, treating the per-case scores as a vector. Useful once v1 stabilizes.
- **`--guard` reintroduction** — When CLI/schema breakage starts hurting, revisit. Likely opt-in flag with explicit guard-case list.
- **Score-history visualization** — A small CLI to render `score-history.tsv` as an ASCII chart. Nice-to-have.
- **Research-runs garbage collection** — `--keep-last N` flag once the dir gets large. Out of scope for v1.

## References

- [Karpathy autoresearch](https://github.com/karpathy/autoresearch) — original inspiration
- `autoresearch:autoresearch` skill — the generalized loop, principles we adapt
- `.agents/skills/designbook-skill-creator/resources/research.md` — current `--research` audit logic (will be refactored)
- `.agents/skills/designbook/design/schemas.yml` `DesignWorkflowOutput` — defines `success_rate`
