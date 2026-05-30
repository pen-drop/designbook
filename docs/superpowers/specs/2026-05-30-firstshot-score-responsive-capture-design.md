# First-Shot Score, 1× Polish Loop & Responsive (Multi-Breakpoint) Capture

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

`design-shell` only (where the A/B was measured). The new `score`/`polish`/recapture/recompare stages and the multi-breakpoint capture are reusable; adopting them in `design-screen`/`design-verify` is out of scope here.

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

## Feature 3 — 1× Polish Loop (design-shell)

Current stages: `… validate → setup-compare → capture → compare → outtake`.

New:
```
… → compare → score → polish → recapture → recompare → score-final → outtake
        │                         (steps:[capture]) (steps:[compare])   │
   first_shot_score                                                 final_score
```

- `compare` (round 1) emits `issues[]`.
- **`score` stage** (new step `score`) → `computeFidelityScore(issues)` → persists **`first_shot_score`** (snapshot taken before polish can clobber the issues).
- `polish` consumes the round-1 `issues[]` and fixes the components. Reuses the existing polish task, triggered by the shell's `polish` step (a shell-scoped polish task or a re-triggerable polish task — resolved in the plan).
- `recapture` / `recompare` are the same capture/compare tasks under distinct stage names (`steps:[capture]` / `[compare]`) → fresh screenshots of the fixed story → round-2 `issues[]`.
- **`score-final` stage** → **`final_score`**.
- `outtake` reports both + `delta = first_shot_score − final_score`.

Stages are name-keyed and walked linearly by `getNextStage`, so the second capture/compare must use new stage names (`recapture`/`recompare`). The score snapshot after round 1 is mandatory so `recompare` cannot overwrite `first_shot_score`.

---

## Feature 4 — Scores & Token Cost in the Result

The archived workflow result (today: `flow_rate`, `success_rate`, `metrics`) gains, via the `outtake` result schema:

- `first_shot_score: number` (0 = perfect)
- `final_score: number`
- `delta: number` (`first_shot_score − final_score`)
- `tokens?: { input?: number; output?: number }`

`tokens` is **agent-reported** at `outtake`: the workflow engine has no visibility into LLM token consumption (only the agent/harness does), so the outtake task asks the executing agent to record its run token usage when available; it is **best-effort** and may be absent on headless/cron runs. New `ScoreReport` type: `{ first_shot_score, final_score, delta, tokens? }`.

`workflow-summary.ts` prints `first_shot_score` / `final_score` / `delta` alongside `flow_rate` / `success_rate`. `archiveWorkflow` persists them like the existing metrics.

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
| `design/workflows/design-shell.md` | new `score`/`polish`/`recapture`/`recompare`/`score-final` stages |
| `design/tasks/score*.md`, polish wiring | compute+persist scores; reuse polish |
| `cli/workflow-summary.ts` + archive | surface + persist scores |

## Error Behavior

| Case | Behavior |
|---|---|
| Only one breakpoint requested | Capture once; no `overrides`; base = that breakpoint. |
| Breakpoint px missing in tokens | Skip that breakpoint, log; capture remaining (base still produced). |
| `compare` round 1 empty issues | `first_shot_score = 0`; polish is a no-op; `final_score = 0`. |
| Token usage unavailable | `tokens` omitted/null; scores still recorded. |
| polish makes it worse | `delta` is negative; recorded honestly (no clamping). |

## Testing

- `computeFidelityScore` — pure unit (empty→0, mixed severities→expected Σ, weights 3/2/1).
- Multi-breakpoint capture — integration (real chromium) against a fixture with an `@media` responsive element (e.g. nav `display:none` at narrow, `flex` at wide): assert base node `hidden` + `overrides[xl].hidden === false` (or the inverse), aligned by `dom_path`.
- Walker breakpoint-diff — pure unit (two trees → expected `overrides`, dom_path join, revealed/hidden nodes).
- design-shell stage list — smoke test asserting the new linear stage order resolves.
- `outtake` result — asserts `first_shot_score`/`final_score`/`delta` present in the archived result.

## Non-Goals

- Multi-round (>1) polish, threshold-based convergence.
- Adopting the loop/score in `design-screen` / `design-verify`.
- Symmetric walker-based verification (walking the generated output) — noted as future synergy with `Issue.properties[]`, not built here.
- A "missing-element" score weight.
