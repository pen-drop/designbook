# First-Shot Score, design-verify Split (capture/fix, subagent-orchestrated) & Responsive (Multi-Breakpoint) Capture

**Date:** 2026-05-30
**Status:** Draft
**Builds on:** the region-properties resolver + `src/inspect/` walker (this PR).

## Motivation

The A/B run (design-shell vs leando.de, region_properties on/off) showed region_properties improves structural fidelity (header passes both breakpoints, newsletter/icons/logos appear) but left three gaps:

1. **No first-shot metric.** Quality is only an AI-computed score buried in the `outtake` task body, single-pass, not deterministic, not split into before/after fixing.
2. **No fix loop in design-shell.** `design-shell` only `compare`s and stops; the `triage→polish` loop lives in the separate, user-prompted `design-verify`. The first shot ships with known issues.
3. **Responsive never captured.** The walker captures at a single fixed viewport (1440×1600). Breakpoints (`sm`, `xl`) are workflow params but the resolver never sees them, so region_properties carries no per-breakpoint data — which is why the generated `sm` header didn't collapse into a burger.

This design adds: deterministic first-shot/final scores in the result, a single bounded polish round, and mobile-first multi-breakpoint capture.

## Scope

The fidelity score + fix loop are delivered by **splitting `design-verify` into two composable sub-workflows** (`verify-capture`, `verify-fix`) with `design-verify` retained as a thin **orchestrator** that runs them in subagents. Multi-breakpoint capture lands in the shared `inspect/capture.ts` (used by the region_properties resolver wherever `create-component` runs). `design-shell` keeps its existing `after: design-verify` hook and now receives first/final scores through it. Adopting the same in `design-screen` is out of scope.

---

## Feature 1 — Multi-Breakpoint Capture (mobile-first)

`capture()` receives the breakpoint widths and produces ONE `source.json` whose nodes are a **mobile-first base tree** (captured at the smallest breakpoint) with **per-node deviations** for larger breakpoints.

### Flow (deterministic, in `capture.ts`)

1. Resolve breakpoint widths: names from the `breakpoints` param, pixel widths from `design-tokens.yml` `semantic.breakpoints`.
2. Capture at the **smallest** width → base tree (`style` = mobile/base).
3. Capture at each larger width → **diff against base** → record only what changed.
4. Emit one `CapturedSource` with `base_breakpoint` + base nodes carrying `overrides[bp]`.

### Node identity across breakpoints

`hashId` mixes `dom_path` + bbox, and bbox changes per width, so the per-breakpoint captures must be aligned by a **stable key**: `source.locator` (the `dom_path`). `id` stays for in-tree references; `dom_path` is the cross-breakpoint join key. Nodes present only at larger widths (revealed content) are added with `overrides[base].hidden = true`; nodes hidden at larger widths get `overrides[bp].hidden = true`.

### Schema additions (`design/schemas.yml`)

- `PropertyNode`: `overrides?: { <bpName>: { hidden?: boolean; style?: Partial<Style>; bbox?: BBox } }`.
- `CapturedSource` / `RegionProperties`: `base_breakpoint: string`.
- `locateRegion` is unchanged — it matches on the base tree.

### Consumption (rules)

The tailwind / drupal region-properties rules instruct: emit base-breakpoint values as base utilities, and each `overrides[bp]` as the matching responsive prefix (`hidden`/`sm:flex`, `flex-col`/`xl:flex-row`, …). This is what closes the `sm` burger/collapse gap.

---

## Feature 2 — Deterministic Fidelity Score

A pure helper replaces the AI-in-body score in `outtake`, using the **existing** convention (so there is one score in the system):

```
computeFidelityScore(issues[]) = Σ ( critical×3 + major×2 + minor×1 )
// 0 = perfect, lower is better
```

- Location: `src/scoring/composite.ts` (next to `computeFlowRate`).
- `outtake` calls the helper instead of computing the score in prose.

**Known limitation (accepted):** the score weights issue severity, not "element now present" — by it, the A/B run scores ~17 (off) vs ~18 (on), nearly tied, despite B being structurally better. It is a clear, explainable severity score; a "missing-element" weight can be layered later.

