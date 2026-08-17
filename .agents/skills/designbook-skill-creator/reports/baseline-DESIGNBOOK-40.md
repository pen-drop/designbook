# Baseline Report — DESIGNBOOK-40 (writing-layer spec)

A run of the extended `designbook-skill-creator` spec (`WRITE-01 .. WRITE-04` + the report-only
metrics `always_loaded_cost` / `body_sprawl`) over **all** skill trees plus the always-loaded
`CLAUDE.md`. This is the prioritised find-list from which the follow-up rewrite tickets are cut —
**no finding is fixed in DESIGNBOOK-40** (only the spec files change, plus the two in-scope drifts
already resolved in `designbook-skill-creator` itself).

Every finding is anchored to **file + check-ID** so a rewrite ticket can be scoped from it. Each
tree is either listed with findings or explicitly marked finding-free. Checks are all `warning`, so
none blocks; the metrics never deduct.

## Scope of this run

- Runner: `resources/validate.md` (LLM runner), writing-layer checks only.
- Trees: `designbook`, `designbook-skill-creator`, `designbook-drupal`, `designbook-css-tailwind`,
  `designbook-stitch`, `designbook-test`, `designbook-addon-skills`, `designbook-gaia`, `CLAUDE.md`.
- `AGENTS.md` is a symlink to `CLAUDE.md` (same inode) — scanned once as `CLAUDE.md`.

## Priority summary

| Priority | Where | Lever / check | Why first |
|---|---|---|---|
| P1 | `CLAUDE.md` | `WRITE-03` + `always_loaded_cost` | Always loaded every turn for every agent — the most expensive place a duplicate or no-op can sit |
| P1 | `designbook-gaia/SKILL.md` | `WRITE-01` + `always_loaded_cost` (73-word description) | Longest top-level model-invocable description; opens by restating identity |
| P2 | `designbook/resources/cli-workflow.md`, `workflow-execution.md` | `body_sprawl` (418 / 401 lines) | Largest bodies in the repo; prime progressive-disclosure targets |
| P2 | `designbook` sub-skill descriptions (`tokens`, `design-screen`, `sb`) | `WRITE-02` | Synonym triggers inflate always-loaded pointer cost |
| P3 | negation-phrased steps across `designbook` (138 hits) | `WRITE-04` | High volume, mechanical rewrite to positive targets |

---

## `CLAUDE.md` (always-loaded — repo root)

Reachability proof (AC-7): this run scans repo-root `CLAUDE.md` per `validate.md` Step 1, and
`rules/writing-files.md` carries `applies-to: CLAUDE.md`; the file appears in the metrics table
below.

| File | Check-ID | Severity | Finding |
|---|---|---|---|
| `CLAUDE.md` | WRITE-03 | warning | `## Skill Architecture` restates the 4-level model (`workflow → stage → task/blueprint/rule`) and the three-part architecture that `designbook-skill-creator/SKILL.md` › *Three-Part Project Architecture* / *4-Level Skill Model* owns authoritatively — one normative fact in two homes. Replace the restatement with a pointer. |
| `CLAUDE.md` | WRITE-03 | warning | `## Skill Architecture` restates the task-vs-blueprint-vs-rule split ("Tasks say WHAT … Blueprints are overridable … Rules are hard constraints") already owned by `rules/{task,blueprint,rule}-files.md`. |

Report-only metric: `always_loaded_cost(CLAUDE.md)` = 62 body lines, in context every turn — the
single most expensive file in the repo; the two `WRITE-03` duplications above are the first lines a
rewrite should prune.

## `designbook-skill-creator` (dogfood — AC-10)

**Zero errors from the new checks** (all `WRITE-` are `warning`, so the dogfood error-gate is met by
construction). Warning-level self-findings:

| File | Check-ID | Severity | Finding |
|---|---|---|---|
| `rules/writing-files.md` | body_sprawl | metric | 207 body lines — advisory only; proportional to covering five levers with correct/wrong pairs. No deduction. |

The two in-scope drifts named by the ticket are **resolved here, not deferred to the report**:
`common-rules.md` now points to the single-source structure description (was a `<concern>/` vs.
`skills/<workflow>/` `WRITE-03` divergence) and states both invocation keys (`user-invocable` /
`disable-model-invocation`). No `WRITE-01`/`WRITE-02` finding on `SKILL.md` (its description
front-loads "Authoritative spec for authoring…" and lists distinct file-type branches).

## `designbook` (core)

| File | Check-ID | Severity | Finding |
|---|---|---|---|
| `SKILL.md` | WRITE-01 | warning | Description opens "Designbook design system —" while `name: debo`; the identity clause competes with the trigger branches for always-loaded tokens. Borderline (also the trigger domain). |
| `skills/tokens/SKILL.md` | WRITE-02 | warning | "Choose colors and typography — design tokens. Use when the user mentions design tokens, `design-tokens.yml`, colors, or typography" — `colors`, `typography`, `design tokens` each appear in both the identity clause and the trigger list: synonyms for one branch. |
| `skills/design-screen/SKILL.md` | WRITE-02 | warning | "a screen, section scenes, or screen components" — "a screen" and "screen components" are near-synonyms selecting the same activation. |
| `skills/sb/SKILL.md` | WRITE-02 | warning | "Start, stop, restart, or inspect … Use when the user wants to **manage** the Storybook server" — "manage" is a synonym umbrella over the four verbs already listed. |
| `skills/import/tasks/intake--import.md` | WRITE-04 | warning | "The workflow order in Step 4 is fixed — do not reorder" → positive: "Run the Step 4 workflows in the order written." |
| `skills/import/tasks/run-workflow.md` | WRITE-04 | warning | "do not skip intake confirmation" → positive: "confirm intake for every sub-workflow." |
| `skills/install/rules/verify-storybook.md` | WRITE-04 | warning | "retry silently and do not mark the install successful" → positive success bound. |
| `resources/cli-workflow.md` | body_sprawl | metric | 418 body lines — largest file in the repo; disclose per-branch reference behind `SKILL.md` pointers. |
| `resources/workflow-execution.md` | body_sprawl | metric | 401 body lines. |
| `resources/cli-playwright.md` | body_sprawl | metric | 230 body lines. |

