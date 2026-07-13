# Entity view displays self-manage (drop transform.md special-casing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a `core.entity_view_display.*` unit resolve to its display-mapping blueprint through a machine-readable config-name discriminator, so the neutral core `transform.md` drops its display-specific routing clause and stays a pure router.

**Architecture:** Add a `trigger.config_name` glob to the designbook-drupal `layout-builder-display.md` blueprint (extension-gating stays on its existing `filter.extensions`). Rewrite `transform.md`'s router to match `unit.config_name` against loaded blueprints' `trigger.config_name` — a generic precedence rule that names no Drupal config type. Document the new key in `designbook-skill-creator`. Markdown-authoring only; no TypeScript/addon change (the TS resolver ignores the key at load-time; `transform` matches it at runtime).

**Tech Stack:** designbook skill markdown (tasks/blueprints/rules), YAML frontmatter, `debo-test` eval harness, the skill validator.

## Global Constraints

- **Backend-neutrality:** all Drupal display knowledge stays in `designbook-drupal`; the neutral core (`designbook/sync/`) must name no Drupal config type. (feedback_no_backend_code_in_core)
- **No backwards-compat / migration code:** existing on-disk artifacts are disposable; testing is from scratch. (CLAUDE.md)
- **Skill-authoring gate:** before creating OR editing any file under `.agents/skills/designbook/`, `.agents/skills/designbook-*/`, or `designbook-skill-creator`, load the `designbook-skill-creator` skill first. (CLAUDE.md)
- **Schema-first:** prefer machine-readable, documented keys over imperative prose. (feedback_schema_first)
- **Verification:** any designbook skill change is verified end-to-end through the matching `debo-test` tester over the fixture case that exercises it — never ad-hoc. Run the tester from a plain checkout, not inside a git worktree (its setup scripts run `git reset --hard`/`git clean -fd`). (WORKFLOW.md § State: coding)

---

### Task 1: Add the `trigger.config_name` discriminator to the display blueprint + document the key

**Files:**
- Modify: `.agents/skills/designbook-drupal/data-mapping/blueprints/layout-builder-display.md:1-9` (frontmatter)
- Modify: `.agents/skills/designbook-skill-creator/rules/blueprint-files.md:202-216` (trigger/filter docs)

**Interfaces:**
- Produces: blueprint frontmatter key `trigger.config_name` (glob string) — consumed by Task 2's router prose. Semantics: matched against a sync-to `ConfigNameUnit.config_name` at transform time.

- [ ] **Step 1: Load the skill-creator skill (authoring gate).**

Invoke the `designbook-skill-creator` skill (Skill tool) and read `rules/blueprint-files.md` + `rules/common-rules.md` before editing.

- [ ] **Step 2: Add `config_name` to the blueprint's `trigger`.**

In `layout-builder-display.md` frontmatter, change:

```yaml
trigger:
  domain: data-mapping
filter:
  extensions: layout_builder
```

to:

```yaml
trigger:
  domain: data-mapping
  config_name: 'core.entity_view_display.*'
filter:
  extensions: layout_builder
```

- [ ] **Step 3: State the self-selection in the blueprint body.**

Add one sentence near the top of the blueprint body (after the opening paragraph): "This blueprint self-selects for `core.entity_view_display.*` config units via `trigger.config_name`; `filter.extensions: layout_builder` gates it to Layout-Builder projects."

- [ ] **Step 4: Document the key in `blueprint-files.md`.**

In the trigger/filter section (around `blueprint-files.md:215`), add a line: "`trigger.config_name:` (glob) — a **sync-to routing** key, distinct from the create-time `trigger.domain`/`trigger.steps` loading keys. At `sync-to:transform` time the router follows the `### to_drupal` of the loaded blueprint whose `trigger.config_name` glob matches the unit's `config_name`. Extension/framework gating still comes from `filter:`."

- [ ] **Step 5: Run the skill validator; expect no new findings.**

Run the project's skill validator over `designbook-drupal` and `designbook-skill-creator` (per `designbook-skill-creator/resources/validate.md`). Expected: 0 new findings (the trigger/filter key-set is open; `matchConditionKey()` accepts unknown keys).

- [ ] **Step 6: Commit.**

```bash
git add .agents/skills/designbook-drupal/data-mapping/blueprints/layout-builder-display.md \
        .agents/skills/designbook-skill-creator/rules/blueprint-files.md
git commit -m "feat(designbook-8): display blueprint self-selects via trigger.config_name"
```

---

### Task 2: Rewrite transform.md into a pure, generic router (remove the display special-case)

**Files:**
- Modify: `.agents/skills/designbook/sync/tasks/transform.md:89` (the `## Result: config-file` routing paragraph)

**Interfaces:**
- Consumes: `trigger.config_name` from Task 1.
- Produces: a generic router with no `core.entity_view_display` literal.

- [ ] **Step 1: Load the skill-creator skill if not already loaded (authoring gate for a core task file).**

- [ ] **Step 2: Replace the routing prose.**

In `transform.md`, the current sentence in the "Result: config-file" section reads (line 89):

