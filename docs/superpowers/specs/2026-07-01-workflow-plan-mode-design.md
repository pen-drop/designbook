# Workflow Plan Mode — Design

**Date:** 2026-07-01
**Status:** Approved, ready for implementation planning
**Pilot:** `design-screen` (mechanism is workflow-agnostic)

## Problem

`debo` workflows need a human present. Params resolve in two phases — deterministic
code resolvers at create-time, provider rules at task-time — and **whatever neither
phase covers, the task body asks the user** (`workflow wait` → ask → `workflow resume`).
Those interactive questions are the only thing preventing an unattended run.

The original ask: *"a plan mode that generates the prompt so the workflow can run
autonomously."* The deliverable is a **prompt** — a plaintext plan captured once with
the human, then replayed so the workflow runs end-to-end with nobody watching.

## Key finding (design-screen)

`design-screen` has six stages, but **only `intake` asks the user anything.** The
other five — `extract-reference`, `create-component`, `create-sample-data`,
`map-entity`, `create-scene` — are deterministic: they derive everything from
data-model + scenes + blueprints + rules. Their "confirm/choose" lines are about
deriving values, not questioning the human.

So autonomy for a workflow = pre-answering its **interactive** stage(s). For
design-screen that is `intake` alone. Its five decisions:

| # | Decision | Shape |
|---|----------|-------|
| D1 | Which section | value pick |
| D2 | Screen type: landing / overview / detail | enum |
| D2a | Embedded entity lists? | conditional — only if landing |
| D3 | Entity plan | confirm/edit a runtime-derived table |
| D4 | Component plan | confirm/edit a runtime-derived table |
| D5 | Final build-plan confirmation | gate |

The intake `result:` schema declares *outputs* (`components[]`, `entity_mappings[]`,
`scenes[]`, …) — large derived structures — **not** the discrete human inputs. The
five decisions exist only as prose in the task body. Nothing machine-readable
enumerates "what the user is asked." Capturing those decisions is the job of plan mode.

## Approach

Do **not** build separate decision manifests, and do **not** duplicate the intake
derivation logic. **The intake stage already is the interview** — it asks every
question and produces schema-validated results. Plan mode reuses it:

1. Run the interactive stage(s) once with the human.
2. Capture the decisions as a **plaintext plan** (`<wf>.plan.md`).
3. Replay: the interactive stage runs again but **reads the plan instead of asking
   the human**, emitting the same structured result from the plan + current files.
   The deterministic tail then runs with nobody present.

This changes only the last clause of the engine's existing contract — *"what neither
param phase covers, the task body asks the user"* becomes *"…reads the plan."* No
scope-seeding path is added to the engine; the interactive task consumes the plan itself.

## The one new primitive

`interactive: true` on a **stage** (fits the existing `steps` / `isolate` / `domain`
shape). Only intake-type stages carry it. Everything else derives from this flag —
where plan capture stops, and which stages read the plan on replay.

## Flows

### `debo <wf> --plan` (capture)

1. `workflow create` — resolve code params, interactively fill any `unresolved`.
2. Run the linear prefix **up to and including the last `interactive` stage**, asking
   the human normally.
3. As each interactive stage completes, write its decisions to `<wf>.plan.md`.
4. Stop. Abandon the throwaway instance — the plaintext plan is the portable artifact.

### `debo <wf> --from-plan <file>` (replay, autonomous)

1. `workflow create` — resolve params from the plan.
2. The interactive stage runs but **reads the plan instead of asking the human**, and
   emits its normal structured result from the plan + **current files**.
3. Deterministic tail runs, no human.
4. Engine auto-archives when every task is done = finished. (No custom termination —
   `workflow done` already auto-archives when no pending tasks remain.)

**Degrade rule:** if replay reaches an interactive decision the plan does not cover
(stale plan, new branch), pause and ask the human. Autonomy is best-effort; it never
guesses a wrong answer.

## Plan file — `<wf>.plan.md` (plaintext)

Human-readable and human-editable. Contains exactly three things:

1. **Workflow + resolved params** — story_id, section, reference_url, breakpoints, and
   any param the human corrected during the `unresolved` loop. So replay never re-asks.
2. **Intake decisions as prose** — section, screen type, embedded lists, the entity
   list, the component list.
3. **Freeform notes** — tacit human intent the intake schema does not capture
   ("hero full-bleed", "no footer here"). This is why plaintext wins over a structured
   dump: it holds the context structured results drop.

The plan does **not** snapshot data-model / vision / tokens / scenes. Execute **always
reads current files fresh** — the plan is decision-level, not a data snapshot. This is
deliberate: it matches the project's disposable-artifacts philosophy and keeps the plan
small and editable. The trade-off is accepted: if the workspace changes between plan and
run, deterministic stages re-derive against the latest state; only interactive drift is
caught (by the degrade rule).

## Handover completeness

The deterministic tail consumes: resolved params (in the plan), intake results
(produced fresh on replay from the plan), on-disk artifacts (read fresh), and
before/after hooks (`css-generate` if-never-run, `design-verify` when `reference_url`
set — handled by the engine on the fresh execute instance). Isolated stages
(`create-component`, `create-scene`) read their rules/blueprints fresh in their own
subagent. **No extra structural handover is needed** beyond the three plan-file items.

## Engine changes (small)

1. Parse `interactive: true` on stages.
2. `--plan`: stop after the last interactive stage; the interactive task additionally
   emits its decisions to `<wf>.plan.md`.
3. `--from-plan <file>`: the interactive task reads the plan instead of asking the user.

## Known caveat → concrete action

Plan phase runs the **linear prefix**, so a late interactive stage forces deterministic
work (e.g. browser reference extraction) before it. **Design rule: interactive stages go
first.** `design-screen` currently lists `reference` before `intake`, but intake declares
no dependency on reference data (its body even notes reference runs after intake).
**Action: move `intake` ahead of `reference`** so the plan phase is `intake` only — cheap,
no browser extraction.

## Rollout

The mechanism is workflow-agnostic. **First proven on `design-screen`.** Other workflows
opt in by adding `interactive: true` to their interactive stage(s) and having those tasks
read the plan on replay.

## Out of scope

- Decision manifests / static question schemas (rejected — intake already is the interview).
- Structured plan files, scope-seeding into the engine (rejected — plaintext prompt is the deliverable).
- Artifact snapshotting / staleness guards (rejected — always read current files).
- Autonomous fallback/queue for uncovered decisions (rejected — degrade to interactive pause).
