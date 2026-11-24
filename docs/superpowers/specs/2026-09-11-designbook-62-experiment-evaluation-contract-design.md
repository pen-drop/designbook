# DESIGNBOOK-62 — Experiment / evaluation contract for Task & Rule changes

**Ticket:** DESIGNBOOK-62  
**Date:** 2026-09-11  
**Task-Art:** experiment-harness  
**Sub-works:** `work:code`, `work:docs`  
**Status:** Approved for implementation planning (human Spec gate)  
**Design method:** `superpowers:brainstorming` (architectural) → `superpowers:writing-plans`

## Problem

Today Designbook can run fixture cases (`debo-test` / Promptfoo), collect native usage (DESIGNBOOK-58), isolate workspaces (DESIGNBOOK-22), and gate reference screenshots (`approval.yml`, DESIGNBOOK-61). What is missing is a **general, durable experiment/evaluation contract** that answers, for one Task or Rule change:

> Did *this* change improve quality, clean up the flow, or reduce tokens / time / tool calls — under fair, comparable conditions — with evidence that survives workspace cleanup?

DESIGNBOOK-58 is a concrete optimization experiment, not that general contract. DESIGNBOOK-16/21 cover GAIA tester flow and score publish. This ticket owns the overarching Branch+Experiment → Variants → Runs → layered judgments model, measurement boundaries, retention, comparison surface, and representative contract tests.

## Goals

1. Versioned **experiment data model** with primary identity **branch + experiment**, mandatory ticket ref, and immutable VCS identity per variant/run (commit + optional sealed diff).
2. **Three independent evaluation levels:** static artifacts, flow/performance, optical (`design-verify` ⊥ human judgment).
3. **Native measurement contract** for tokens, time, tool calls, and model/provider/CLI binding — missing → `unknown`, never coerced to zero/pass.
4. **Fair comparison** rules: fixed inputs, fresh workspaces, harness vs product versioning, probes vs budgeted repeats, no cherry-picking, insufficient evidence → `unclear` / `not_evaluable`.
5. **Durable evidence** split: git holds manifests/reports; gitignored store holds raw logs/images/judgments; workspace wipe must not destroy proof.
6. **Comparison surface (v1):** Markdown report under `docs/experiments/<id>/` + CLI report/judge commands — not a Storybook addon, not a standalone web app.
7. **Reference approval modes** `interactive` | `recorded` | `simulated` — simulated/recorded never count as real human approval or human optical design judgment.
8. Representative **fresh contract tests** including false improvement, missing usage, tool failures, model swap, reference mismatch, open/rejected human judgment, and an interactive extract-reference proof path; `pnpm check` green before commit.

## Non-goals

- Changes to the GAIA agent scheduler.
- Replacing Promptfoo as the workflow runner (extend it; do not fork a parallel runner).
- Migrations or compatibility readers for historical measurement artifacts — fresh runs only.
- Invented inner CLI subprocess counts when the provider does not expose them.
- Storybook addon UI or a separate long-lived web application in v1.

## Locked decisions (Spec gate)

| ID | Decision |
|---|---|
| D1 | Architecture = **contract layer over Promptfoo / debo-test** |
| D2 | Surface = **Markdown report + CLI** under/around `docs/experiments/` |
| D3 | Retention = **git manifests/reports + gitignored durable evidence store** |
| D4 | Human optical judgment v1 = **CLI judge → `judgment.yml`** |
| D5 | Reference approval = **`interactive` \| `recorded` \| `simulated`** with provenance tags; only `interactive` (real attended) counts as real human approval |
| D6 | No GAIA scheduler work; no Promptfoo replacement; no legacy measurement migrations |

## Current baseline (facts)

| Piece | Today |
|---|---|
| Runner | Promptfoo via `debo-test run` / `research` / `verify` |
| Usage | Native adapters (`codex-usage.mjs`, Claude/Grok providers); CSV columns include tokens, duration, `usage_source`, `usage_scope`, `evidence_dir`, reasoning |
| Evidence dirs | Per-run report dirs under `promptfoo/reports/`; workspaces under `promptfoo/workspaces/` (gitignored) |
| DESIGNBOOK-58 | `docs/experiments/designbook-58/` manifest + narrative results — pattern to generalize, not the contract |
| Reference approval | `approval.yml` beside revision; unit tests cover status/scope/fingerprint, **not** “was the human actually asked?” |
| extract-reference fixture | `fixtures/drupal-web/cases/extract-reference.yaml` writes `approved` without interactive user |
| Optical verify | `design-verify` / `debo-test verify` — machine channel only |

