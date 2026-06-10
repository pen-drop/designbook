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

## Out of scope

- The design-verify polish-stage subagent hang (separate issue).
- Visual-compare overlay UI (separate follow-up).
