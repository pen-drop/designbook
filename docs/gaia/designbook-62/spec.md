# DESIGNBOOK-62 — Spec handoff

**Ticket:** DESIGNBOOK-62  
**Workflow:** `gaia_feature` · **Sub-works:** `work:code`, `work:docs`  
**Task-Art:** experiment-harness  
**Runtime / scenario:** `scenario_required: true` — CLI/Markdown comparison surface, reference-approval modes, human optical judge (not a Designbook screen intake). Validation = contract unit tests + representative fixtures + doc/skill consistency + `pnpm check`.

**Design method:** `superpowers:brainstorming` (architectural) with human-approved decisions; plan via `superpowers:writing-plans`.

## Canonical documents

| Doc | Path |
|---|---|
| Design | [`docs/superpowers/specs/2026-09-11-designbook-62-experiment-evaluation-contract-design.md`](../../superpowers/specs/2026-09-11-designbook-62-experiment-evaluation-contract-design.md) |
| Implementation plan | [`docs/superpowers/plans/2026-09-11-designbook-62-experiment-evaluation-contract.md`](../../superpowers/plans/2026-09-11-designbook-62-experiment-evaluation-contract.md) |

## Decisions locked at Spec gate

1. **Contract layer over Promptfoo/debo-test** (no new runner; no Storybook addon; no standalone web app).
2. **Retention split:** git `docs/experiments/<id>/` manifests + `comparison.md`; gitignored `promptfoo/evidence/<id>/<run-id>/` for raw proof.
3. **Human optical judgment v1:** `debo-test experiment judge` → `judgment.yml`.
4. **Reference approval modes:** `interactive` | `recorded` | `simulated` — only interactive counts as real human approval; never promote simulated/recorded to human optical design judgment.
5. **Measurement:** native tokens/time/tool-calls with unknown≠0; top-level tool counts only; models requested vs effective; dimensions stay separate.
6. **No** GAIA scheduler changes, Promptfoo replacement, or legacy measurement migrations.

## Alternatives rejected

- Storybook addon panel; standalone local web app; new experiment runner beside Promptfoo; docs-only convention; always-interactive reference approval.

## Risks (summary)

Simulated approval treated as human proof; evidence path drift after workspace wipe; double-counting; joint-rule over-claim; attended interactive tests vs CI — mitigations in the design doc.

## Test plan head

Unit/contract: false improvement, missing usage, tool failures, model swap, reference mismatch, open/rejected judgment, simulated non-promotion.  
Fixtures: one Task-change + one Rule-via-consuming-task stub.  
Attended: interactive extract-reference proof path.  
`pnpm check`. Details in Spec § Test plan and plan Tasks 1–8.