> For the JSONata at the generator path: read the matching blueprint's `### to_drupal` block (the blueprint for `unit.entity_type` + the `field-types` prelude for field units, or the config-type blueprint for config-slice units). For an entity-view-display unit (`config_name` of the form `core.entity_view_display.*`), routing is by the active `extensions`, not by the view mode's `template`: when a resolved display-mapping blueprint is gated to an active extension (its `filter.extensions`), follow that blueprint's `### to_drupal` block — not the entity-type blueprint and not the `template` renderer blueprint (which maps fields to a `ComponentNode[]`, not to display config). With no extension-gated display blueprint, author the display from `prepared` alone. This is the pattern to follow when authoring the transform.

Replace it with (no config-type literal, generic precedence):

> For the JSONata at the generator path, pick the guiding blueprint by this precedence: (1) if a loaded blueprint declares a `trigger.config_name` glob that matches `unit.config_name`, follow that blueprint's `### to_drupal` block — such a blueprint is already gated to the project by its own `filter:` (extensions/frameworks), so it is present only when it applies; (2) otherwise, for a content-derived unit follow the blueprint for `unit.entity_type` plus the `field-types` prelude for field units; (3) otherwise, for a config-slice unit follow the config-type blueprint; (4) with no matching blueprint, author from `prepared` alone. This is the pattern to follow when authoring the transform.

- [ ] **Step 3: Grep-verify the special-case is gone.**

```bash
grep -n "entity_view_display\|by the active .extensions\|template renderer" \
  .agents/skills/designbook/sync/tasks/transform.md
```
Expected: no matches (the neutral core names no Drupal config type or Drupal-specific routing rule).

- [ ] **Step 4: Commit.**

```bash
git add .agents/skills/designbook/sync/tasks/transform.md
git commit -m "refactor(designbook-8): transform.md is a pure config-name router (drop display special-case)"
```

---

### Task 3: Verify end-to-end via the sync-block-content eval case

**Files:**
- Read/verify: `fixtures/drupal-web/cases/sync-block-content.yaml` (LB active via `config: layout-builder.yml`; expects `core.entity_view_display.block_content.hero.default`)

**Interfaces:**
- Consumes: the changed `transform.md` + blueprint from Tasks 1–2.

- [ ] **Step 1: Confirm the case exercises the change (no edit expected).**

The case's prompt already says "the active extensions decide how the entity view display is authored (do not assume a path or name a blueprint yourself)" and `expected_config` includes `core.entity_view_display.block_content.hero.default`. This is exactly the self-managing behaviour. No fixture edit is expected; if the run reveals the routing prose is ambiguous, tighten `transform.md` (not the fixture).

- [ ] **Step 2: Run the tester from a PLAIN checkout (not this worktree).**

Per WORKFLOW.md, run in a plain checkout of the branch:

```bash
debo-test run drupal-web sync-block-content
```
Expected: `cim_ok: true`, `existence_rate: 1.0` for the 8 expected config names, and the display authored via the Layout-Builder path (`third_party_settings.layout_builder` with UI-Patterns sections). For a scored audit instead: `debo-test research drupal-web sync-block-content --baseline-only`.

- [ ] **Step 3: Sanity-check the non-LB fallback (reasoning, no new case required).**

Confirm by inspection that with `layout_builder` inactive the blueprint's `filter.extensions` keeps it unloaded, so no `trigger.config_name` match exists and `transform` authors the display from `prepared` alone. Acceptance names only `sync-block-content` (the LB path) as the verifying case; the fallback is covered by the resolution mechanism (absent blueprint), not a separate fixture. If a reviewer wants explicit coverage, add a non-LB display case — tracked as optional follow-up, not part of this ticket.

- [ ] **Step 4: Final acceptance grep (all three criteria).**

```bash
# 1. no display-specific prose in the neutral core
grep -rn "entity_view_display" .agents/skills/designbook/sync/ ; echo "expected: no matches"
# 2. discriminator present on the drupal blueprint
grep -n "config_name" .agents/skills/designbook-drupal/data-mapping/blueprints/layout-builder-display.md
# 3. no Drupal literal leaked into core
grep -rn "layout_builder\|entity_view_display" .agents/skills/designbook/sync/tasks/transform.md ; echo "expected: no matches"
```

- [ ] **Step 5: Commit any verification-driven tweaks.**

```bash
git add -A && git commit -m "test(designbook-8): verify display self-managing via sync-block-content"
```

---

## Self-Review

- **Spec coverage:** criterion 1 (no display prose in `transform.md`) → Task 2 + Task 3 Step 4; criterion 2 (LB→`layout-builder-display.md`, else schema-driven, verified by `sync-block-content`) → Task 1 + Task 3; criterion 3 (backend-neutrality) → Global Constraints + Task 2 Step 3. All covered.
- **Placeholder scan:** none — exact frontmatter, exact replacement prose, exact commands.
- **Type consistency:** the key is `trigger.config_name` in every task; the fixture case name is `sync-block-content` throughout.
