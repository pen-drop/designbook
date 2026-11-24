# DESIGNBOOK-61 — Direct tasks, optional plans, reference approval, GAIA orchestration

**Ticket:** DESIGNBOOK-61  
**Date:** 2026-09-10  
**Task-Art:** skill-refactor  
**Sub-works:** `work:code`, `work:docs`  
**Status:** Approved for implementation planning (spec gate)

## Problem

Today every Designbook workflow intake follows the shared builder and then **automatically** invokes `execute-workflow` on a **durable** sealed MD plan at `$DESIGNBOOK_DATA/plans/<workflow>.plan.md`. That is valuable for large design jobs and for handing a fixed plan to a cheaper executor, but it is wrong for:

- simple flows such as `vision` (result artifact `vision.yml` must still be written; a durable execution plan need not remain);
- clearly bounded edits to an existing scene (must not rewrite unrelated scenes or duplicate entries);
- GAIA delegation, where planning, reference preparation, approval, and design execution must be **separable starts** under GAIA’s agent routing — Designbook must not embed a scheduler or model names.

DESIGNBOOK-56/57 assumed saved definition + automatic execution. This ticket **explicitly changes** that while keeping the same task / rule / blueprint / param / result-validation guarantees. DESIGNBOOK-59’s MD-plan engine stays the contract spine. DESIGNBOOK-37 improved reference visibility but did not add an approval gate.

## Goals

1. Separate three decisions: **domain planning**, **whether to persist an execution handoff**, **whether to start execution**.
2. Direct / plan-free runs must still use the **same** sealed-plan assembly and `plan done` validation — no shortcut past contracts (AC-7).
3. Explicit persist produces a complete executable handoff and **does not** start design build (AC-3).
4. Missing references become a transportable **ReferenceNeed**; extraction and **screenshot approval** are separate starts; dependent design cannot skip approval (AC-5/AC-6).
5. Full flow works standalone (same conversation) and under GAIA (different agents) without duplicated rules/tasks (AC-7).
6. No migrations or legacy plan readers (AC-10).

## Non-goals

- Designbook-owned agent scheduler or hardcoded model selection.
- Turning workflow skills into `sb`-style CLI passthroughs (`sb` remains the only no-workflow kind).
- Rewriting historical DESIGNBOOK-56/57 specs in place.
- Migrating or repairing old on-disk plans/artifacts.

## Current baseline (facts)

| Piece | Today |
|---|---|
| Builder | `intake` → agent `tasks.json` → `plan build` → sealed MD plan |
| Executor | `execute-workflow` → `plan steps` / `plan instructions` / `plan done` |
| Skill prose | Nearly all intakes auto-call `execute-workflow` after build |
| `plan build --output` | Already can write somewhere other than canonical `plan_path` |
| `sb` | CLI passthrough skill — no `workflows/`, no plan |
| Reference publish | Fingerprints revision; explicitly leaves screenshot correctness to the human |
| Approval gate | Procedural only — no machine-checkable approval record |
| GAIA `designbook-gaia` | Spec describes scope without intake (because intake auto-executes); coding runs full intake+execute |

## Design decisions

### D1 — Skill kinds (explicit)

1. **Passthrough** — e.g. `sb`: skill prose dispatches CLI only. Unchanged.
2. **Workflow intake** — vision, design-*, extract-reference, …: still assemble a sealed plan and validate via `plan done`. Never a second “naked task” engine.

### D2 — Ephemeral sealed plan for plan-free runs (chosen)

Plan-free means **no durable** `$DESIGNBOOK_DATA/plans/<workflow>.plan.md` left for handoff — not “skip sealing.”

- `plan build --ephemeral` (or equivalent) writes a sealed plan under an ephemeral location (e.g. `$DESIGNBOOK_DATA/plans/.ephemeral/<id>.plan.md` or a process temp path recorded in the build response).
- Execution uses the **same** `execute-workflow` / `plan *` loop against that path.
- After successful completion (or explicit abandon), the ephemeral plan is removed; result artifacts (`vision.yml`, scene files, …) remain.
- Persist mode continues to write the canonical durable `plan_path` and **stops without execute**.

Rationale: one contract path; AC-2 and AC-7 both hold; `--output` already exists as a wedge.

### D3 — Execution modes

Caller override always wins. Modes:

| Mode | Persist durable plan? | Start execute? |
|---|---|---|
| `ephemeral` | No (temp only) | Yes |
| `persist` | Yes | No |
| `ask` | After user choice | After user choice |

**Defaults when unset:**

- `vision` and similarly simple foundation flows whose intake is a short fixed palette → `ephemeral`.
- Explicit “plan/save”, GAIA handoff that must leave an executable plan, or caller `--persist` / mode persist → `persist`.
- `design-*` **create / rebuild** with no override → `ask` (here / hand to GAIA / save+stop).
- `design-*` **change** of an existing named target may start `ephemeral` and rely on blockade (D5) when the work cannot stay bounded.
- `extract-reference` remains its own workflow; it does not silently chain into design execute.

Surface the mode in skill intake prose and, where useful, as a CLI/intake option documented in `cli-workflow.md` / `workflow-building.md`. Do not invent a Designbook model router.

### D4 — ReferenceNeed + revision-side approval (chosen)

**ReferenceNeed** (transportable, written or returned by the design planner when a needed revision is missing/unapproved):

```yaml
kind: ReferenceNeed
workflow: design-screen   # caller that paused
return_to:                # enough to resume planning without re-deriving scope
  target: homepage
  unresolved: [hero visual baseline]
need:
  role: reference
  source: website         # or figma | storybook
  subjects: [hero]
  states: [default]
  views: [desktop]
  candidate_locators: { hero: "…" }  # optional hints
reason: "No approved revision covers hero@default@desktop"
```

**Approval record** beside the published revision (same directory as `publication.json`):

```yaml
# approval.yml
status: pending | approved | rejected
fingerprint: "<sha256 matching publication binding>"
scope:
  subjects: [hero]
  states: [default]
  views: [desktop]
# set on decision:
decided_at: "ISO-8601"
note: ""
```

Rules:

- New or changed captures start as `pending`. Design planning that **depends** on that revision+scope MUST see `approved` with matching fingerprint and a scope that covers the need; otherwise block with an exact message.
- Unchanged, already-approved revisions are reusable.
- Any content change that alters the publication fingerprint **invalidates** approval (treat as not approved).
- Rejection → correct/re-extract; dependent design planning stays suspended.
- Text-only changes that need no new visuals do not invent a ReferenceNeed.

**Who presents screenshots:** the Designbook agent running `extract-reference` (or the planner when it already has the revision files) shows the actual PNGs to the user and records the decision into `approval.yml`. GAIA only routes which agent runs which step and waits on the outcome — it does not invent selectors or approve blindly from ticket text.

### D5 — Escalation = precise blockade, user intervenes (chosen)

No heavy numeric complexity classifier. If intake or execution cannot proceed without inventing scope, expanding targets, skipping approval, or adding undeclared tasks:

1. Stop.
2. Report **exactly why** (missing approval, would need new component X, palette requires map-entity/sample-data cascade, digest/param failure, …).
3. Wait for the user (standalone) or return the blockade to GAIA (orchestrated).

The executor still must not silently widen scope (AC-8).

**Illustrative escalate / blockade cases** (for AC-4; not a scoring rubric):

- “Tweak homepage hero copy” grows into a new card component + entity mapping + sample data.
- Scene edit that would alter shell slots or other sections’ scenes.
- Visual change whose approved reference no longer matches; needs fresh capture + approval.
- Multi-scene or section-wide restyle requested as a “small change.”

### D6 — GAIA vs standalone

Same Designbook contracts. Differences are only **who** runs which start:

| Start | Standalone | GAIA |
|---|---|---|
| Domain planning | Strong agent in-chat | Strong agent (GAIA-assigned) |
| extract-reference | Same conversation (or user defers) | May be cheaper agent |
| Reference approval | User in-chat; Designbook writes `approval.yml` | User confirms; record still on disk |
| Design execute / persist | Mode from D3 | Persist handoff for coding agent, or ask |

`designbook-gaia` coding must be able to consume a **pre-built durable plan** via `execute-workflow` without re-running intake that auto-executes. Spec may record intended mode + ReferenceNeed without invoking an auto-executing intake.

### D7 — CLI / API shape

| Command / flag | Role |
|---|---|
| `plan build <wf> --tasks …` | Unchanged durable default → canonical `plan_path` |
| `plan build <wf> --tasks … --ephemeral` | Seal to ephemeral path; JSON includes `ephemeral: true`, `plan` path |
| `plan build … --output <path>` | Keep; ephemeral may use this internally |
| `execute-workflow` / `plan steps|instructions|done` | Unchanged semantics |
| Approval helpers | Small CLI or documented file IO: write/read/validate `approval.yml` against `publication.json` fingerprint + scope cover |
| Skill mode | Intake/skill prose honors mode; optional flag documented next to global flags |