## Architecture

```
docs/experiments/<experiment-id>/
  experiment.yml          # durable contract + hypothesis + variant stubs
  comparison.md           # human-facing report (committed)
  index.json              # optional small findability index (committed)

promptfoo/evidence/<experiment-id>/<run-id>/   # gitignored durable store
  envelope.yml            # ticket/experiment/variant/run identity (does not rewrite raws)
  native/                 # copied provider transcripts / thread logs
  screenshots/            # result + reference images for optical bind
  tool-ledger.jsonl       # top-level tool invocations
  phases/*.yml            # per-phase metrics + model binding
  evaluations.yml         # static / flow / optical channels
  judgment.yml            # human optical judgment (when recorded)
  approval-provenance.yml # how reference approval was obtained (mode + tag)

debo-test / Promptfoo
  → executes cases into workspaces (ephemeral)
  → measurement normalizer writes into evidence store
  → report generator updates docs/experiments/.../comparison.md
```

**Harness vs product:** experiment records `harness_commit` (tester/promptfoo/schema) separately from variant product commits (skills under `.agents/skills`). A harness-only change cannot be reported as a product Task/Rule improvement.

## Data model

### Experiment

```yaml
schema_version: 1
id: db62-task-foo-tighten-rule
ticket: DESIGNBOOK-62          # required
primary_key:
  branch: feat/...
  experiment: db62-task-foo-tighten-rule
hypothesis: |
  Tightening rule X reduces correction loops on design-shell without quality loss.
affected:
  tasks: []                    # paths under .agents/skills/...
  rules: [.agents/skills/designbook/.../some-rule.md]
  note: "joint rule edit ⇒ joint-change claims only"
baseline:
  repo: designbook
  branch: feat/designbook-56-designbook
  commit: <sha>
  diff_artifact: null          # optional sealed diff path in evidence
candidate:
  repo: designbook
  branch: feat/...
  commit: <sha>
  diff_artifact: evidence://.../candidate.diff
cases:
  - suite: drupal-web
    case: design-shell
    validate: design-verify    # or none
expected_effect:
  quality: improve_or_hold
  flow: fewer_corrections
  tokens: reduce_or_hold
models_constant: true          # false ⇒ model swap is an explicit extra factor
budget:
  probe_first: true
  repetitions_per_variant: 3
  max_wall_ms: ...
  max_tokens: ...
  abort_rules: [first_hard_infra_fail, budget_exceeded]
harness:
  commit: <sha>
  promptfoo_schema: 1
```

### Run / phase / evaluation (evidence store)

Each run envelope references experiment id, variant (`baseline`|`candidate`|named), case, workspace id (ephemeral), evidence root (durable), outcome, abort flags.

Phases record: name, agent role, requested vs effective `{provider, cli, model, version, reasoning}`, token usage (input, cache_read, cache_write, output, reasoning, totals + source + scope), durations (setup / user_wait / active / verify / wall), tool-call aggregates, log anchors.

Evaluations object (all channels independent):

```yaml
static: { status: pass|fail|unknown, checks: [...] }
flow: { status: clean|failed_corrected|blocked|unknown, findings: [...], planned_reference_prompts_excluded: true }
optical:
  design_verify: { status: pass|fail|not_applicable|unknown, score: ..., image_refs: [...] }
  human: { status: pass|fail|pending|not_applicable|unknown|rejected, judgment_ref: judgment.yml }
final_positive: false   # true only when required channels allow; visual+pending human ⇒ false
```

## Measurement boundaries (normative)

1. **Tokens** — report native counters with source/scope; cache and reasoning are subsets, not extra addends on top of a total that already includes them. Failures, corrections, planning, extraction, verification count. Incomplete native logs ⇒ entire usage field `unknown` for that scope (do not emit partial zeros as if measured).
2. **Time** — separate setup, user-wait, active model/tool, verify, and wall. Parallel work: publish **elapsed** and **summed active** distinctly; never equate.
3. **Tool calls** — count each **top-level** tool invocation observed by the harness (name, ok/fail, retries, duration, phase/agent, task when attributable). A bundled multi-tool turn counts as N top-level calls. Inner CLI subprocesses inside one tool are **not** estimated; only provider-exposed nested calls may appear, labeled as such.
4. **Models** — every phase/agent row stores requested vs effective identity. Unknown effective values stay unknown. Holding models constant is the default for Task/Rule comparisons; a model change is its own comparison or an explicit extra factor in the experiment.
5. **Raw logs** — never rewrite. Identity lives in `envelope.yml` / manifest links. Navigation: report → evidence path → native file.

