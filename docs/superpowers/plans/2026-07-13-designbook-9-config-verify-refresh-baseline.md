# config-verify: refresh Storybook baseline on stale — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `config-verify` re-capture its Storybook reference baseline every run, so the backend config is always diffed against the *current* Storybook render, never a stale snapshot.

**Architecture:** `config-verify` currently reuses `design-verify`'s frozen-reference task `ensure-baseline` for its reference stage. In `design-verify` the reference is a genuinely frozen design, so capture-once-and-reuse is correct. In `config-verify` the reference *is* the live Storybook render, so reuse is a bug. Fix: add a `config-verify`-specific reference step `ensure-baseline-live` that captures unconditionally (no reuse branch, no `--refresh-reference` gate), and point `config-verify`'s reference stage at it. `design-verify` and `ensure-baseline` stay byte-for-byte untouched (AC-3 by construction). This mirrors the established `triage`→`triage-config` / `polish`→`polish-config` split already in `config-verify`.

**Tech Stack:** designbook skill files (YAML-frontmatter + markdown tasks/rules/workflows under `.agents/skills/designbook/design/`); `debo-test` for end-to-end verification; Playwright capture via the `playwright-capture` rule.

## Global Constraints

- **Skill-authoring gate:** every create/edit of a task/rule/workflow under `.agents/skills/designbook/design/` MUST be done with the `designbook-skill-creator` skill loaded first (load `rules/task-files.md` for the new task, `rules/common-rules.md` always). Non-negotiable per project CLAUDE.md.
- **No compat / no migration code:** on-disk artifacts (baseline PNGs, meta.yml) are disposable; do not add code that reads or upgrades old artifacts.
- **AC-3 is a hard invariant:** `design/workflows/design-verify.md` and `design/tasks/ensure-baseline.md` MUST remain unmodified. Any diff to either is a plan violation.
- **Verify through `debo-test`, never ad-hoc** (WORKFLOW.md coding sub_decision `runtime_surface`): run the tester from a plain checkout (not inside a git worktree — its setup scripts run `git reset --hard`/`git clean -fd`).
- **`pnpm check`** (typecheck → lint → test, fail-fast) is only required if the change touches the addon/TS. This change is skill-markdown only → `pnpm check` not triggered by `app_change`, but run it if any TS is touched.

---

### Task 1: Add the `ensure-baseline-live` task

**Files:**
- Create: `.agents/skills/designbook/design/tasks/ensure-baseline-live.md`

**Interfaces:**
- Consumes: the `reference_screenshots` list emitted by `setup-compare` (same `each` expansion as `ensure-baseline`); `reference_dir` param (absolute `references/<hash>/` path); `design_tokens` for viewport width resolution.
- Produces: one result key `screenshot_file` at path `{{ reference_dir }}/{{ screenshot.breakpoint }}--{{ screenshot.element }}--{{ screenshot.state }}.png`, `submission: direct`, `validators: [image]` — identical result contract to `ensure-baseline` so downstream `compare` is unchanged.

The new task is `ensure-baseline` with **step 1 (the reuse branch) removed** and its framing changed from "frozen" to "live". It MUST keep the identical frontmatter shape (`params`, `result`, `each`) so `compare` consumes it identically — only the `name`, `trigger.steps`, `title`, and body prose differ.

- [ ] **Step 1: Load the authoring gate**

Load `designbook-skill-creator`, then its `rules/task-files.md` and `rules/common-rules.md`. Do not write the file before these are loaded.

- [ ] **Step 2: Write the task file**

Create `.agents/skills/designbook/design/tasks/ensure-baseline-live.md` with this content:

```markdown
---
name: designbook:design:ensure-baseline-live
title: "Ensure Baseline (live): {{ screenshot.element }} ({{ screenshot.breakpoint }}/{{ screenshot.state }})"
trigger:
  steps: [ensure-baseline-live]
priority: 10
params:
  type: object
  required: [screenshot, reference_dir]
  properties:
    screenshot:
      type: object
      $ref: ../schemas.yml#/Screenshot
    reference_dir:
      type: string
      description: "Absolute path to the reference directory (references/<hash>/) where the live Storybook baseline PNG is (re)captured each run."
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [screenshot_file]
  properties:
    screenshot_file:
      path: "{{ reference_dir }}/{{ screenshot.breakpoint }}--{{ screenshot.element }}--{{ screenshot.state }}.png"
      submission: direct
      validators: [image]
each:
  screenshot:
    expr: "reference_screenshots"
    schema: { $ref: ../schemas.yml#/Screenshot }
---

# Ensure Baseline (live)

Live-reference baseline for `config-verify`, where the reference **is** the current
Storybook render — not a frozen design. The Storybook render tracks the mapped
component/story source and the freshly generated CSS, so the baseline is
**re-captured every run**, unconditionally: there is no reuse-if-present branch and
no `--refresh-reference` gate. This guarantees the backend config is always diffed
against the current Storybook render, never a stale snapshot. (The frozen,
capture-once counterpart is `ensure-baseline`, used by `design-verify`.)

For this `screenshot`:

1. **Capture** via the `playwright-capture` rule's isolate-and-capture mode:
   resolve the viewport width for `screenshot.breakpoint` from `design-tokens.yml`; run the
   element state's `steps` against the reference page (in full layout) when the state is non-rest;
   then isolate `screenshot.selector` (empty ⇒ full page) and capture full-page transparent to the
   staged result path. A selector that matches nothing → full-page fallback + warning, never fail.
   Always capture — never reuse an existing PNG at the result path.
2. **Verify** by reading the captured image.
```

