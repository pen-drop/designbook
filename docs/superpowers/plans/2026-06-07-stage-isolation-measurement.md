# Stage Isolation — Before/After Measurement

Acceptance test for the stage-isolation feature. Same scenario, monolith vs isolated.

## Scenario
design-shell against the `drupal-web` workspace fixture — the run profiled in the design spec (`docs/superpowers/specs/2026-06-07-stage-isolation-design.md`).

## Tool
`scripts/profile-run.py <transcript.jsonl> --workflow design-shell`

Reports, for the design-shell segment: assistant turns, summed billed input (the dominant cost), per-stage breakdown, the subagent-per-stage cost model (ratio is the reliable signal), and the duplicate-read table.

Reference baseline (pre-feature, from the design spec): 498 turns, **50.3M** measured billed input, reconstructed-model reduction **4.0–5.8×**.

## Procedure
1. **Baseline (monolith):** check out `main`, run design-shell to completion in the drupal-web workspace, note the session transcript path.
   Run: `python3 scripts/profile-run.py <transcript.jsonl> --workflow design-shell` → record `MEASURED billed input`.
2. **Treatment (isolated):** check out `stage-isolation`, run the same design-shell. Collect the orchestrator transcript AND every subagent transcript (each isolated stage spawns one).
   Run the profiler on each transcript; SUM the `MEASURED billed input` totals — subagent tokens are real, not free.
3. **Compare:** treatment_total vs baseline_total.

## Pass criteria
- treatment_total ≤ baseline_total / 3 (≥3× reduction).
- Produced artifacts identical (component files, scene, screenshots) and all `workflow done` validations pass in both runs.

## If below 3×
Inspect bootstrap bloat in `.agents/skills/designbook/resources/stage-executor.md` before widening the isolation set — a fat per-subagent bootstrap is the floor on the gain. Then re-decide whether `outtake` should be isolated using a clean end-user run's turn counts (the profiled run was research-mode; its 128-turn `outtake` is not representative).