Volume note (WRITE-04): 138 negation-phrasings across the core tree. Many are legitimate
domain guardrails ("never content" on the config/scene boundary in `sync-to/`), which stay as
paired guardrails; the mechanical "do not <verb>" step instructions above are the rewrite targets.

## `designbook-drupal`

| File | Check-ID | Severity | Finding |
|---|---|---|---|
| `components/blueprints/form.md` | body_sprawl | metric | 205 body lines. |
| `data-mapping/blueprints/layout-builder-display.md` | body_sprawl | metric | 203 body lines. |

WRITE-04: ~50 negation-phrasings — audit in the rewrite ticket for step-instruction negations vs.
domain guardrails. No `WRITE-01`/`WRITE-02` finding (`disable-model-invocation: true`; description
is a human-readable one-liner, correctly trigger-stripped).

## `designbook-css-tailwind`

| File | Check-ID | Severity | Finding |
|---|---|---|---|
| `blueprints/jsonata-template.md` | body_sprawl | metric | 228 body lines. |

`disable-model-invocation: true` — description correctly a human-readable one-liner (no
`WRITE-01/02`). 14 negation-phrasings to audit in the rewrite ticket.

## `designbook-stitch`

Finding-free on `WRITE-01 .. WRITE-04`. `disable-model-invocation: true`, description a
one-liner (29 always-loaded cost, the lowest). Only 2 negation-phrasings.

## `designbook-test`

| File | Check-ID | Severity | Finding |
|---|---|---|---|
| `workflows/research.md` | body_sprawl | metric | 273 body lines. |
| `SKILL.md` | always_loaded_cost | metric | Model-invocable description ~85 words — a rewrite candidate for trigger pruning. |

18 negation-phrasings to audit.

## `designbook-addon-skills`

Finding-free on `WRITE-01 .. WRITE-04`. Model-invocable description is a tight 11-word pointer
(cost 46). Zero negation-phrasings.

## `designbook-gaia`

Per spec decision #6, the writing layer applies to this tree's `SKILL.md` level (description =
context pointer + always-loaded cost), **not** to 4-level structure rules (it has none).

| File | Check-ID | Severity | Finding |
|---|---|---|---|
| `SKILL.md` | WRITE-01 | warning | Description opens "GAIA integration for Designbook — provides the two GAIA workflow-step skills…" while `name: designbook-gaia`; the opening clause restates the identity the `name:` already carries. |
| `SKILL.md` | always_loaded_cost | metric | ~73-word description — the longest top-level model-invocable description in the repo; every word is permanent per-turn load. |
| `skills/debo-config-sync/SKILL.md` | always_loaded_cost | metric | Long single-line description (~53 words); model-invocable step-skill. Prune to firing triggers. |
| `skills/debo-designbook-design/SKILL.md` | always_loaded_cost | metric | Long single-line description (~53 words); as above. |

No `WRITE-04` step-negation findings (5 negation-phrasings, all guardrail-style). The two step-skill
descriptions front-load their role ("Own the diagnose, spec, coding…") and do not repeat identity —
no `WRITE-01`.

---

## Report-only metrics — always_loaded_cost (model-invocable descriptions)

Highest permanent per-turn pointer cost (word-count of the model-invocable `SKILL.md`
`description:`), rewrite-priority order:

| Skill | Description words (≈) |
|---|---|
| `designbook-gaia` | 73 |
| `debo-test` | 85 (parser-measured; verify at rewrite) |
| `designbook-skill-creator` | 70 |
| `debo-config-sync` / `debo-designbook-design` | ~53 each |
| `debo` (core) | 53 |
| `sync-verify` | 50 |

## Report-only metrics — body_sprawl (largest bodies)

| File | Body lines |
|---|---|
| `designbook/resources/cli-workflow.md` | 418 |
| `designbook/resources/workflow-execution.md` | 401 |
| `designbook-skill-creator/resources/schemas.md` | 359 |
| `designbook-test/workflows/research.md` | 273 |
| `designbook/resources/cli-playwright.md` | 230 |
| `designbook-css-tailwind/blueprints/jsonata-template.md` | 228 |
| `designbook-drupal/components/blueprints/form.md` | 205 |
| `designbook-drupal/data-mapping/blueprints/layout-builder-display.md` | 203 |

## How to cut rewrite tickets from this report

- One ticket per P1 row (`CLAUDE.md` de-duplication; `designbook-gaia` description prune).
- One `WRITE-02` ticket bundling the core sub-skill descriptions.
- One `WRITE-04` ticket per tree, scoped to step-instruction negations (excluding domain
  guardrails), sized by the negation-phrasing counts above.
- Sprawl (`body_sprawl`) tickets are advisory — schedule the two 400-line core `resources/` files
  first, as progressive-disclosure refactors behind `SKILL.md` pointers.
