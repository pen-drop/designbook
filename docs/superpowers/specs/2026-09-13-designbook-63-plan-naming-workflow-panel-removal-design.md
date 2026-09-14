# DESIGNBOOK-63 — Superpowers-style plan naming + full Workflow-panel removal

**Ticket:** DESIGNBOOK-63
**Date:** 2026-09-13
**Task-Art:** (none — plain code/docs chore, no debo-test)
**Sub-works:** `work:code`, `work:docs`
**Status:** Approved for implementation planning (human Spec gate)
**Design method:** `superpowers:brainstorming` (architectural) → `superpowers:writing-plans`

## Problem

Persistent Designbook plans are written to `<workflow>.plan.md` under
`$DESIGNBOOK_DATA/plans/` — keyed only by workflow type. Two different initiatives that both
use, say, `design-screen` collide on the exact same filename and silently overwrite each
other; nothing about the name records *what* the initiative was. Superpowers plans avoid this
by naming with date + a concrete feature slug (`docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`).

Separately, the Storybook addon still ships a `WorkflowPanel` ("Designbook" panel/tab) that
polls `/__designbook/log` every 4s, plus `manager-notifications.ts` which polls a
**non-existent** `/__designbook/workflows` endpoint and reacts to `workflows/changes/` file
events — both always running regardless of whether the panel is open. Planning and execution
are AI/CLI concerns; this UI is dead weight (one endpoint doesn't even exist) and must go
completely, not just be hidden.

## Goals

1. A durable naming contract for `plan build`'s persisted output: date + agent-supplied slug,
   collision-safe, `--output`/`--ephemeral` behavior unchanged in spirit but re-expressed under
   the new extension/shape.
2. `plan build`'s returned path is the single source of truth; every downstream consumer
   (execute, resume, problem sidecar, skill docs) uses *that* path, never a path it re-derives.
3. Complete removal of the Workflow-/Designbook-Log panel: component, registration, imports,
   panel ID usage, notifications module, its exclusive server endpoint, and any dead endpoint
   references — with an explicit inventory of what is *shared* infrastructure and therefore stays.
4. Updated skill/CLI documentation and fresh unit tests reflecting the new contract; no
   migration or compatibility code for existing on-disk plans.

## Non-goals

- No move of `$DESIGNBOOK_DATA/plans/` to `docs/superpowers/` — the existing data folder stays.
- No new `specs/`-style concept inside `$DESIGNBOOK_DATA` — out of this ticket's scope.
- No replacement workflow UI of any kind.
- No blanket deletion of every file merely containing "workflow" in its name — only the code
  exclusively serving the Workflow-/Designbook-Log panel.
- No migration/backwards-compatibility/repair of existing `*.plan.md` artifacts — testing is
  from scratch (project convention).
- No rewrite of DESIGNBOOK-56/59/60/61 (related, completed, different scope — plan/engine
  contracts, module seams, optional plans).

## Locked decisions (Spec gate)

| ID | Decision |
|---|---|
| D1 | Persisted plans live in a **folder per initiative**: `$DESIGNBOOK_DATA/plans/<YYYY-MM-DD>-<slug>/plan.md` — deliberately diverging from Superpowers' flat-file convention (verified: Superpowers itself uses one flat `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md` file, no per-plan folder) because Designbook plans carry a sidecar (`problems.md`) that is cleaner living beside `plan.md` in its own folder than suffix-derived from a shared basename. |
| D2 | The slug comes from a **new required CLI option** `--name <text>` on `plan build`, required whenever neither `--output` nor `--ephemeral` is given. No silent fallback to the workflow name. |
| D3 | Slug normalization: lowercase; every run of characters outside `[a-z0-9]` becomes a single `-`; leading/trailing `-` trimmed; empty result after normalization is a build error. |
| D4 | Same-day collision on `<date>-<slug>` auto-appends `-2`, `-3`, … to the **slug** (new sibling folder), never a silent overwrite, never a hard error. |
| D5 | `.problems.md` sidecar becomes a **fixed-name** `problems.md` living in the same per-initiative folder — no more suffix-derivation from the plan's basename. |
| D6 | `--ephemeral` keeps writing a **single flat file** (no folder, no sidecar): `plans/.ephemeral/<uuid>.md` (bare `.md`, was `.plan.md`). |
| D7 | `--output <path>` keeps top precedence, unchanged — an explicit full path always wins over both the date/slug computation and `--ephemeral`. |
| D8 | `IntakeContext.plan_path` is renamed to **`plans_dir`** and its value changes from a file path to the plans **directory** (`${config.data}/plans`), because at intake time the slug (supplied later, at `plan build`) is not yet known — the intake step can no longer predict the final file path. |

## Current baseline (facts, from code inventory)

| Piece | Today |
|---|---|
| `intake-resolve.ts:313` | `plan_path: `${config.data}/plans/${workflowId}.plan.md`` — computed before the task list (and thus before any initiative name) exists |
| `plan-build.ts:43,122,165` | `BuildResult.plan_path` passes the intake value through unchanged; no write logic here |
| `cli/plan.ts:27-32` | `writePlan`: temp-file + rename (atomic); unchanged by this ticket |
| `cli/plan.ts:86-88` | `target = opts.ephemeral ? '<dir>/.ephemeral/<uuid>.plan.md' : (opts.output ?? plan_path)` |
| Resume | **No lookup-by-workflow-name exists.** `plan done/steps/instructions/validate/summary` all take an **exact path** argument already — "resume" is already just "reuse the path `plan build` returned"; this ticket's job is to keep that path correct and canonical, not to invent a new resume mechanism |
| `.problems.md` | **Not implemented in code today** — only documented in `resources/workflow-execution.md:49-63` as "trailing `.plan.md` → `.problems.md`" |
| Tests asserting old shape | `src/__tests__/intake-resolve.test.ts:45-48`, `src/__tests__/plan-build.test.ts:24-40`, `src/cli/__tests__/plan.test.ts:405-456` |
| Docs referencing the old shape | `.agents/skills/designbook/resources/cli-workflow.md`, `resources/workflow-building.md`, `resources/workflow-execution.md`, `SKILL.md`, `skills/execute-workflow/SKILL.md`, `designbook-gaia/skills/debo-designbook-design/SKILL.md`, `designbook-gaia/skills/debo-config-sync/SKILL.md` |
| `WorkflowPanel.tsx` | Polls `/__designbook/log` every 4000ms while `active`; no other imports; a local `Row` subcomponent used only here |
| `manager-notifications.ts` | Polls `/__designbook/workflows` (**endpoint does not exist** — always fails today) on `designbook:file-update`; reacts to `designbook:file-add`/`-delete` under `workflows/changes/`; started unconditionally in `manager.tsx:15` regardless of panel state |
| `manager.tsx:4,10,15,18-23` | Imports `WorkflowPanel` + `startWorkflowNotifications`; registers `PANEL_ID` with `addons.add(...)`; calls `startWorkflowNotifications(api)` unconditionally |
| `vite-plugin.ts:366-376` | `/__designbook/log` middleware — exclusive to the panel |
| `vite-plugin.ts` other endpoints | `/__designbook/status`, `/__designbook/list`, `/__designbook/load`, `/__designbook/file`, `/__designbook/story` — **shared infrastructure**, used by Structure/Inspect/Visual Compare, not panel-exclusive |
| Tests on removed surface | **None exist** for `WorkflowPanel.tsx`, `manager-notifications.ts`, or `manager.tsx` — removal drops no test coverage |

## Architecture — naming contract

```
$DESIGNBOOK_DATA/plans/
  2026-09-13-panel-removal/
    plan.md
    problems.md            # only when problems were recorded
  2026-09-13-panel-removal-2/   # auto-suffixed sibling on same-day slug collision
    plan.md
  .ephemeral/
    <uuid>.md               # flat, no sidecar, unaffected by --name
```

**Path computation (CLI layer only — `cli/plan.ts`, the sole place that turns `plans_dir` +
flags into a concrete target):**

```ts
function slugify(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!s) throw new Error('--name produced an empty slug');
  return s;
}

function resolveTarget(plansDir: string, opts: { output?: string; ephemeral?: boolean; name?: string }): string {
  if (opts.output) return opts.output;
  if (opts.ephemeral) return join(plansDir, '.ephemeral', `${randomUUID()}.md`);
  if (!opts.name) throw new Error('--name is required to persist a plan (or pass --output/--ephemeral)');
  const date = todayIso(); // YYYY-MM-DD
  const base = slugify(opts.name);
  let slug = base;
  let n = 2;
  while (existsSync(join(plansDir, `${date}-${slug}`))) slug = `${base}-${n++}`;
  return join(plansDir, `${date}-${slug}`, 'plan.md');
}
```

`writePlan` keeps its existing temp-file + rename semantics, now against `<folder>/plan.md`
instead of a flat file — `mkdirSync(dirname(path), { recursive: true })` already creates the
new per-initiative folder for free.

**Intake → build handoff:** `resolveIntakeContext` returns `plans_dir` (directory, not file).
`intake.ts`'s palette emits `plans_dir` unchanged. The agent authoring the task list now
additionally decides the `--name` value (the "concrete initiative name" the ticket requires —
never the bare workflow name) and passes it to `plan build`. The CLI's own stdout `plan` field
remains the single authoritative path; skill docs must instruct callers to persist and reuse
*that* value, never to reconstruct a path from `plans_dir` + a guessed slug.

## Architecture — Workflow-panel removal

**Delete:**
- `src/addon/components/panels/WorkflowPanel.tsx` (whole file)
- `src/addon/manager-notifications.ts` (whole file — its endpoint doesn't even exist; pure dead code today)
- `src/addon/vite-plugin.ts:366-376` (`/__designbook/log` middleware only)
- `src/addon/manager.tsx`: the `WorkflowPanel`/`startWorkflowNotifications` imports, the
  `addons.add(PANEL_ID, …)` block, the `startWorkflowNotifications(api)` call
- `PANEL_ID` in `shared/constants.ts` if nothing else references it after the above
- `digestLog` (shared/log/) if, after removing the `/__designbook/log` route, it has no other
  caller (coding step must verify — this spec does not assume either way; it is called out as a
  check, not a done decision)

**Keep (consumer inventory — shared infrastructure, AC-5):**
- `/__designbook/status`, `/__designbook/list`, `/__designbook/load`, `/__designbook/file`,
  `/__designbook/story` in `vite-plugin.ts` — consumed by Structure/Inspect/Visual Compare
- `STRUCTURE_PANEL_ID`, `INSPECT_TOOL_ID`, `VISUAL_TOOL_ID` and their `manager.tsx` registrations
- CLI plan generation/execution (`cli/plan.ts`, `workflow/plan-build.ts`,
  `workflow/intake-resolve.ts`) — untouched by the removal, only touched by the naming contract above

Removal is independent of the naming-contract work (different files, no shared code path); the
implementation plan tracks them as two separate blocks, order-agnostic.

## Consumer inventory — writers, readers, sidecars, handoffs (AC-1)

| Role | File | Change |
|---|---|---|
| Writer (path decision) | `src/workflow/intake-resolve.ts:313` | `plan_path` → `plans_dir`, file path → directory |
| Passthrough | `src/workflow/plan-build.ts:43,122,165` | field rename follows; still no write logic here |
| Writer (actual file) | `src/cli/plan.ts:86-88` (+ `writePlan`) | new `--name` option, `resolveTarget`/`slugify` per D1-D7 |
| Palette reader | `src/cli/intake.ts:29` | emits `plans_dir` instead of `plan_path` |
| Sidecar | (undocumented today) | documented as fixed `problems.md` inside the initiative folder, per D5 |
| Execution readers | `plan done/steps/instructions/validate/summary <path>` in `cli/plan.ts` | unaffected — already take an exact path; docs must state that path = the one `plan build` returned |
| Skill docs | `resources/cli-workflow.md`, `resources/workflow-building.md`, `resources/workflow-execution.md`, `SKILL.md`, `skills/execute-workflow/SKILL.md`, `designbook-gaia/skills/debo-designbook-design/SKILL.md`, `designbook-gaia/skills/debo-config-sync/SKILL.md` | update every `plan_path`/`.plan.md` reference to `plans_dir`/folder-per-initiative/`plan.md`/`problems.md` |
| Tests | `src/__tests__/intake-resolve.test.ts`, `src/__tests__/plan-build.test.ts`, `src/cli/__tests__/plan.test.ts` | assertions updated to the new shape; new cases per Test plan below |

Editing the `.agents/skills/designbook*/**/SKILL.md` files above requires loading
`designbook-skill-creator` first (project CLAUDE.md guardrail) — called out for the coding step,
not performed here.

## Test plan

**Unit (fresh, representative — no old-shape tests survive unchanged):**

1. `plan build` without `--name`, `--output`, or `--ephemeral` on a persist attempt → error, no file written.
2. `plan build --name "Panel Removal"` → writes `plans/<today>-panel-removal/plan.md`; returned `plan` field matches the written path exactly.
3. Second `plan build` with the same `--name` on the same day → writes `plans/<today>-panel-removal-2/plan.md`, does not touch the first folder's `plan.md`.
4. Slug normalization: mixed case, spaces, punctuation → single lowercase hyphenated slug; an all-punctuation `--name` → build error (empty slug).
5. `--ephemeral` → `plans/.ephemeral/<uuid>.md` (bare `.md`); `--name` ignored/not required when `--ephemeral` is set.
6. `--output <path>` → writes exactly there regardless of `--name`/date/collisions.
7. `intake-resolve.test.ts` / `plan-build.test.ts` → assert `plans_dir` (directory value), not a file path.

**Browser smoke test (AC-4/AC-6, `scenario_required: true` — only the panel removal has a runtime surface; the naming contract is CLI/unit-only):**

```gherkin
Feature: No Workflow-/Designbook-Log panel in the Storybook addon
  Scenario: A freshly started Storybook instance shows no Workflow panel
    Given a freshly started Storybook instance with the designbook addon
    When I inspect the registered addon panels
    Then no panel titled "Designbook" (the Workflow-/Log panel) exists
    And no network requests are made to "/__designbook/log"
    And no workflow start/complete notification appears, even when files are added to or removed from workflows/changes/
```

**Repo gate:** `pnpm check` (typecheck → lint → test) before commit.

## AC coverage (design → criterion)

| AC | Addressed by |
|---|---|
| AC-1 | This Spec — naming convention, contract (D1-D8), full consumer inventory table |
| AC-2 | D2-D4: `--name` required, date+slug folder, auto-suffix on collision — two same-day initiatives of one workflow coexist, no silent overwrite |
| AC-3 | D8 + "Execution readers" row: `plan build`'s own returned path is authoritative; execute/resume/sidecar/`--output`/`--ephemeral` all keyed off that one path |
| AC-4 | Browser smoke Gherkin scenario above |
| AC-5 | "Delete" vs "Keep" lists — explicit consumer inventory of shared infra |
| AC-6 | Removal scoped to panel-exclusive files only; Structure/Inspect/Visual Compare and CLI plan generation/execution untouched; `pnpm check` gate |
| AC-7 | Skill-doc + test update list above; no migration/back-compat per Non-goals |

## Alternatives rejected

| Alternative | Why rejected |
|---|---|
| Flat file `plans/<date>-<slug>.md` (1:1 Superpowers) | Verified Superpowers itself uses this flat shape, but Designbook's `problems.md` sidecar is cleaner as a fixed name inside a per-initiative folder than a second suffix-derivation rule — explicit divergence (D1), not a copy error |
| Slug auto-derived from task-list content (first task title, etc.) | Ticket explicitly requires the agent to supply the business-meaningful name; a technical workflow name or first-task title is not guaranteed to be that name |
| Hard error on same-day slug collision | Considered; rejected — auto-suffix avoids forcing the caller to invent a disambiguator when the collision is likely just two legitimately separate initiatives sharing a natural slug |
| Hide the Workflow panel behind a feature flag | Ticket explicitly requires full removal — "planning and execution are AI/CLI concerns," not a togglable UI |

## Risks

| Risk | Mitigation |
|---|---|
| A caller keeps computing its own path from `plans_dir` instead of using `plan build`'s returned `plan` field | Skill docs updated to state this explicitly (AC-3); no code path resolves a plan by guessing a folder name |
| `digestLog` or another shared helper turns out to have a caller beyond the deleted `/__designbook/log` route | Coding step re-checks callers before deleting the helper itself (called out above, not pre-decided) |
| Skill-doc edits under `.agents/skills/designbook*/` done without `designbook-skill-creator` | Called out explicitly in the consumer inventory and this document's guardrail note |

## Prior art (reuse, do not rebuild)

- DESIGNBOOK-56 — adopted static workflow documents / skill subskills (different scope: skill doc architecture, not plan naming or panel removal)
- DESIGNBOOK-59 — intake + MD-plan engine + skills (this ticket builds on, does not reopen, that engine contract)
- DESIGNBOOK-60/61 — module seams / optional plans reference approval (unrelated surface)

---

**Next after Spec approval:** `superpowers:writing-plans` → checkbox implementation plan at
`docs/superpowers/plans/2026-09-13-designbook-63-plan-naming-workflow-panel-removal.md`, then
GAIA `spec` + `test` comments and human confirm before `coding`.
