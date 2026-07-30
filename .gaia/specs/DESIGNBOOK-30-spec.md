# DESIGNBOOK-30 — Spec & Implementation Plan

**Ticket:** data-model: Blueprint `block_plugin` für Plugin-Blöcke (plugin_id-diskriminierte Settings + Render-Komponente)
**Workflow:** `gaia_chore` · **Sub-work:** `work:docs` · **Task-Art:** `skill-authoring` (docs)
**Runtime surface:** none for the docs artifact itself (blueprint + schema Markdown/YAML) → doc-structural + schema-load verification. Functional proof runs in coding through a `debo-test` **sync** case (WORKFLOW.md State: coding), never ad-hoc.

---

## 0. Amendment (2026-07-30, post-review) — settings enforcement re-cut along authoring-time vs. runtime

The first review returned **Not OK** on a single blocking finding: the `settings` enforcement
vehicle. Decisions **D4/D5** below (closed `oneOf` over a hand-enumerated set of plugin families,
no catch-all) and the acceptance criteria that mandated them (handoff **AC 4/5**) are **reversed**.
Everything else in this spec — the `schemas.yml`-type + blueprint-`extends:`-`$ref` vehicle (D1/D2),
the `component`-required rule (D3), the no-`block.block.*` export pattern (D6), the `exposed_block`
ownership (D7), the module rule (D8), `block_content:<uuid>` as a plugin (D10), and the no-`widgets:`
scope (D11) — **stands as written and passed review**.