---

## Feature 3 — Split design-verify into `verify-capture` + `verify-fix`, orchestrated with subagents

`design-verify` today runs `reference → intake → setup-compare → capture → compare → triage → polish → outtake` in one linear pass. It is split into two composable sub-workflows; `design-verify` keeps its name/entry and becomes a thin orchestrator.

### `verify-capture` (pure measurement)

`reference → intake → setup-compare → capture → compare → score → outtake`.
Output: `issues[]` + a deterministic `score` (`computeFidelityScore`, Feature 2) + agent-reported `tokens` (Feature 4). No fixing.

### `verify-fix` (pure fixing)

`intake(issues) → triage → polish → outtake`.
Consumes the `issues[]` from a prior `verify-capture` and edits the components. Does not re-measure.

### `design-verify` (orchestrator, subagent-offloaded)

```
design-verify:
  Subagent → verify-capture        → first_shot_score + issues   (+ tokens)
  Subagent → verify-fix(issues)    → fixes components
  Subagent → verify-capture        → final_score                  (+ tokens)
  aggregate → result: { first_shot_score, final_score, delta, tokens }
```

- **One subagent per sub-workflow run** (capture / fix / capture). Each subagent runs the child designbook workflow end-to-end and returns ONLY its structured result (score, issues, tokens) — the orchestrator's context stays small.
- The orchestrator holds `first_shot_score` from run 1 across run 2 (it lives in the orchestrator scope, not in the re-run `verify-capture` output), so there is no clobber to guard.
- `design-verify` gets its **own** outtake task (`outtake--design-verify`, distinct from `verify-capture`'s outtake) that aggregates the two runs' scores + summed tokens into the `ScoreReport` result.
- `delta = first_shot_score − final_score` (positive = improvement, since lower is better).
- Existing child-workflow invocation already exists in the skill (`outtake` runs design-verify as a child); the orchestrator extends that pattern to dispatch via subagents.

`design-shell` is unchanged except that its existing `after: design-verify` hook now yields the first/final scores through the orchestrator's result.

---

## Feature 4 — Scores & Token Cost in the Result

Two levels:

- **`verify-capture` result** carries a single run's measurement: `score: number` (0 = perfect) + `tokens?: { input?: number; output?: number }`.
- **`design-verify` orchestrator result** aggregates the two capture runs: `first_shot_score`, `final_score`, `delta` (`first_shot_score − final_score`), and summed `tokens`.

`tokens` is **agent-reported**: the workflow engine has no visibility into LLM token consumption (only the agent/harness does), so each `verify-capture`/`verify-fix` subagent records its own run token usage when available and returns it; the orchestrator sums them. **Best-effort** — may be absent on headless/cron runs.

`workflow-summary.ts` prints the orchestrator's `first_shot_score` / `final_score` / `delta` alongside `flow_rate` / `success_rate`; `archiveWorkflow` persists them like the existing metrics.

### Schemas & outtake tasks

Workflows declare no top-level `result:` — results surface via the outtake **task** `result:` + archive metrics. So two outtake tasks exist:

- **`verify-capture` outtake** — emits one run's measurement:
  ```yaml
  result:
    type: object
    required: [score, issues]
    properties:
      score:  { type: integer, minimum: 0 }
      issues: { type: array, items: { $ref: ../schemas.yml#/Issue } }
      tokens:
        type: object
        properties: { input: { type: integer }, output: { type: integer } }
  ```
- **`design-verify` orchestrator outtake** (NEW, distinct task) — aggregates the two capture runs into a `ScoreReport`:
  ```yaml
  result:
    type: object
    required: [score-report]
    properties:
      score-report: { $ref: ../schemas.yml#/ScoreReport }
  ```

New `ScoreReport` type in `design/schemas.yml`:
```yaml
ScoreReport:
  type: object
  title: Score Report
  description: >
    Fidelity scores for a design-verify run. Lower is better (0 = perfect).
    first_shot_score = before any fix; final_score = after the single verify-fix
    pass; delta = first_shot_score − final_score (positive = improvement).
  required: [first_shot_score, final_score, delta]
  properties:
    first_shot_score: { type: integer, minimum: 0, examples: [17],
      description: "Σ(critical×3 + major×2 + minor×1) over all checks, before fixing." }
    final_score:      { type: integer, minimum: 0, examples: [6],
      description: Same formula, measured after verify-fix. }
    delta:            { type: integer, examples: [11],
      description: first_shot_score − final_score. Positive = polish improved fidelity. }
    tokens:
      type: object
      description: Agent-reported LLM tokens, summed across capture/fix subagents. Best-effort; absent on headless runs.
      properties: { input: { type: integer }, output: { type: integer } }
    checks:
      type: array
      description: Optional per-check breakdown of the final measurement.
      items:
        type: object
        required: [breakpoint, region, score]
        properties:
          breakpoint: { $ref: "#/BreakpointId" }
          region:     { $ref: "#/RegionId" }
          score:      { type: integer, minimum: 0 }
          passed:     { type: boolean }
```

---

## Components & Boundaries

| Unit | Responsibility |
|---|---|
| `inspect/capture.ts` | Multi-breakpoint capture → mobile-first base + per-node `overrides` (deterministic diff) |
| `inspect/element-walker.ts` | unchanged walker; diff helper may live here or in capture (pure) |
| `inspect/region.ts` | unchanged — matches base tree |
| `resolvers/region-properties.ts` | pass breakpoints+px to capture |
| `scoring/composite.ts` | `computeFidelityScore(issues)` (pure) |
| `design/schemas.yml` | `PropertyNode.overrides`, `base_breakpoint`, `ScoreReport` |
| `design/workflows/verify-capture.md` | new measurement workflow (capture→compare→score→outtake) |
| `design/workflows/verify-fix.md` | new fix workflow (intake(issues)→triage→polish→outtake) |
| `design/workflows/design-verify.md` | refactor to thin orchestrator: dispatch 1 subagent per sub-workflow run (capture/fix/capture), aggregate first/final/delta/tokens |
| `design/tasks/score.md` | compute score via helper for a verify-capture run |
| `design/tasks/outtake--verify-capture.md` | verify-capture outtake: result `{score, issues, tokens}` |
| `design/tasks/outtake--design-verify.md` (NEW) | orchestrator outtake: aggregate runs → `ScoreReport` result |
| `cli/workflow-summary.ts` + archive | surface + persist first/final scores |

## Error Behavior

| Case | Behavior |
|---|---|
| Only one breakpoint requested | Capture once; no `overrides`; base = that breakpoint. |
| Breakpoint px missing in tokens | Skip that breakpoint, log; capture remaining (base still produced). |
| `verify-capture` round 1 empty issues | `first_shot_score = 0`; orchestrator skips `verify-fix`; `final_score = 0`. |
| A capture/fix subagent fails | orchestrator records the failure, keeps any score already obtained, does not fabricate a missing score. |
| Token usage unavailable | `tokens` omitted/null; scores still recorded. |
| polish makes it worse | `delta` is negative; recorded honestly (no clamping). |

## Testing

- `computeFidelityScore` — pure unit (empty→0, mixed severities→expected Σ, weights 3/2/1).
- Multi-breakpoint capture — integration (real chromium) against a fixture with an `@media` responsive element (e.g. nav `display:none` at narrow, `flex` at wide): assert base node `hidden` + `overrides[xl].hidden === false` (or the inverse), aligned by `dom_path`.
- Walker breakpoint-diff — pure unit (two trees → expected `overrides`, dom_path join, revealed/hidden nodes).
- `verify-capture` / `verify-fix` stage lists — smoke tests asserting each resolves to its stage order.
- `design-verify` orchestrator result — asserts `first_shot_score`/`final_score`/`delta` present and `delta = first_shot_score − final_score`.

## Non-Goals

- Multi-round (>1) polish, threshold-based convergence (orchestrator runs capture→fix→capture exactly once).
- Adopting `verify-capture`/`verify-fix` in `design-screen`.
- Finer subagent granularity (per-component); one subagent per sub-workflow run only.
- Symmetric walker-based verification (walking the generated output) — noted as future synergy with `Issue.properties[]`, not built here.
- A "missing-element" score weight.