Reuse and extend DESIGNBOOK-58 / existing CSV+adapter semantics; do not invent a second incompatible counter vocabulary.

## Three test levels

| Level | Proves | Does not prove |
|---|---|---|
| Static | Expected files/schemas/refs; preserved neighbors | Visual or flow quality |
| Flow/performance | Completion shape, failures, corrections, blocks, tokens/time/tools | Human aesthetic OK |
| Optical | Machine verify score **and/or** human judgment on bound images | Either channel alone is final for visual work |

Distinguish: file present but invalid; clean run; failed-then-corrected run. Planned reference-approval interaction is **not** a flow disturbance.

## Reference approval vs human optical judgment

Two different human gates:

| Gate | Artifact | Modes | Counts as |
|---|---|---|---|
| Reference screenshot approval | revision `approval.yml` + `approval-provenance.yml` | interactive / recorded / simulated | Real human **reference** approval only when mode=interactive (attended ask→answer). Never equals design-quality judgment |
| Human optical design judgment | `judgment.yml` | CLI judge (blind optional) | Human **design** pass/fail/unclear; required for final positive on visual cases |

**AC-11 behavior:**

- Interactive path: present real screenshots, ask explicitly, remain `pending` without answer, wait; on `rejected`, dependent planning stays blocked (`reference approval-check` fails).
- Fixture/automation may use `simulated` or `recorded`, but reports and promotion logic **refuse** to treat those as real human approval or as human optical judgment.
- Update `fixtures/drupal-web/cases/extract-reference.yaml` (and siblings) so auto-`approved` without provenance tag is invalid under the new contract.

## Fair comparison and verdicts

- Freeze case inputs, reference revisions, thresholds, model settings, and relevant env before a compare.
- Baseline and candidate each get **fresh isolated** workspaces (existing `debo-test` / `--workspace` machinery).
- Probe run is diagnostic only — never sole improvement proof.
- Pre-declare repetition count, budgets, abort rules; show dispersion, success rate, all attempts, missing evidence.
- No cherry-pick of the cheapest successful run.
- Early abort with fewer tokens is **not** a savings claim.
- Verdict dimensions stay separate (quality, cleanliness, tokens, time, tools). Skipping work ≠ improvement. Quality↑ + cost↑ is a documented tradeoff.
- Insufficient evidence ⇒ `unclear` / `not_evaluable` — never a positive overall verdict.

## Comparison surface (v1)

Committed `comparison.md` plus CLI:

- `debo-test experiment report <experiment-id>` — render/find experiment by branch+experiment (primary), also ticket, task/rule, case, model combo.
- `debo-test experiment judge <evidence-run>` — side-by-side image paths (identical scope), optional blind labels, write `judgment.yml` (evaluator, timestamp, criteria, rationale, blind flag).
- Skill index gains an `experiment` sub-skill (or equivalent documented commands) beside `run` / `verify` / `research` / `is-clear`.

Report shows: variants, model roles, per-phase metrics deltas, all three levels, links into durable evidence, all attempts (pass and fail). Intended UI artifacts for the design aspect are **these Markdown+CLI surfaces**, not Designbook components — **no design intake** in Spec.

## Intended code / docs touchpoints (for the plan)

| Area | Likely touch |
|---|---|
| Schema + IO | new `promptfoo/experiments/` or `packages/...` module: load/validate `experiment.yml`, envelopes, evaluations |
| Measurement normalizer | wrap existing provider usage + new tool ledger writer into evidence store |
| Gitignore | add `promptfoo/evidence/` |
| CLI | extend designbook-test skill index + scripts for `experiment`, `judge`, report generation |
| Fixtures | extract-reference case provenance; one Task-change and one Rule-change representative experiment fixtures |
| Docs | `promptfoo/README.md`, designbook-test skill prose, experiment authoring guide under `docs/experiments/README.md` |
| Unit tests | schema validation; unknown usage; double-count guards; simulated approval non-promotion; false-improvement verdict; model-swap visibility; open/rejected judgment blocks final positive |
| Checks | `pnpm check` |

