# Plan: Deterministic, model-independent compare scoring

Status: PROPOSAL (for review). No code yet.

## Problem

The design-shell / design-verify compare score (`success_rate`, issue severities,
the verify first-shot/final score) is produced by the **model's visual judgement**.
The compare step says "take a Storybook screenshot and compare it against the
reference" — the model eyeballs the two images and assigns `diff_percent` and
severities itself.

Consequence, observed across A/B runs (same case, same reference):

| | design-shell compare | design-verify first-shot |
|---|---|---|
| opus v6 | 3 critical / 1 major / 6 minor (score 17) | **0** (verify flagged nothing) |
| fable v6 | 1 critical / 2 major / 3 minor (score 10) | compare 15 / triage 8 |

opus's verify reporting 0 right after its own design-shell compare reported 17 is
not "perfect rendering" — it is **leniency**. fable is internally consistent and
(after PR #74's severity calibration) honest. Net: **scores are not comparable
across models**, because the number they map from is itself a model guess.

PR #74 added severity floors (`diff_percent > 0.25 → critical`, `> 0.10 → major`)
in `screen-compare.md`, but they map from a **model-estimated** `diff_percent`, so
the calibration cannot make the result deterministic.

## Root cause

`odiff-bin` (a fast, deterministic pixel-diff tool) is **already a dependency** of
`storybook-addon-designbook` — but it is **wired in nowhere**: not in the addon
`src/`, not in any task/rule. The `diff_percent` schema field exists but is never
measured. The entire compare/score chain is the model's eyes.

## Goal

Make the compare score **measured, not judged**: the same pair of screenshots
yields the same `diff_percent` → the same severity → the same `success_rate`,
regardless of which model executed the run. The model still narrates *what*
differs (qualitative, descriptive) but no longer sets the *score*.

## Design

### 1. Addon CLI — `compare-images` (wraps odiff)

New command in `src/cli/` (sibling of `guard-css`, `workflow`):

```
npx storybook-addon-designbook compare-images \
  --reference <ref.png> --actual <storybook.png> --diff <out-diff.png> [--json]
```

Uses the `odiff-bin` Node API (`compare(basePath, newPath, diffPath, options)` →
`{ match, diffPercentage, diffCount, reason }`). Emits JSON:

```json
{
  "diff_percent": 0.137,            // odiff diffPercentage / 100 (ratio 0..1)
  "diff_pixels": 18234,
  "match": false,
  "reason": "pixel-diff",           // or "layout-diff" when dimensions differ
  "ref_dim":   { "w": 1280, "h": 699 },
  "actual_dim":{ "w": 1280, "h": 394 },
  "dimension_drift": { "w": 0.0, "h": 0.436 },   // |a-r|/r per axis
  "diff_path": "<out-diff.png>"
}
```

- Deterministic, fast (odiff is native).
- `antialiasing: true` + a small `threshold` (e.g. 0.1) option to avoid AA noise.
- Dimension mismatch: odiff returns `layout-diff`; we still report dimensions +
  `dimension_drift` so the severity rule can use structural drift directly.

### 2. Deterministic severity + success_rate (computed, not model-set)

Best: compute these in code so the model cannot fudge them. Two options:

- **2a (preferred):** `compare-images` also returns a `severity` and the
  outtake/score computes `success_rate` — both from the measured numbers using the
  PR #74 floors:
  - `diff_percent > 0.25` OR `dimension_drift.* > 0.25` → `critical`
  - `diff_percent > 0.10` OR `dimension_drift.* > 0.10` → `major`
  - else `minor` (or `pass` below a `threshold`, e.g. 0.02)
  - `success_rate = 1 − max(diff_percent over all checks)`
- **2b (lighter):** CLI returns only the measurement; `screen-compare.md` maps
  severity from the *measured* `diff_percent` (still deterministic because the
  number is measured). Less robust — the model could still deviate.

Recommend **2a**: the score is owned by code, the model owns the prose.

### 3. Skill wiring

- `compare-screenshots.md` / `screen-compare.md`: after capturing the Storybook
  screenshot, run `compare-images` against the reference for the check; set
  `CompareArtifact.diff_percent`, `diff_path`, `passed` from its output. The model
  writes qualitative `issues[]` (what differs, file hints) but takes each issue's
  `severity` from the measured band, not its own impression.
- `outtake`: `success_rate` is computed from `max(diff_percent)`, not authored.
- Region/state axis (PR #77): the measurement runs per `(breakpoint, region,
  state)` check using the `file_suffix`-named PNGs — already aligned.

### 4. Model's remaining role

Describe *what* deviates and *where* (so polish can act), download/repro, capture.
It no longer decides the magnitude. `success_rate` stops being self-graded.

## Migration / compatibility

- `success_rate` keeps its meaning (0..1, higher better) but becomes measured.
- The research-loop metric (`flow_rate`, `after.design-verify.score-report`) keeps
  working — only the source of the numbers changes.
- No on-disk artifact migration needed (testing is from scratch).

## Edge cases / open questions (for review)

1. **odiff API specifics** — confirm `compare()` return shape + `diffPercentage`
   units (% vs ratio) against `odiff-bin@4.3.2`; confirm behaviour on differing
   dimensions (does it still return a number, or only `layout-diff`?).
2. **Different dimensions** — odiff may refuse to pixel-compare mismatched sizes.
   Plan: when `layout-diff`, score from `dimension_drift` alone (structural), skip
   pixel ratio. Is that the right severity?
3. **Element/region captures** — reference vs Storybook region crops must be the
   same viewport/selector for the pixel ratio to be meaningful. Confirm capture
   already normalizes this (viewport 1600h, region selector).
4. **Anti-aliasing / sub-pixel** — pick `threshold`/`antialiasing` so honest
   small diffs aren't inflated to `major`.
5. **Where to compute severity** — CLI (2a) vs rule (2b). Recommend CLI.
6. **`screen-compare.md` severity floors** — keep prose floors as documentation,
   but make the CLI the source of truth so a subagent that doesn't load the rule
   still scores identically. (Relevant: the verify subagent's rule-loading.)

## Review outcome (fable, empirical — supersedes assumptions above)

Reviewed with real `odiff-bin@4.3.2` runs against actual v6 workspace screenshots.
Verdict: **viable — measure-not-judge confirmed deterministic with a plausible
ranking.** Corrections, in priority order:

1. **odiff result is a discriminated union, not a flat object.** Handle:
   - `{ match: true }` — no other fields.
   - `{ match: false, reason: "pixel-diff", diffCount, diffPercentage, diffLines? }`.
   - `{ match: false, reason: "layout-diff" }` — **no** diffCount/diffPercentage.
   - `{ match: false, reason: "file-not-exists", file }` — only with `noFailOnFsErrors: true`.
   `diffPercentage` is **percent (0–100)**, so the `/100` conversion is correct.
2. **Dimension-mismatch handling in §Design.2 was backwards.** odiff does **not**
   refuse mismatched sizes by default — `failOnLayoutDiff` defaults `false`, so it
   pixel-compares anyway (top-left aligned; missing area counts as diff).
   `layout-diff` only appears with explicit `failOnLayoutDiff: true`. → **Keep
   `failOnLayoutDiff: false`, always measure pixel-diff, report `dimension_drift`
   as an *additional* signal, severity = max(both).** Do NOT fall back to
   `dimension_drift`-only (counterexample: sm--footer has drift 0.021 → would
   "pass", yet measures 23% pixel-diff).
3. **Pin order: `base = reference`, always.** odiff's denominator and diff image
   use the base; swapping ref/actual changes the number (xl--footer: 57.63% with
   base=ref vs 41.70% with base=actual).
4. **Re-calibrate the severity floors for the *measured* distribution** and add a
   spatial second signal. PR #74's 0.25/0.10 floors were tuned for model-*guessed*
   diff_percent; measured pixel-% correlates poorly with perceived severity in
   both directions (see below). Use `captureDiffLines: true` (affected row indices)
   as a cheap spatial extent signal — catches the horizontal-shift case (small %,
   widely spread).
5. **Add options:** `ignoreRegions` for dynamic content (carousels, images);
   mention `ODiffServer` for batch (6+ checks per compare) to avoid spawn overhead.
6. **JSON-shape fix:** `diff_percent`/`diff_pixels` are only guaranteed on
   `pixel-diff`; `reason` values come from the real union.

### Empirical measurements (ref vs Storybook capture, v6)

| Pair | dims ref/actual | default | `antialiasing:true, threshold:0.1` |
|---|---|---|---|
| sm--header | 640×162 / = | 7.42% | 4.83% |
| xl--header | 1280×162 / = | 4.33% | **2.83%** |
| sm--header--expanded | 640×1600 / = | 2.71% | 1.28% |
| xl--header--expanded | 1280×1600 / = | 24.74% | 21.04% |
| sm--footer | 640×919 / 640×900 | 25.49% | 23.27% |
| xl--footer | 1280×699 / 1280×508 | 57.63% | 55.64% |

Deterministic, comparable, plausible ranking. AA+threshold 0.1 cuts ~35–50% noise.

### The one real risk — metric bias

Determinism fixes *model*-comparability, but **pixel-% ≠ perceived severity**:
- **Under-counts horizontal shifts:** xl--header nav items clearly doubled/offset
  (visually major) measured only **2.83%** → `minor` by the floors.
- **Over-counts vertical cascades:** a 19px footer height drift (`dimension_drift.h`
  ≈ 0.021, would "pass") cascades into 23% pixel-diff.
Mitigation: calibrate bands empirically (these 6 pairs are the seed) and combine
pixel-% with `captureDiffLines` extent + `dimension_drift`. Otherwise we trade
model bias for metric bias.

## Out of scope

- The design-verify polish-stage subagent hang (separate issue).
- Visual-compare overlay UI (separate follow-up).