- [ ] **Step 3: Validate the skill file**

Run the `designbook-skill-creator` validation for the new task (per its rules). Expected: task validates — `params` self-contained (no inline-duplicated schema beyond the `$ref`s), no HOW leaking that belongs in the `playwright-capture` rule, `each`/`result` well-formed.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/tasks/ensure-baseline-live.md
git commit -m "feat(designbook-9): add ensure-baseline-live task for config-verify live reference"
```

---

### Task 2: Point config-verify at the live baseline + register the step

**Files:**
- Modify: `.agents/skills/designbook/design/workflows/config-verify.md` (reference stage + prose)
- Modify: `.agents/skills/designbook/design/rules/playwright-capture.md:4` (trigger.steps)

**Interfaces:**
- Consumes: the `ensure-baseline-live` step name from Task 1.
- Produces: a `config-verify` whose reference stage recaptures every run; no signature change for any downstream stage.

- [ ] **Step 1: Load the authoring gate**

Load `designbook-skill-creator` + `rules/workflow-files.md`, `rules/rule-files.md`, `rules/common-rules.md`.

- [ ] **Step 2: Swap the reference stage step in config-verify**

In `.agents/skills/designbook/design/workflows/config-verify.md`, change:

```yaml
  reference:
    steps: [ensure-baseline]
```

to:

```yaml
  reference:
    steps: [ensure-baseline-live]
```

- [ ] **Step 3: Fix the config-verify body prose to match**

In the same file, the paragraph currently reads:

> `reference_url` resolves to that story's Storybook iframe, so the reused `ensure-baseline` stage freezes the **Storybook** render as the frozen baseline instead of a design reference.

Replace it so it no longer claims the Storybook render is *frozen* — state that the `ensure-baseline-live` stage **re-captures** the Storybook render every run (the reference is live, not frozen), which is exactly why `config-verify` uses its own reference step instead of `design-verify`'s frozen `ensure-baseline`. Keep the surrounding table/paragraphs unchanged.

- [ ] **Step 4: Register the step in the playwright-capture rule**

In `.agents/skills/designbook/design/rules/playwright-capture.md:4`, add `ensure-baseline-live` to the `trigger.steps` list (place it next to `ensure-baseline`):

```yaml
  steps: [ensure-baseline, ensure-baseline-live, capture, re-capture, capture-backend, re-capture-backend, compare, re-compare, polish, polish-config, extract-reference]
```

- [ ] **Step 5: Validate both edited skill files**

Run `designbook-skill-creator` validation on the workflow + rule. Expected: both validate; `ensure-baseline-live` now resolves to a real task (Task 1); `design-verify.md` and `ensure-baseline.md` show **no diff** (`git diff --exit-code` on those two paths returns clean).

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook/design/workflows/config-verify.md \
        .agents/skills/designbook/design/rules/playwright-capture.md
git commit -m "feat(designbook-9): config-verify reference stage uses live baseline"
```

---

### Task 3: Author the config-verify debo-test case (verifies AC-1/AC-2)

**Files:**
- Create: `fixtures/drupal-web/cases/config-verify-<subject>.yaml`. Naming convention: **the base `entity_view_display` variant (default field-formatter display) is suffix-less; only the non-default variant carries a `-<variant>` suffix** — e.g. `config-verify-<subject>-layout-builder-ui-patterns.yaml`. `entity_view_display` is the single `config_type`; the **Layout Builder + UI Patterns** display (`layout-builder-ui-patterns`, cf. DESIGNBOOK-2) is a *variant of it* — an entity view display rendered through the LB/UI-Patterns layout mechanism — not a separate config_type. For this ticket: `config-verify-signage.yaml` — the base variant, subject = the entity_view_display produced by the `design-entity` / `sync-*` fixtures whose story + backend render URL both resolve in the fixture chain. The `-layout-builder-ui-patterns` variant case is added by its own ticket; DESIGNBOOK-9 authors only the base case (the stale-baseline fix is reference-side and variant-agnostic, so one case proves it).
- Possibly modify: the fixture chain (`fixtures/drupal-web/cases/…`) if config-verify needs a backend render target the existing chain does not yet provide.