**Why the reversal.** Drupal's block-plugin space is open and its settings schema is resolved
**dynamically** per plugin (`block.settings.[%parent.plugin]`, `TypedConfigManager`). A static,
hand-maintained `oneOf` over four families is *incomplete by construction* — `system_menu_block:*`,
`webform:*`, `commerce_*`, and every contrib/custom plugin fail validation despite being legitimate —
and the hand-copied `*Settings` shapes drift from the installed Drupal. The authoritative check
already runs at runtime: the modelled config is exported and applied to a **live Drupal target** (the
`config-verify` round-trip), where Drupal's own dynamic config schema resolves — so plugin existence
and settings-shape validation belong there, against Drupal's own schema, not a frozen static `oneOf`.
(Note: no dedicated `designbook_drupal` config-schema module exists in-tree today; the runtime path is
Drupal's own config import/render against the fixture site, surfaced through the `config-verify` workflow.)

**New enforcement split.**

- **Static (authoring-time, in `schemas.yml`, no live Drupal):** `plugin` required + pattern (shape
  only, incl. optional derivative), `component` required, `layout` optional **closed enum
  `[default, inline, stacked]`** (D9 now **confirmed in review**), `module` optional string.
- **Runtime (`config-verify` via `designbook_drupal`, live Drupal):** does the plugin exist? does
  `settings` match Drupal's real `block.settings.<plugin>`? does a referenced view carry
  `exposed_block: true`? does a non-core plugin name its `module`? The `settings` object is
  therefore **open** (`additionalProperties: true`); the closed family `oneOf` and the
  `ViewsBlockSettings` / `ViewsExposedFilterBlockSettings` / `UserLoginBlockSettings` /
  `BlockContentSettings` / `BlockSettingsBase` types are **removed**.

**Scope/label.** As flagged at both implementation and review, this ticket expanded from `work:docs`
into a `work:code` engine fix (`workflow-schema-merge.ts`, `cli/workflow.ts`) that makes blueprint
`extends:` reach validation — a pre-existing DESIGNBOOK-29-class gap affecting **every** `extends:`
blueprint, not introduced here. That engine fix **stays** (the blueprint still enforces `plugin`/
`component`/`layout`/`module` via `extends:` `$ref` into `schemas.yml#/BlockPlugin`). Effective work
labels: `work:docs` + `work:code` (PM to formalize).

**AC 13** (`debo-test run drupal-web sync-block-plugin`) remains **deferred** to a follow-up: a
`block_plugin` emits no standalone `block.block.*` (D6) and manifests only inside a `canvas_page`/
`layout-builder` tree node, none of which references a `block_plugin` key yet — a sync case would
have no meaningful `expected_config`. Tracked as a follow-up per the review's non-blocking note.

Sections 3–7 below are the **original pre-review plan**, kept for provenance; where they describe the
closed `oneOf` (D4/D5, §4 `settings` bullet, the AC-4 matrix row, the schema-authoring checklist item)
they are superseded by this amendment.

---

## 1. Problem

The data-model has **no home for a block that has no `block_content`**. `grep -rn "block\.block" .agents/skills/` finds nothing; only two things are modelled:

- `block_content` (a content entity with bundles/fields/view-modes), and
- the component tree (Canvas: inline `component_tree`; Layout Builder: `layout_builder__layout` with `block_content` references).

So `views_exposed_filter_block:*`, `views_block:*`, `user_login_block` — every plugin block **without** a `block_content` backing — cannot be expressed. The axis that matters is **how a form/content reaches the page**: as a **Block** (this ticket) vs. via a **Route** (entity forms → DESIGNBOOK-31, `form_modes`).

**Goal:** a new generic `block_plugin` data-model blueprint under `.agents/skills/designbook-drupal/data-model/blueprints/`, `section: config`, describing a **named block-plugin instance**: plugin-ID, plugin-specific settings, render component. The `plugin`-ID is the **discriminator on two axes** — (1) which `settings` schema applies (exactly Drupal's `block.settings.[%parent.plugin]` pattern), and (2) which SDC renders (explicit `component:`, optional per-family default).

## 2. Decision (design)

Three artifacts, one enforced config sub-schema:

```
.agents/skills/designbook-drupal/data-model/
  blueprints/block_plugin.md   # NEW — type: entity-type, section: config; documents shape,
                               #   export pattern, per-family component suggestions, deps, non-goals;
                               #   frontmatter `extends:` $refs the schema type below (no inline schema)
  schemas.yml                  # NEW at this level — the HARD contract:
                               #   BlockPlugin + per-family *Settings types (plugin/component/layout/
                               #   module + settings oneOf discriminated by plugin family)
```

**Why a `schemas.yml` type and not schema-in-the-blueprint.** The skill-creator vehicle matrix (`designbook-skill-creator/rules/blueprint-files.md`) is explicit: a *hard contract other tools must validate against* lives in a **schema type in the integration's `schemas.yml` (via `$ref`)**; blueprints "suggest, never enforce" and may only use `extends:`/`suggests:` (never `provides:`/`constrains:`). `plugin` required + pattern, `component` required, closed `layout` enum, and the `settings` `oneOf` are all hard contracts → they belong in `schemas.yml`. The blueprint's frontmatter `extends:` injects the property into the data-model result **by `$ref`**, so the schema is defined once and never inline-duplicated (satisfies AC 10/12 "keine inline duplizierten Schemas", "korrekte Trennung Blueprint vs. Rule"). This makes `block_plugin` the **first config blueprint that actually enforces its `config.<type>` sub-schema** — `view.md`/`block_content.md` only document a sketch and leave `config` open. That is the intended step up per the schema-first standing preference.

**Wiring & feasibility.** The core data-model result (`designbook/skills/data-model/schemas.yml`) has `config: { additionalProperties: true }`. The blueprint adds a *named* property:

```yaml
# block_plugin.md frontmatter (sketch — final in coding)
extends:
  data-model:
    properties:
      config:
        properties:
          block_plugin:
            type: object
            additionalProperties:
              $ref: ./schemas.yml#/BlockPlugin
```

This is feasible where `field-type-constraints.md`'s enum was **not**: that rule is blocked because `constrains:` cannot intersect enums across `additionalProperties` wildcards. Here we use **`extends:`** (adds a whole subtree, no wildcard descent needed) and `config` is a **named** DataModel property, so the merge engine reaches it. All internal `required`/`oneOf`/`pattern`/`enum` live inside the `$ref`'d `BlockPlugin` subtree and are validated directly by ajv — no `constrains:` navigation involved.

## 3. Resolved decisions

| # | Decision | Choice | Rationale | Rejected alternative |
|---|---|---|---|---|
| **D1** | Enforcement vehicle | Hard schema in a **new `data-model/schemas.yml`**; blueprint `extends:` `$ref`s it | Matrix: hard contract → `schemas.yml` type; blueprints can't enforce (overridden wholesale). Single definition, no duplication. | Inline the schema in the blueprint body/`extends:` → BLUEPRINT-03 finding + duplication risk. |
| **D2** | Which artifact carries the `extends:` wiring | The **blueprint** (`config.block_plugin` is the integration-specific property it contributes) | Matrix: "added property for integration-specific shape → Blueprint `extends:`". Co-locates the new config type's wiring with its docs; hardness comes from the `$ref`'d type. | A separate rule with `extends:` — defensible ("invariant regardless of integration"), but splits ownership for no gain. **Confirm with human** if a rule is preferred. |
| **D3** | `component` per-family **default** | Blueprint `suggests:` (soft, machine-readable) per family; schema keeps `component` **required** | AC 5 "default dokumentiert; expliziter Eintrag gewinnt" + AC 3 "component required". A suggestion is a *starting hint* the authoring agent applies; the entry must still name `component`, so there is no hidden plugin→component table and explicit always wins. | Schema-level `default` for `component` → makes it non-required and hides the mapping; violates AC 3 + "keine versteckte Tabelle". |
| **D4** | `settings` discrimination | `oneOf` with one branch per plugin family; each branch pins `plugin` (pattern/`const`) → its `*Settings` type | AC 4 "diskriminiert (oneOf), nicht offenes Objekt". Families ≥ `views_block:*`, `views_exposed_filter_block:*`, `user_login_block`, `block_content:*`. Settings shapes derived from Drupal core `block.settings.<plugin>` at coding time. | Open `settings: {additionalProperties: true}` → explicitly forbidden by AC 4. |
| **D5** | Unknown plugin family | **Closed** `oneOf` (no catch-all); an unmatched `plugin` fails validation | "not a silently empty block" (AC 8 spirit). Extending to a new family = add a branch. | Open catch-all branch → re-opens `settings`, defeats the discrimination. |
| **D6** | Export pattern | `block_plugin` emits **no `block.block.*`**; the tree node (`component_tree` / `layout_builder__layout`) carries plugin-ID + settings; placement stays with `canvas_page`/`layout-builder` | AC 6. Tree node references the `block_plugin` key. | Emit a `block.block.*` placement entity → out of scope, wrong ownership. |
| **D7** | `exposed_block` dependency | Documented; `block_plugin` entry declares a **dependency on the view key**; the `exposed_block: true` flag stays owned by `view.md` (`views.view.*`); `--with-deps` pulls the view | AC 7. No ownership migration into the new type. | Model `exposed_block` in `block_plugin` → duplicates view config ownership. |
| **D8** | Module dependency | Schema carries an optional `module:`; the blueprint **requires** a module entry for any **non-core** provider; a missing module is a `config-verify` fail | AC 8. Note: the four required families are all **core** (views, user, block_content) — the rule is for extensibility (e.g. webform). | Silently allow unknown providers → empty block at import. |
| **D9** | `layout` enum values | Optional, **closed** enum; **proposed** `[default, inline, stacked]` (block render-wrapper hint) | AC 3 mandates an optional closed enum. Kept semantic (not measured px — BLUEPRINT-05 safe). **The one value to confirm in human review** — the ticket names no concrete set. | Leave `layout` free-form → violates "geschlossenes Enum". |
| **D10** | `block_content:<uuid>` | Allowed as a `plugin` value (pattern + a `BlockContentSettings` `oneOf` branch); `block_content.md` **unchanged** | AC 9 — `block_plugin` is the block unit; no duplicate block definition. | Re-declare block content in `block_plugin` → duplication. |
| **D11** | Widgets / entity-form-displays | **No** `widgets:` field in the data-model schema; blueprint body names entity-form-displays as a **non-goal** and points to `form_modes` (DESIGNBOOK-31); widget→SDC stays in `components/blueprints/form.md` | AC 10 + AC 11. | Add `widgets:` → duplicates form.md's mapping, wrong scope. |

**No open scope decision.** Qualification handoff v2 removed the v1 contrib block-provider question (forms split into Block vs Route). The only value left to confirm is the `layout` enum set (D9) — a schema-authoring detail, not a scope change.

## 4. Schema shape (target — final YAML authored in coding, grounded in Drupal core schema)

`BlockPlugin` (per entry under `config.block_plugin.<key>`):
- `plugin` — **required**, `string`, `pattern` matching a plugin-ID **with optional derivative** (e.g. `user_login_block`, `views_block:gaia_tickets-block_1`, `views_exposed_filter_block:gaia_tickets.page_1`, `block_content:<uuid>`).
- `component` — **required**, `string` (SDC name).
- `layout` — optional, `enum` (D9).
- `module` — optional `string`; required by the blueprint for non-core providers (D8).
- `settings` — **`oneOf`** (D4/D5), one branch per family, each `$ref`ing a `*Settings` type: `ViewsBlockSettings`, `ViewsExposedFilterBlockSettings`, `UserLoginBlockSettings`, `BlockContentSettings`. Each derived from Drupal core's `block.settings.<plugin>` (base `block_settings`: `id`, `label`, `label_display`, `provider`, `context_mapping`, plus per-plugin extras — e.g. views_block adds `views_label`/`items_per_page`/`pager`, block_content adds `view_mode`).

## 5. Risks

- **R1 — `$ref` bundling on the create-path (highest).** DESIGNBOOK-29 showed the `workflow create` resolver (`cli/workflow.ts`) can drop intra-file `$ref`s because it omits `collectLocalRefsFromSchema` (memory `project_schema_intrafile_ref_invariant`; 3 separate schema resolvers). A `./schemas.yml#/BlockPlugin` ref inside blueprint `extends:` must survive create-path resolution. *Mitigation:* in coding, reproduce through the **real failing entry point** — run `workflow create` for the data-model workflow and assert `block_plugin` validation is live; if the ref is dropped, that is the same class of bug and fixed there (or fall back to a fully-inlined `extends:` only if bundling is genuinely unavailable, documenting why).
- **R2 — `oneOf` mutual exclusivity.** Branch `plugin` pins must be disjoint so exactly one matches; overlapping patterns make ajv reject a valid entry. *Mitigation:* anchor each family pattern; unit-validate every example entry from the ticket description.
- **R3 — `extends:` into a named-then-added property.** `extends:` errors if a property already exists; `config.block_plugin` does not exist (only `additionalProperties: true`), so adding it is legal — but verify the merge actually lands (Phase 2). *Mitigation:* covered by the R1 `workflow create` check.
- **R4 — Settings shapes invented, not grounded.** *Mitigation:* derive each `*Settings` from real Drupal core `block.settings.*` schema at coding; do not guess fields.
- **R5 — No fixture exercises a plugin block.** `drupal-web` has `sync-view`/`sync-block-content`/… but **no** `sync-block-plugin` case (AC 13). *Mitigation:* author the fixture + `sync-block-plugin.yaml` case first, then run the tester.

## 6. Acceptance ↔ evidence matrix

| AC | What proves it |
|---|---|
| 1 — path + frontmatter analog `view.md` | `ls .../blueprints/block_plugin.md`; grep `type: entity-type`, `name: block_plugin`, `trigger.domain: data-model`, `filter.backend: drupal` |
| 2 — `entity_type: block_plugin`, `section: config` | grep the blueprint body block |
| 3 — `plugin` req+pattern(derivative), `component` req, `layout` optional closed enum | schema `required`/`pattern`/`enum`; validate example entries |
| 4 — `settings` `oneOf` over families (≥ 4 listed) | schema `oneOf` with 4 `$ref`'d `*Settings` branches |
| 5 — per-family `component` default documented; explicit wins | blueprint `suggests:` per family + body statement; schema keeps `component` required |
| 6 — no `block.block.*`; tree node carries plugin-ID+settings | blueprint "Drupal Config Export Pattern" section |
| 7 — `exposed_block: true` dep; ownership stays `view.md`; `--with-deps` | blueprint dependency section; `view.md` unchanged |
| 8 — non-core plugin requires module; missing = `config-verify` fail | schema `module` + blueprint statement; exercised by tester |
| 9 — `block_content:<uuid>` allowed; `block_content.md` unchanged | pattern + `BlockContentSettings` branch; `git diff` shows `block_content.md` untouched |
| 10 — no `widgets:` field | grep absence in data-model schema; form.md remains sole source |
| 11 — entity-form-displays named non-goal → `form_modes` (DB-31) | blueprint body pointer |
| 12 — `designbook-skill-creator` conformance | load the skill; BLUEPRINT-01/03, schema-files, common-rules checks green |
| 13 — `debo-test` sync case green; tester output attached | `debo-test run drupal-web sync-block-plugin` from the worktree; `workflow summary --json` on ticket |
| 14 — standing `work:docs` AC | all grep/git-diff/schema-load/example-validation checks green |

## 7. Implementation plan (checkbox — for coding)

- [ ] **Load `designbook-skill-creator`** (mandatory before authoring blueprint/schemas.yml — project CLAUDE.md) and its `blueprint-files.md`, `schema-files.md`, `common-rules.md` rules.
- [ ] Author `.agents/skills/designbook-drupal/data-model/schemas.yml`: `BlockPlugin` + `ViewsBlockSettings`, `ViewsExposedFilterBlockSettings`, `UserLoginBlockSettings`, `BlockContentSettings`, each grounded in Drupal core `block.settings.*` (fetch the real schemas).
- [ ] Author `.agents/skills/designbook-drupal/data-model/blueprints/block_plugin.md`: frontmatter (`type: entity-type`, `name`, `trigger.domain`, `filter.backend`, `extends:` `$ref` to `./schemas.yml#/BlockPlugin`, `suggests:` per-family `component`); body (entity_type/section sketch, export pattern = no `block.block.*`, exposed_block dependency, non-core module requirement, `block_content` allowed, non-goals + `form_modes`/DB-31 pointer, widget→SDC in form.md).
- [ ] Confirm `block_content.md` and `view.md` remain **unchanged** (`git diff`).
- [ ] Prove the schema is live: run `workflow create` for the data-model workflow (R1/R3), validate every example entry from the ticket description against the merged schema (valid ones pass, an unknown-family/no-module one fails).
- [ ] Run `designbook-skill-creator` conformance checks (BLUEPRINT-01/03, schema-files, common-rules) — green.
- [ ] Author the fixture + `fixtures/drupal-web/cases/sync-block-plugin.yaml` (a plugin block, e.g. `views_exposed_filter_block:*` or `user_login_block`) if none exists (R5).
- [ ] From **inside this worktree**, run `debo-test run drupal-web sync-block-plugin` (per WORKFLOW.md State: coding runtime-surface branch); attach `workflow summary --json` to the ticket (AC 13).
- [ ] Run `pnpm check` if any addon/TS is touched (fixtures/schema loading may not require it — confirm).
- [ ] Doc-structural sweep (AC 14): grep paths/frontmatter, schema loads and validates the description examples.

## 8. Artifacts

- This spec: `.gaia/specs/DESIGNBOOK-30-spec.md` (committed).
- To be created in coding: `data-model/blueprints/block_plugin.md`, `data-model/schemas.yml`, `fixtures/drupal-web/cases/sync-block-plugin.yaml` (+ its fixture data).
