# DESIGNBOOK-52 — Spec & Implementation Plan

**Ticket:** design-entity authors form modes — intake reads form_modes, map-entity writes form-mapping/
**Workflow:** `gaia_feature` · **Sub-work:** `work:code` · **Task-Art:** `skill-authoring` (markdown + schema; verified via `debo-test`)
**Runtime surface:** yes — a `design-entity` run writes a `form-mapping/*.jsonata` file and yields a rendered Storybook story. Verified through a `debo-test` fixture run **and** the existing `renderer/__tests__/form-modes.test.ts` unit contract. `scenario_required: false` (a CLI-workflow deliverable; no browser walkthrough observes anything a test cannot).
**Skill guardrail:** every edited file below (`design/schemas.yml`, the two task files, the workflow file) lives under `.agents/skills/designbook/` and is a guarded debo file. Coding **MUST** load `designbook-skill-creator` (and the matching per-file-type rule) before creating or editing any of them, per project `CLAUDE.md`.

---

## 1. Problem

`design-entity` builds a bundle's **reading** half only. Its intake reads
`content[<entity_type>][<bundle>].view_modes[<view_mode>]` unconditionally
(`.agents/skills/designbook/design/tasks/intake--design-entity.md:65-66`), and its shared
`map-entity` task writes hard to
`$DESIGNBOOK_DATA/entity-mapping/{entity_type}.{bundle}.{view_mode}.jsonata`
(`.agents/skills/designbook/design/tasks/map-entity--design-screen.md:26`). A bundle's **editing**
half — its `form_modes` — has **no authoring workflow**: `grep -rn "form-mapping" .agents/skills/`
returns nothing.

The render half already waits for that file. DESIGNBOOK-34 emits one Storybook story per form mode
(`FormDefault`, story name `default (form)`, tag `form`) and reads it from
`designbook/form-mapping/<entity_type>.<bundle>.<form_mode>.jsonata` — but nothing in `.agents/skills/`
writes it. A form mode is declarable (`data-model.yml` `form_modes`), exportable (`sync-to`), and
**unbuildable**. BIBB-236's `work:design-to-designbook` sub-work is blocked until this lands.

**Goal:** `design-entity` builds one **form** mode the same way it builds one view mode — pick the
bundle and mode, plan the components, write the mapping, get a Storybook story.

## 2. Key discovery — this is markdown + schema only, no addon TypeScript

Three independent explorations of the addon and workflow engine established that the read half, the
validator, and the engine templating are **already** form-capable:

1. **Read half already works (DESIGNBOOK-34/39).** `preset.ts` globs `form-mapping/*.jsonata`
   (`preset.ts:192`), `formIndexer` matches `/form-mapping\/[^/]+\.jsonata$/` (`preset.ts:282`), and
   `entity-module-builder.ts` reads `../form-mapping` (`:120`) guarded by `existsSync` (`:121`). Story
   name `<form_mode> (form)`, export `Form<PascalCase>`, tags `['entity','form']` are all fixed.
   The only writer requirement is a file at
   `designbook/form-mapping/<entity_type>.<bundle>.<form_mode>.jsonata` **plus an existing
   `entity-mapping/<entity_type>.<bundle>.*.jsonata` sibling** for the same bundle — the form story
   anchors on the bundle's canonical entity module; with no sibling, `indexForm` returns `[]`
   (`preset.ts:109`). No `preset.ts` / builder change is in scope.

2. **Validator is directory-agnostic.** The `entity-mapping` registry validator
   (`validation-registry.ts:52-55` → `validators/entity-mapping.ts`) takes an **arbitrary file path**
   and validates by output shape (JSONata parses; each output item is a `ComponentNode` or an
   `entity` ref node). It validates a `form-mapping/*.jsonata` file identically. A task result's
   `validators: [entity-mapping]` is consumed against the **written path** via the registry
   (`workflow.ts:2130`), **not** via the CLI subcommand — so "the same validator" is satisfied with
   **zero validator/CLI code change**. (The CLI `validate entity-mapping <name>` hardcodes
   `entity-mapping/` at `cli.ts:98`; that is out of scope and unused by the workflow.)

