# Stage Isolation — Subagent-per-Stage Context Partitioning

**Date:** 2026-06-07
**Status:** Design
**Supersedes the deferred note in:** `2026-06-06-design-verify-enforcement-design.md` ("Subagent-per-stage as a generic engine feature — discussed and desirable … Per-stage isolation is a follow-up.")

## Problem

A designbook workflow runs as a single AI agent that drives every stage sequentially in one context window. As the run progresses, the context accumulates every stage's tool results — Bash outputs, file Reads, task bodies, CLI responses, reasoning — and each assistant turn re-processes the entire accumulated prefix. The dominant cost of a run is therefore **sum-over-turns re-processing of accumulated context**, not the one-time volume of content.

The user's initial hypothesis was that the CLI re-emits the same files, causing wasteful re-reads. Measurement disproved that as the lever (see Evidence). The real lever is context accumulation, addressable by partitioning the run across isolated subagents.

## Evidence

Four real transcripts profiled (`~/.claude/projects/**`), plus a focused single-run analysis of **design-shell in the `drupal-web` workspace** (transcript `68b41eb4`, one complete run, 498 assistant turns).

### Re-reads are not the lever

In the design-shell run: 51 Reads total, 45 unique, only 3 files read more than once (`tasks.yml` 4×, `design-tokens.yml` 3×, `schemas.yml` 2×). Exactly one file (`tasks.yml`, workflow state) spans more than one stage. Across all four runs, rule + blueprint content was 2–11% of one-time payload. Conclusion: read-deduplication would save a few thousand tokens per run — noise. **Dropped from scope.**

### Context accumulation is the lever

| Run | Turns | Billed input (Σ over turns) | Peak ctx | One-time content |
|---|---|---|---|---|
| research-design-shell | 363 | 80.6M | 362k | 60k |
| is-clear-debug | 622 | 169.9M | 486k | 107k |
| design-verify-reviewer | 680 | 63.0M | 166k | 122k |
| design-shell @ drupal-web | 498 | **50.3M** | 167k | 89k |

The one-time content is 60–122k tokens, but it is re-billed 360–680 times because it lives in one growing context.

### Subagent-per-stage payoff (design-shell @ drupal-web)

Modeled by resetting context to a per-subagent bootstrap at each stage boundary; the same content-attribution model is applied to both monolith and subagent sides, so the **ratio** is the reliable signal (absolute reconstruction over-counts vs measured because of prompt caching).

| Bootstrap per subagent | Reduction vs monolith |
|---|---|
| 8k | 5.8× |
| 15k | 4.9× |
| 25k (pessimistic) | 4.0× |

