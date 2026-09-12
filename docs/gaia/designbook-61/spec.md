# DESIGNBOOK-61 — Spec handoff

**Ticket:** DESIGNBOOK-61  
**Workflow:** `gaia_feature` · **Sub-works:** `work:code`, `work:docs`  
**Task-Art:** skill-refactor  
**Runtime / scenario:** no application UI walkthrough (`scenario_required: false`). Validation = unit/contract tests + representative `debo-test` cases + doc/skill consistency + `pnpm check`.

**Design method:** `superpowers:brainstorming` (architectural) with human-approved decisions; plan via `superpowers:writing-plans`.

## Canonical documents

| Doc | Path |
|---|---|
| Design | [`docs/superpowers/specs/2026-09-10-designbook-61-optional-plans-reference-approval-design.md`](../../superpowers/specs/2026-09-10-designbook-61-optional-plans-reference-approval-design.md) |
| Implementation plan | [`docs/superpowers/plans/2026-09-10-designbook-61-optional-plans-reference-approval.md`](../../superpowers/plans/2026-09-10-designbook-61-optional-plans-reference-approval.md) |

## Decisions locked at spec gate

1. **Ephemeral sealed plan** for plan-free runs (same `plan build` / `plan done` path; no durable plan left).
2. **Execution modes:** `ephemeral` | `persist` | `ask`; caller override wins; vision→ephemeral; design create/rebuild→ask; explicit persist stops before execute.
3. **`sb` stays passthrough** (no workflow). Workflow skills are not converted into `sb`.
4. **Reference approval** as `approval.yml` beside the published revision (fingerprint + scope + status). Designbook presents screenshots; GAIA routes only.
5. **Escalation** via precise blockade + user intervention (not a heavy complexity scorer). Spec lists illustrative counterexamples for AC-4.
6. **No migrations** of old plans (AC-10).

## Alternatives rejected

- Direct-task CLI bypassing MD plans  
- Always-durable plans with execute skipped only  
- GAIA-comment-only or procedural-only approval  

## Risks (summary)

Ephemeral cleanup, agents skipping approval checks, GAIA coding still auto-executing via intake — mitigations in the design doc.

## Test plan head

Unit: ephemeral build + approval checks.  
debo-test: vision ephemeral; bounded scene update; persist-without-execute; approve/reject reference; blockade messaging.  
`pnpm check`. Details in the design doc § Test plan and the implementation plan Tasks 1–7.