3. **`result.*.path` `{{…}}` segments are full JSONata.** `template/interpolate.ts:67-89` compiles
   each `{{ expr }}` with `jsonata(expr)` and evaluates it against per-iteration scope; the
   per-iteration `mapping.*` item **and** sibling params are both in scope
   (`workflow-resolve.ts:797,817,1559`); the on-disk write `mkdir -p`'s the resolved directory with no
   allow-list (`workflow.ts:1172-1175`). ⟹ a **single conditional `map-entity` task** can branch its
   output directory with a ternary on `mapping.mode_kind` — no second task required.

## 3. Design decisions (the three deferred questions, resolved)

Confirmed with the human on 2026-08-17 (all three per the qualification recommendations).

### D1 — Param shape: a dedicated `form_mode` param

`design-entity.md` gains `form_mode: { type: string, default: "" }` alongside the existing
`view_mode`. Resolution:
- neither `view_mode` nor `form_mode` supplied ⟹ intake lists **both** halves and asks;
- exactly one supplied ⟹ build that half;
- both supplied ⟹ error (a run builds exactly one mode).

Keeps `view_mode` honest for existing callers; the param name is not a lie.

### D2 — `map-entity--design-screen.md` stays **one** task with a conditional path

The single `result.entity-mapping.path` template becomes a JSONata ternary on the per-item
`mode_kind`:

```
$DESIGNBOOK_DATA/{{ mapping.mode_kind = 'form' ? 'form-mapping' : 'entity-mapping' }}/{{ mapping.entity_type }}.{{ mapping.bundle }}.{{ mapping.mode_kind = 'form' ? mapping.form_mode : mapping.view_mode }}.jsonata
```