**Interfaces:**
- Consumes: the `config-verify` workflow (Tasks 1–2).
- Produces: a `debo-test` case that runs `config-verify` twice with a Storybook component change between the runs, asserting the second run's reference PNG reflects the change (recaptured, not stale).

> **Note (accepted scope):** `config-verify` needs a backend render URL from a project-supplied `render_url` resolver — for a Drupal subject this means the tester provisions the live Drupal target via `start-drupal-workspace.sh` (a `sync-*`-style heavy case). If wiring a live backend render into the fixture is disproportionate, author the case so the backend-render side is held constant (a static/stubbed render fixture) and the assertion focuses purely on the **reference recapture** behaviour — that is the surface this ticket changes. Decide at implementation time based on what the fixture chain already provides; `log()`/document whichever constraint you accept.

- [ ] **Step 1: Model the case on `design-verify-entity-signage.yaml`**

Read `fixtures/drupal-web/cases/design-verify-entity-signage.yaml` for the shape (fixtures chain, prompt, `assert` javascript checks against `output.archivedWorkflows[...]`).

- [ ] **Step 2: Write the failing case — first run captures, then source changes, second run must recapture**

Create `fixtures/drupal-web/cases/config-verify-signage.yaml`. The `prompt` MUST:
1. Run `/debo config-verify <config>` once (this captures the Storybook reference baseline PNG under `references/<hash>/`).
2. Record the reference PNG's bytes/hash.
3. Mutate the mapped Storybook component/story source (a visible change — e.g. edit the component markup/scene so the render differs), restart Storybook (`_debo storybook start --force`).
4. Run `/debo config-verify <config>` a second time.

`assert` (javascript) MUST check:
- both `config-verify` runs reached `output.archivedWorkflows['config-verify']?.status === 'completed'` with all tasks `done`;
- the reference PNG after run 2 **differs** from the recorded run-1 PNG (proves AC-2: recaptured, not stale);
- `Object.keys(output.pendingWorkflows).length === 0`.

- [ ] **Step 3: Run the case from a plain checkout**

From a plain checkout (NOT this worktree — the tester runs `git reset --hard`/`git clean -fd`):

```bash
debo-test run drupal-web config-verify-signage
```

Expected on `main` (before Tasks 1–2 applied): run-2 reference PNG **equals** run-1 (reuse bug) → the "differs" assert FAILS. This is the failing test proving the bug.

- [ ] **Step 4: Run the case with Tasks 1–2 applied**

```bash
debo-test run drupal-web config-verify-signage
```

Expected: run-2 reference PNG **differs** from run-1 → all asserts PASS (AC-1 + AC-2 satisfied).

- [ ] **Step 5: Confirm AC-3 — design-verify regression check**

```bash
debo-test run drupal-web design-verify-entity-signage
```

Expected: PASS unchanged (design-verify's frozen reuse untouched). Also confirm `git diff --stat main -- .agents/skills/designbook/design/workflows/design-verify.md .agents/skills/designbook/design/tasks/ensure-baseline.md` is empty.

- [ ] **Step 6: Commit**

```bash
git add fixtures/drupal-web/cases/config-verify-signage.yaml
git commit -m "test(designbook-9): config-verify recaptures live Storybook baseline on stale"
```

---

## Self-Review

**Spec coverage:**
- AC-1 (recapture when source newer): Task 1 removes the reuse branch → recaptures **every** run (superset of "when newer"). Task 3 Step 2 exercises the source-changed path. ✅
- AC-2 (diff against current render, not stale): Task 1 + Task 2; Task 3 asserts run-2 PNG differs. ✅
- AC-3 (design-verify unchanged): Task 1/2 touch only new file + config-verify + the shared rule's trigger list; `design-verify.md` and `ensure-baseline.md` untouched; Task 3 Step 5 regression-checks + git-diff asserts empty. ✅

**Placeholder scan:** `<subject>`/`<config>`/`<hash>` are genuine fixture-resolved values chosen at implementation (signage is the concrete default), not TODO placeholders; the one open scope decision (live vs stubbed backend render) is explicitly bounded in Task 3's note. No "TBD"/"handle edge cases"/"write tests for the above". ✅

**Type consistency:** `ensure-baseline-live` result key (`screenshot_file`), path template, `validators: [image]`, and `each.screenshot.expr: reference_screenshots` match `ensure-baseline` exactly, so `compare` consumes both identically. Step name `ensure-baseline-live` is spelled identically in the task `trigger.steps`, the workflow `reference` stage, and the `playwright-capture` `trigger.steps`. ✅