No `--plan` / `--from-plan` revival of the pre-59 interactive plan-mode design; this ticket builds on the MD-plan engine.

### D8 — Error / resume / return-to-planning

| Situation | Behavior |
|---|---|
| Durable plan, mid-execute | Resume via existing checkbox / `plan steps` |
| Ephemeral plan, interrupted | Re-run intake+ephemeral build (no durable resume); or user switches to `persist` first |
| Missing planning decision at execute | Blockade; return to planning — do not invent |
| Rejected / missing approval | Dependent design does not start; ReferenceNeed correction path |
| Agent switch | Handoff = durable `plan_path` and/or `ReferenceNeed` + approval status on disk |

## Responsibility split

| Concern | Owner |
|---|---|
| Task/rule/blueprint/param/validation contracts | Designbook MD-plan engine |
| Execution mode defaults + skill prose | Designbook skills (`workflow-building`, intakes, index) |
| ReferenceNeed emission | Design planner / design-* intake |
| Capture + publish | `extract-reference` |
| Screenshot presentation + `approval.yml` | Designbook agent in extract/approval step |
| Agent selection, delegation, user gates across agents | GAIA |
| Passthrough server control | `sb` (unchanged) |

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| New direct-task CLI bypassing MD plans | Duplicate contract surface; drifts from `plan done` |
| Always write durable plans; only skip execute | Fails AC-2 “ohne gespeicherten Ausführungsplan” |
| Approval only as GAIA comment | Breaks standalone AC-7; not machine-checkable for design intake |
| Procedural approval only | Fails AC-6 enforceability |
| Strict upfront complexity checklist | Replaced by precise blockade + user intervention (product choice) |

## Risks

| Risk | Mitigation |
|---|---|
| Ephemeral path leaks or collides | Unique id; cleanup on success; document crash leftover GC |
| Agents skip approval check | Hard gate in design intake before `plan build`; fixture for reject path |
| Mode matrix confuses authors | Small table in `workflow-building.md`; defaults per workflow intake |
| GAIA coding still auto-executes via intake | Update `designbook-gaia` to prefer execute-from-plan when persist handoff exists |
| Fixture churn | Fresh debo-test cases; no legacy plan migration |

## Test plan (spec-level)

`scenario_required: false` — no application Playwright BDD. Gates:

1. **Unit / contract (addon):** ephemeral `plan build` returns ephemeral path; approval fingerprint mismatch fails; scope cover check.
2. **debo-test (representative, fresh workspaces):**
   - `vision` ephemeral: `vision.yml` written; no durable plan left (or ephemeral cleaned).
   - Bounded existing-scene change: target scene updated; unrelated scenes/metadata preserved; no duplicates.
   - Explicit persist: durable plan exists; design artifacts for execute steps **not** started.
   - Reference approve then design; reference reject blocks design.
   - Blockade path: force a “small change” that needs new component → exact why, no silent scope expand.
3. **Docs / skills:** index + builder + executor + `designbook-gaia` + authoring notes consistent; load `designbook-skill-creator` when editing guarded files.
4. **`pnpm check`** before commit.

## Worked examples (AC-1)

1. **vision** — conversation → ephemeral seal → execute `create-vision` → `vision.yml`; no durable plan.
2. **Bounded scene change** — design-screen change existing scene → ephemeral → write-scene only; preserve others; blockade if scope grows.
3. **Design rebuild + reference** — ask mode → ReferenceNeed → extract-reference → user sees PNGs → `approval.yml` approved → persist or execute design per choice.
4. **GAIA** — strong planner emits need + later durable plan; cheap agent runs extract; user approves; cheap/other agent runs `execute-workflow` on persisted plan.
5. **Standalone** — same artifacts and gates in one conversation.

## Artifact paths

| Artifact | Path |
|---|---|
| This design | `docs/superpowers/specs/2026-09-10-designbook-61-optional-plans-reference-approval-design.md` |
| Implementation plan | `docs/superpowers/plans/2026-09-10-designbook-61-optional-plans-reference-approval.md` |
| GAIA mirror | `docs/gaia/designbook-61/` |