`validators: [entity-mapping]` is reused unchanged for both halves (D2 relies on discovery #2). The
`title:` is generalized the same way so a form iteration titles correctly. Data-mapping blueprint
resolution is **template-driven and half-agnostic** already (`canvas`/`field-map`/`layout-builder`/
`presenter` all match by `template:` value regardless of half), so the "unmatched template ⟹ stop and
report" behavior at `map-entity--design-screen.md:52` needs no change.

### D3 — `design-screen` stays view-mode-only (for free)

`mode_kind` is **optional with default `view`** on `EntityMapping`. `design-screen`'s intake emits
`EntityMapping` items without `mode_kind`, so they default to `view` and continue to write
`entity-mapping/` **byte-identically**. No form references leak into screens; a follow-up ticket can
add them later without re-deciding the param shape.

### Schema — `EntityMapping` (`design/schemas.yml:438-443`)

Add two members; keep `entity_type`, `bundle`, `view_mode` untouched so the view-mode path **and** the
`entity-<et>-<bundle>-<view_mode>` element id stay byte-identical:

```yaml
EntityMapping:
  type: object
  required: [entity_type, bundle]
  properties:
    entity_type: { type: string }
    bundle: { type: string }
    mode_kind:
      type: string
      enum: [view, form]
      default: view
      description: >
        Which half of the bundle this mapping builds — `view` (reading half, written to
        entity-mapping/) or `form` (editing half, written to form-mapping/). Defaults to `view`
        so a caller that omits it (e.g. design-screen) is unchanged.
    view_mode:
      type: string
      default: ""
      description: View mode machine name; the mode name when mode_kind = view. Empty for a form mapping.
    form_mode:
      type: string
      default: ""
      description: Form mode machine name; the mode name when mode_kind = form. Empty for a view mapping.
```

`view_mode` moves from `required` to `default: ""` (a form item carries `form_mode`, not
`view_mode`); `mode_kind`'s default preserves every existing view consumer.

## 4. File structure

| File | Change |
|------|--------|
| `.agents/skills/designbook/design/schemas.yml` | `EntityMapping`: add `mode_kind` (enum, default `view`) + `form_mode`; `view_mode` → default `""`. |
| `.agents/skills/designbook/design/tasks/intake--design-entity.md` | Add `form_mode` param; step 1 lists both halves + resolves `mode_kind`; step 2 reads from the chosen half; result records `mode_kind` + `form_mode`; a form run emits exactly one `entity_mappings` entry with `mode_kind: form`. |
| `.agents/skills/designbook/design/tasks/map-entity--design-screen.md` | `title:` + `result.entity-mapping.path` become mode_kind-conditional (D2). Body constraint about "one file per `entity_type.bundle.view_mode`" generalized to name the chosen mode. |
| `.agents/skills/designbook/skills/design-entity/workflows/design-entity.md` | Add `form_mode: { type: string, default: "" }` param; pass through to intake (params flow by name). |
| `fixtures/drupal-web/data-model-form-designentity/…` (new) **or** extend an existing data-model fixture | A bundle declaring a non-default form mode with a **data-mapping-resolvable** `template` (`presenter` or `field-map`), plus an existing `entity-mapping/` sibling for the bundle. |
| `fixtures/drupal-web/cases/design-entity-form.yaml` (new) | `debo-test` case running `design-entity` for that form mode; asserts the written `form-mapping/*.jsonata`, no new `entity-mapping/` file, and a `form`-tagged story. Modeled on `fixtures/drupal-web/cases/design-entity.yaml`. |

No files under `packages/storybook-addon-designbook/src/` are modified.

---

# Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. **Before editing any `.agents/skills/designbook/**` file, load `designbook-skill-creator` and the matching per-file-type rule** (schemas → `rules/schema-files.md`, tasks → `rules/task-files.md`, workflows → `rules/workflow-files.md`, plus `rules/common-rules.md`).

**Goal:** `design-entity` builds one form mode the same way it builds one view mode, writing `form-mapping/<et>.<bundle>.<form_mode>.jsonata` and yielding a `form`-tagged Storybook story, with view-mode output byte-identical.

**Architecture:** Markdown + schema authoring only. Extend `EntityMapping` with a `mode_kind`/`form_mode` axis (default `view`), teach intake to resolve either half, and branch `map-entity`'s single result path with a JSONata ternary. Read half, validator, and engine templating already support form modes.

**Tech Stack:** debo skill markdown (tasks/workflows), JSON-Schema `schemas.yml`, JSONata result-path templates, `debo-test` fixture runner, vitest (`pnpm check`).

**Spec:** `.gaia/specs/DESIGNBOOK-52-spec.md` (this file).

## Global Constraints

- No addon TypeScript change; no change to `preset.ts`, `entity-module-builder.ts`, or any validator.
- View-mode output (path + file bytes + element id) MUST be byte-identical to today.
- A form run writes **exactly one** file under `form-mapping/` and **nothing** under `entity-mapping/`.
- A form mode carries only `template`, `label`, `settings` — never a `widgets:` / field-selection member (`designbook-drupal/data-model/rules/form-modes.md`).
- Every edited `.agents/skills/designbook/**` file is authored with `designbook-skill-creator` loaded.
- `renderer/__tests__/form-modes.test.ts` MUST pass unchanged.
- `pnpm check` (typecheck → lint → test) green.
- Run the `debo-test` fixture case from **inside this git worktree** (isolated `workspaces/`).

---

### Task 1: `EntityMapping` schema gains the `mode_kind`/`form_mode` axis

**Files:**
- Modify: `.agents/skills/designbook/design/schemas.yml:438-443`

**Interfaces:**
- Produces: `EntityMapping = { entity_type, bundle, mode_kind: view|form (default view), view_mode (default ""), form_mode (default "") }`. Consumed by Tasks 2 and 3.

- [ ] **Step 1:** Load `designbook-skill-creator` + `rules/schema-files.md` + `rules/common-rules.md`.
- [ ] **Step 2:** Edit `EntityMapping` to the shape in §3 "Schema": `required: [entity_type, bundle]`; add `mode_kind` (`enum: [view, form]`, `default: view`) and `form_mode` (`default: ""`); change `view_mode` to `default: ""`.
- [ ] **Step 3:** Validate the schema parses and the design concern still loads:
  `pnpm --filter storybook-addon-designbook test` (schema-load / task-frontmatter tests) — expect PASS.
- [ ] **Step 4:** Commit: `DESIGNBOOK-52: EntityMapping gains mode_kind/form_mode half axis`.

### Task 2: `intake--design-entity` resolves either half

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/intake--design-entity.md`

**Interfaces:**
- Consumes: `EntityMapping` (Task 1); `data_model.content[et][bundle].{view_modes,form_modes}`.
- Produces: `result` adds `mode_kind` and `form_mode`; `result.entity_mappings[]` items carry `mode_kind` (and `form_mode` when form). For a form run, `entity_mappings` has exactly one entry, `mode_kind: form`, no closure expansion.

- [ ] **Step 1:** Load `designbook-skill-creator` + `rules/task-files.md` + `rules/common-rules.md`.
- [ ] **Step 2:** Add `form_mode: { type: string, default: "" }` to `params.properties`.
- [ ] **Step 3:** Add `mode_kind` and `form_mode` to `result.properties`; add `mode_kind` to the `result.required` list; keep `view_mode` in `required` but allow `""`.
- [ ] **Step 4:** Rewrite the body Steps: step 1 resolves `mode_kind` — if a mode param is supplied use it (error if both `view_mode` and `form_mode` are non-empty); if neither, list bundles with **both** their `view_modes` and `form_modes` and ask the user to pick one bundle + one mode, recording which half. Step 2 reads `template`/`settings` from `content[et][bundle].form_modes[form_mode]` when `mode_kind = form`, else `view_modes[view_mode]`. State that a form run yields exactly one `entity_mappings` entry (`mode_kind: form`) and does not expand a renderable closure.
- [ ] **Step 5:** Verify frontmatter validity via `pnpm --filter storybook-addon-designbook test` (task-file/frontmatter tests) — expect PASS.
- [ ] **Step 6:** Commit: `DESIGNBOOK-52: intake resolves view_modes or form_modes, records the half`.

### Task 3: `map-entity` writes the half-correct directory (one conditional task)

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/map-entity--design-screen.md:2,26,49`

**Interfaces:**
- Consumes: `EntityMapping` (Task 1) with `mode_kind`.
- Produces: writes `form-mapping/<et>.<bundle>.<form_mode>.jsonata` when `mode_kind = form`, else `entity-mapping/<et>.<bundle>.<view_mode>.jsonata` (unchanged bytes/path for view).

- [ ] **Step 1:** Load `designbook-skill-creator` + `rules/task-files.md` + `rules/common-rules.md`.
- [ ] **Step 2:** Change `result.entity-mapping.path` to the ternary in §3 D2. Keep `validators: [entity-mapping]`.
- [ ] **Step 3:** Generalize `title:` to `"Map Entity: {{ mapping.entity_type }}.{{ mapping.bundle }}.{{ mapping.mode_kind = 'form' ? mapping.form_mode : mapping.view_mode }}"`.
- [ ] **Step 4:** Update the body constraint "One file per `entity_type.bundle.view_mode` combination" to name the chosen mode (view_mode or form_mode) generically.
- [ ] **Step 5:** Verify frontmatter + result-path interpolation via `pnpm --filter storybook-addon-designbook test` (interpolate + task-file tests) — expect PASS.
- [ ] **Step 6:** Commit: `DESIGNBOOK-52: map-entity branches result path on mode_kind (form-mapping/)`.

### Task 4: `design-entity` workflow exposes `form_mode`

**Files:**
- Modify: `.agents/skills/designbook/skills/design-entity/workflows/design-entity.md:4-8`

**Interfaces:**
- Produces: workflow param `form_mode` (default `""`), flowing by name into the intake step.

- [ ] **Step 1:** Load `designbook-skill-creator` + `rules/workflow-files.md` + `rules/common-rules.md`.
- [ ] **Step 2:** Add `form_mode: { type: string, default: "" }` under `params`.
- [ ] **Step 3:** Verify the workflow resolves: `pnpm --filter storybook-addon-designbook test` — expect PASS.
- [ ] **Step 4:** Commit: `DESIGNBOOK-52: design-entity workflow accepts a form_mode param`.

### Task 5: `debo-test` fixture proves the end-to-end runtime surface (RED → GREEN)

**Files:**
- Create: `fixtures/drupal-web/data-model-form-designentity/designbook/data-model.yml` (or extend an existing data-model fixture) — a bundle with a non-default form mode whose `template` is `presenter` (per the form-modes rule) or `field-map`, **and** an existing `entity-mapping/<et>.<bundle>.*.jsonata` sibling for that bundle so the form story anchors.
- Create: `fixtures/drupal-web/cases/design-entity-form.yaml` — modeled on `fixtures/drupal-web/cases/design-entity.yaml`.

**Interfaces:**
- Consumes: Tasks 1-4.

- [ ] **Step 1:** Author the case `prompt` to run `/debo design-entity` for the chosen bundle + form mode (non-interactive), and `assert` blocks: (a) `newFiles` includes `form-mapping/<et>.<bundle>.<form_mode>.jsonata`; (b) `newFiles` includes **no** new `entity-mapping/*.jsonata`; (c) the archived `design-entity` workflow is `completed` with all tasks `done`; (d) a `build-storybook` / index check shows a `form`-tagged story named `<form_mode> (form)`.
- [ ] **Step 2 (RED):** Before Tasks 1-4 land (or on a stash), run `debo-test run drupal-web design-entity-form` from inside this worktree — expect FAIL (no `form-mapping/` file written). Capture the `workflow summary --json`.
- [ ] **Step 3 (GREEN):** With Tasks 1-4 applied, run `debo-test run drupal-web design-entity-form` — expect PASS: `form-mapping/<et>.<bundle>.<form_mode>.jsonata` written, nothing new under `entity-mapping/`, form story present.
- [ ] **Step 4 (regression):** Run `debo-test run drupal-web design-entity` (view mode) — expect PASS with the `entity-mapping/paragraph.signage.full.jsonata` output byte-identical to today.
- [ ] **Step 5:** Commit: `DESIGNBOOK-52: debo-test design-entity form-mode fixture case`.

### Task 6: Full check gate

- [ ] **Step 1:** `pnpm check` (typecheck → lint → test) from repo root — expect green, including `renderer/__tests__/form-modes.test.ts` **unchanged**.
- [ ] **Step 2:** Confirm `grep -rn "form-mapping" .agents/skills/` now returns the new `map-entity` reference (the gap is closed).
- [ ] **Step 3:** Commit any lint:fix formatting; push branch.

---

## 5. Test plan (test-type-neutral; human confirmation required before coding)

| # | type | rationale (boundary) | command / path | expected | evidence |
|---|------|----------------------|----------------|----------|----------|
| T1 | unit (contract) | `form-modes.test.ts` is the render-half contract this ticket supplies input for; it must stay green **unchanged**. | `pnpm --filter storybook-addon-designbook test src/renderer/__tests__/form-modes.test.ts` | PASS, file unmodified | vitest output |
| T2 | static + suite | schema/task/workflow edits must typecheck, lint, and pass the addon suite. | `pnpm check` (repo root) | green | command log |
| T3 | e2e workflow (`debo-test`) | the only boundary that observes the actual written file + rendered story from a real `design-entity` run. | `debo-test run drupal-web design-entity-form` (from worktree) | PASS: `form-mapping/<et>.<bundle>.<form_mode>.jsonata` written, no new `entity-mapping/*`, `form`-tagged story `<form_mode> (form)` present | `workflow summary --json` + written file + storybook index |
| T4 | e2e regression (`debo-test`) | proves view-mode output is byte-identical (no regression). | `debo-test run drupal-web design-entity` (from worktree) | PASS: `entity-mapping/paragraph.signage.full.jsonata` byte-identical to today | `workflow summary --json` + `git diff`/`cmp` |
| T5 | negative (in T3 authoring) | a form mode whose `template` matches no data-mapping blueprint stops and reports, exactly as a view mode does. | a form mode with a bogus `template` in the fixture run | run stops with the missing-blueprint report | workflow error output |

**Confirmation required:** the human confirms this test plan (types, commands, expected results) before coding begins. No concrete test artifact, selector binding, or screenshot is created in spec.

## 6. Acceptance-criteria coverage

| Acceptance criterion (qualification v2) | Task(s) | Test |
|---|---|---|
| Offers `form_modes` alongside `view_modes` when neither supplied; accepts a supplied form mode | T2 intake (Task 2), Task 4 | T3 |
| Choosing a form mode reads template/settings from `form_modes[...]` not `view_modes` | Task 2 | T3 |
| Intake result records the chosen half | Task 1, Task 2 | T2 |
| Form run writes exactly `form-mapping/<et>.<bundle>.<form_mode>.jsonata`, nothing under `entity-mapping/` | Task 1, Task 3 | T3 |
| View run writes exactly `entity-mapping/<et>.<bundle>.<view_mode>.jsonata`, byte-identical | Task 1, Task 3 (defaults) | T4 |
| Story appears with `form` tag + name `<form_mode> (form)`, no `preset.ts`/builder change | (read half unchanged) | T3 |
| `form-modes.test.ts` passes unchanged | (no addon change) | T1 |
| Unmatched `template` stops the run and reports | Task 3 (unchanged behavior) | T5 |
| Mapping validated by the same validator | Task 3 (`validators: [entity-mapping]` reused) | T3 |
| No `widgets:`/field-selection member introduced | (design constraint) | T2 (schema) |
| `pnpm check` green | Task 6 | T2 |