Per-stage cost concentration (approximate attribution — the driver's `next_step` is the segmentation signal):

| Stage | Turns | Monolith billed |
|---|---|---|
| outtake | 128 | 16.7M |
| create-scene | 148 | 13.6M |
| create-component | 58 | 7.2M |
| capture | 48 | 4.2M |
| extract-reference | 62 | 4.0M |
| intake | 33 | 3.1M |
| setup-compare | 21 | 1.5M |

Late and heavy stages dominate (create-scene + outtake ≈ 60% of billed input) precisely because they carry the most accumulated context. Cross-stage data dependencies are minimal (only workflow state spans stages), so isolation gains are not eroded by re-passing bulky artifacts.

**Caveats.** The profiled run is a research/test session; `outtake` at 128 turns reflects research-mode iteration, not a typical end-user run. Per-stage turn counts are approximate. The aggregate (498 turns, 50.3M billed) and the reduction ratio (4–5.8×) are robust. The bootstrap assumption sets the floor — a lean executor brief (not a full skill reload per subagent) is mandatory, else the per-subagent floor drifts toward 25k+.

## Goals

- Cut billed input for long workflows (design-screen, design-shell) by partitioning stages into isolated subagent contexts, targeting a realistic 4–5× reduction on the dominant cost.
- Keep the change backward-compatible: a workflow with no isolation declared runs exactly as today (single monolithic agent).
- Keep CLI/engine code changes minimal; put the orchestration logic in the driver protocol (`workflow-execution.md`) and a new executor brief, consistent with the skill architecture.
- Preserve every existing guarantee: result validation, scope-driven `each:` expansion, after-hooks, worktree pinning, the no-direct-Write rule.

## Non-Goals

- Read-deduplication (disproven as a lever; dropped).
- Generic per-stage isolation for every workflow regardless of size (small workflows like design-component, 2 stages, would pay orchestration overhead exceeding the gain).
- Parallel stage execution. Stages remain sequential; isolation is about context partitioning, not concurrency. (`each:`-expanded sibling tasks within a stage may parallelize later — out of scope here.)
- Changing the result/scope contract or the `tasks.yml` format.

## Architecture

Three pieces: a stage-level opt-in flag, an orchestrator/subagent protocol in the driver, and a lean executor brief that bounds per-subagent bootstrap.

### 1. `isolate:` stage flag

Stages already accept `steps:` and `domain:` in workflow frontmatter. Add an optional boolean:

```yaml
stages:
  create-scene:
    steps: [create-scene]
    isolate: true
  intake:
    steps: [intake]      # no isolate -> runs inline in the orchestrator
```

- Default `false` (or absent) → the stage runs inline in the orchestrator's own context, exactly as today.
- `true` → the orchestrator dispatches one subagent to run that stage's task(s) to completion, then collects a compact return.
- The flag is authored per workflow. design-screen and design-shell ship with `isolate: true` on the heavy stages (`extract-reference`, `create-component`, `capture`, `create-scene`, plus `compare` where present). Tiny stages (`intake`, `setup-compare`, `outtake`) stay inline unless measurement later justifies isolating them too.

  Note: `outtake` shows the highest billed cost in the profiled research run, but that reflects research-mode audit churn, not the stage's intrinsic work. It stays inline initially; revisit after measuring a clean end-user run (see Validation).

A stage with more than one `each:`-expanded task gets **one subagent for the whole stage** (the subagent loops over the sibling tasks), not one subagent per task — this keeps bootstrap amortized.

### 2. Engine: surface `isolate` in resolution

`resolveAllStages` already builds `step_resolved` per step at `workflow create`. Extend the resolver to read each stage's `isolate` flag and carry it onto the step entries (and into the `StageResponse` so the driver knows, at each transition, whether the next step is isolated).

This is the only required engine change: parse the flag, thread it through `step_resolved[step].isolate` and `StageResponse.next_isolate` (or equivalent). No change to validation, scope collection, expansion, or `tasks.yml` shape. `workflow done` continues to work identically whether called by the orchestrator or by a subagent — it only needs the workflow name and task id, both of which the orchestrator passes into the subagent brief.

### 3. Orchestrator / subagent protocol (driver, `workflow-execution.md`)

The orchestrator holds the slim run state: the workflow name, `step_resolved` (paths + schemas, emitted once at create), and accumulated scope. It does **not** read task bodies, rules, or blueprints for isolated stages, and it does not see the subagent's intermediate work.

For each step the driver reaches:

- **Inline step** (`isolate` false): run exactly as the current §3 task loop — read task body + rules + blueprints, do the work, `workflow done`.
- **Isolated step** (`isolate` true): dispatch one subagent with a **lean executor brief** (below). Wait for its compact return. The subagent itself calls `workflow done`, so when control returns the orchestrator re-reads only the resulting `StageResponse` (next_step, stage_complete, scope_update, expanded_tasks) — a few hundred tokens. The orchestrator's context never absorbs the subagent's Bash output, Reads, or reasoning.

The subagent return to the orchestrator is constrained to: the task id(s) completed, the `RESPONSE:` JSON from its final `workflow done`, and a one-line summary. Nothing bulky.

### 4. Lean Stage-Executor brief

New resource: `designbook/resources/stage-executor.md`. This is the system/task brief handed to an isolated-stage subagent. It must let a fresh subagent execute a stage **without reloading the full `designbook` skill**. The orchestrator passes, in the dispatch prompt:

- workflow name + the in-progress task id(s) for the stage
- `step_resolved[step]`: the `task_file` path, `rules[]` paths, `blueprints[]` paths, and the `schema` (result + params + definitions)
- the current scope subset the stage needs
- paths (not contents) of any bulky upstream artifacts the stage consumes (e.g. the component file for `create-scene`, the reference capture for `compare`) — the subagent reads them itself, inside its own disposable context
- the minimal protocol: read task_file + rules + blueprints, fill the schema, obey rules, submit via `workflow done --data` (or `workflow result` for `submission: direct`), repair on validation failure, return the compact result.

The brief is the bootstrap budget. Target ≤ 8–15k tokens (matching the favorable model rows). It deliberately excludes `workflow-execution.md` §1–2/§4–8, after-hook handling, and create/resume orchestration — those stay with the orchestrator.

### Dependency handling

Compact data results flow through workflow scope as today (drives `each:` expansion; the orchestrator passes the needed subset into each subagent brief). Bulky artifacts (component markup, reference DOM/CSS, screenshots) are passed **by path**, never inlined — the consuming subagent reads them in its own context, which is discarded at stage end. Measurement showed cross-stage dependencies are minimal (only workflow state spans stages), so this path-passing is rare and cheap.

## Affected files

| File | Change |
|---|---|
| `packages/storybook-addon-designbook/src/workflow-resolve.ts` | Read stage `isolate` flag; thread onto `step_resolved[step]`. |
| `packages/storybook-addon-designbook/src/workflow.ts` | Add `isolate`/`next_isolate` to `StageLoaded` / `StageResponse`. |
| `packages/storybook-addon-designbook/src/cli/workflow.ts` | Surface the flag in create + done responses. |
| `.agents/skills/designbook/resources/workflow-execution.md` | New §: orchestrator vs subagent protocol; isolated-step branch in the task loop. |
| `.agents/skills/designbook/resources/stage-executor.md` | New lean executor brief. |
| `.agents/skills/designbook/design/workflows/design-screen.md` | Tag heavy stages `isolate: true`. |
| `.agents/skills/designbook/design/workflows/design-shell.md` | Tag heavy stages `isolate: true`. |
| `.agents/skills/designbook-skill-creator/rules/workflow-files.md` | Document the `isolate:` field + its `## Checks` row. |

The CLI work (Part 1) uses `designbook-addon-skills`; the skill-file work uses `designbook-skill-creator`. Two phases, CLI first (the driver protocol depends on the surfaced flag).

## Validation

The measurement is the acceptance test. Before/after on the **same scenario** (design-shell @ drupal-web fixture):

1. Run design-shell monolithic (current `main`), capture total billed input from the session transcript with the profiler used in this design (`/tmp/stageprofile.py` logic, to be committed under `scripts/`).
2. Run design-shell with heavy stages isolated, capture the same metric — summing the orchestrator transcript **and** every subagent transcript (the subagent contexts are real billed tokens, not free).
3. Pass criterion: total billed input (orchestrator + all subagents) is ≥ 3× lower than monolithic, with identical produced artifacts (component files, scene, screenshots) and identical `workflow done` validation outcomes.
4. Also record a clean end-user run (not research mode) to get a representative `outtake`/`create-scene` turn count, and re-decide whether `outtake` should be isolated.

If the measured reduction is below 3×, investigate bootstrap bloat (the executor brief) before widening the isolation set.

## Risks

- **Bootstrap bloat.** If subagents reload too much, the floor rises and the gain shrinks. Mitigation: the lean executor brief, and the validation gate that sums subagent tokens.
- **Lost cross-stage context.** A stage that silently relied on seeing an earlier stage's reasoning (not its declared results) would break under isolation. Mitigation: the dependency audit is part of implementation; anything bulky is passed by path, anything compact via scope. Measurement showed this is rare.
- **Worktree/state coordination.** Subagents must be pinned to the workspace path and their `workflow done` must land against the correct workflow name (existing project discipline for subagent dispatch). Mitigation: the executor brief carries the absolute workspace path and workflow name explicitly.
- **Debuggability.** Failures now span multiple transcripts. Mitigation: the subagent's compact return includes the failing task id and validation errors; the orchestrator surfaces them.

## Out of Scope

- Read-deduplication (disproven).
- Parallel stage / parallel sibling-task execution.
- Isolating small workflows (design-component) — overhead exceeds gain.
- Committing the profiler script to `scripts/` is part of implementation, not redesign.