Exact file list and TDD steps belong in the implementation plan after this Spec is approved.

## Alternatives rejected

| Alternative | Why rejected |
|---|---|
| Storybook addon comparison panel | Heavier coupling; Spec gate chose Markdown+CLI |
| Standalone local web app | Extra surface to maintain in v1 |
| New runner beside Promptfoo | Duplicates isolation/setup; ticket says reuse Promptfoo |
| Docs-only convention without schema | Fails AC-10 contract tests; drifts |
| Always-interactive reference approval | Rejected after clarification — not every reference check needs a human; modes cover automation safely |
| Git-track all raw evidence | Repo bloat; large logs/binaries |

## Risks

| Risk | Mitigation |
|---|---|
| Agents treat simulated approval as human proof | Hard tag + report/final_positive guards; tests for non-promotion |
| Evidence path drift / lost links after cleanup | Stable relative scheme from `docs/experiments` → `promptfoo/evidence`; CI assert workspace wipe ≠ evidence wipe |
| Double-counting cache/reasoning/parallel time | Normative counters + unit tests from AC-4 |
| Joint rule edits over-claimed as single-cause | Experiment schema forces joint note; report wording |
| Attended interactive tests block CI | Mark interactive cases attended-only; simulated/recorded for smoke; one documented interactive proof path for AC-11 |
| Harness improvements look like product wins | Separate `harness.commit` vs variant commits in every report |

## Test plan (Spec-level; detailed in implementation plan)

**Contract / unit (fresh, representative):**

1. False improvement: lower tokens via skipped verify → not an improvement verdict.
2. Missing usage → `unknown`, not `0`.
3. Tool failure + retry ledgered; planned reference prompt excluded from disturbance counts.
4. Model swap visible; requested ≠ effective retained.
5. Reference revision mismatch / under-scoped approval → no single-change claim.
6. Open or rejected human judgment → `final_positive` false for visual case; non-visual → optical `not_applicable`.
7. Simulated approval cannot satisfy “real human approval” assertions.
8. Interactive extract-reference path: pending without answer; approve/reject; reject blocks dependent planning (attended or recorded-tape proof as allowed by D5).

**Integration:** one Task-change experiment fixture and one Rule-via-consuming-task fixture through the contract (traceability AC-2).

**Repo gate:** `pnpm check` (typecheck → lint → test).

**Scenario mapping:** `scenario_required: true` — abstract Gherkin/CLI scenarios cover comparison report findability, judge flow, and reference-approval modes (commands + expected artifacts; not a Designbook screen intake). Standing ACs: `work:code` translation validated; `work:docs` translation validated.

## AC coverage (design → criterion)

| AC | Addressed by |
|---|---|
| AC-1 | This Spec (data model, bounds, comparability, states, retention, surface, test plan) |
| AC-2 | Experiment/variant/run identity + Task and Rule fixtures |
| AC-3 | Separated evaluation channels + flow distinctions |
| AC-4 | Measurement boundaries + unknown semantics |
| AC-5 | Phase/agent model binding |
| AC-6 | Fair-compare freezes + identical upstream artifacts for phase compares |
| AC-7 | Probe/repeat/budget/dispersion/no cherry-pick/unclear |
| AC-8 | Optical channels independent + image binding + final_positive rule |
| AC-9 | Markdown+CLI surface + durable evidence links |
| AC-10 | Contract tests list + `pnpm check` |
| AC-11 | Approval modes + interactive proof + non-promotion of simulated |

## Prior art (reuse, do not rebuild)

- DESIGNBOOK-58 — measurement adapters, evidence dirs, experiment folder narrative  
- DESIGNBOOK-16/21 — debo-test task kind / GAIA score publish  
- DESIGNBOOK-22 — isolated parallel workspaces  
- DESIGNBOOK-61 — reference approval gate (extend provenance; tester must support)

---

**Next after Spec approval:** `superpowers:writing-plans` → checkbox implementation plan at `docs/superpowers/plans/2026-09-11-designbook-62-experiment-evaluation-contract.md`, then GAIA `spec` + `test` comments and human confirm before `coding`.
