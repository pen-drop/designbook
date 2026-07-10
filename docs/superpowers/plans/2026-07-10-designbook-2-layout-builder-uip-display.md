# Entity View Displays for Layout Builder + UI Patterns 2 (sync-to) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `sync-to` a `### to_drupal` authoring pattern for `core.entity_view_display.*` units so it emits valid Layout Builder + UI Patterns 2 entity view displays, with the UI-Patterns-2 sub-block factored into a shared blueprint DESIGNBOOK-3 reuses unchanged.

**Architecture:** All content is `designbook-drupal` blueprints (the schema-driven sync model treats a blueprint's `### to_drupal` block as generator *guidance*, not executed code — the AI authors a per-config-name `.jsonata` against the live typed-config schema, guided by the pattern). A shared `ui-patterns.md` blueprint produces the path-neutral `{component_id, variant_id, props{source_id,source}, slots}` block; a `layout-builder-display.md` blueprint (gated `extensions: layout_builder`) wraps it in the Layout Builder section + `field_block` component structure. One minimal, backend-neutral routing clause in `sync/tasks/transform.md` points display units at the display blueprint. A ddev Drupal fixture + a sync-eval case prove the output validates and matches the daisy-cms reference shape.

**Tech Stack:** Designbook skill files (`.agents/skills/designbook-drupal/**`, `.agents/skills/designbook/sync/**`), JSONata, the `prepare`/`generator` sync engine, the `debo-test` research loop, ddev Drupal + `config_inspector` + the `designbook_config_schema` drush helper.

## Global Constraints

- **All new content in `designbook-drupal`.** No new `designbook-ui-patterns` / `designbook-display-builder` skill. The shared UIP2 mechanism is a blueprint.
- **`.claude/skills/` is a symlink to `.agents/skills/`** — edit only under `.agents/skills/`.
- **Load `designbook-skill-creator` BEFORE creating/editing ANY file under `.agents/skills/designbook-drupal/` or `.agents/skills/designbook/`** — and load the matching per-file-type rule (`rules/blueprint-files.md` for blueprints, `rules/rule-files.md` for rules, `rules/task-files.md` for tasks, `rules/common-rules.md` always). Non-optional (CLAUDE.md).
- **Core stays backend-neutral.** No Drupal/drush specifics in `designbook/sync/**` — only mechanism/prose. Drupal knowledge lives in `designbook-drupal` blueprints as command strings + config + patterns.
- **No backwards-compat / migration code.** On-disk artifacts are disposable; testing is from scratch.
- **`allow_custom: false`** — no per-entity Layout Builder overrides.
- **`touch` every created/edited component/skill `.md` file after writing** (Storybook watcher race).
- **`pnpm check` green** (typecheck → lint → test, fail-fast) for any addon (`packages/`) change; run the `designbook-skill-creator` validator with zero errors for any skill-file change.
- **Schema-first** — push correctness into schema/enum/validators over imperative prose where a schema hook exists.
- Reference shape source of truth: `/home/cw/projects/daisy-cms` (`web/sites/default/files/sync/core.entity_view_display.block_content.{hero,card}.default.yml`). Design doc: `docs/superpowers/specs/2026-07-10-designbook-2-layout-builder-uip-display-design.md`.

---

## Task 1: Spike — blueprint resolution + UUID mechanism (GO/NO-GO)

Resolve the two mechanism unknowns the design flagged, before authoring patterns. Investigation only; no committed source changes except the written verdict.

**Files:**
- Create (scratch): `.superpowers/db2/task-1-report.md`

**Interfaces:**
- Produces: (a) verdict on whether `sync/tasks/transform.md`'s blueprint resolution can route a `core.entity_view_display.*` unit to a `domain: data-mapping` display blueprint as-is, or needs a routing clause; (b) the chosen UUID-minting mechanism for `sections[].components.<uuid>`.

- [ ] **Step 1: Trace the blueprint-resolution path.** Read `.agents/skills/designbook/sync/tasks/transform.md` (the "read the matching blueprint" prose, currently entity-type / field-types / config-type only) and `packages/storybook-addon-designbook/src/workflow-resolve.ts` (`checkConditions` / trigger+filter matching). Determine: for a display unit (`config_name = core.entity_view_display.<et>.<bundle>.<view_mode>`, carrying `entity_type`, `bundle`, view-mode `def`), does any existing mechanism select a data-mapping blueprint? Record the answer.

- [ ] **Step 2: Decide the routing change.** If resolution is prose-driven (the generator reads whichever blueprint the transform prose names), the change is a **one-clause edit to `transform.md`** ("for a `core.entity_view_display.*` unit, read the display-mapping blueprint matching the view mode's `template` + active `extensions`"). Confirm this is the minimal neutral edit and note it as Task 3's scope. If instead a hard engine change would be required, STOP and escalate (a bigger core change than the owner approved).

- [ ] **Step 3: Decide UUID minting.** `sections[].components` are UUID-keyed and re-running `sync-to` must not churn UUIDs (idempotent `config:import`). Check whether JSONata in this engine has any UUID/hash helper (grep `packages/storybook-addon-designbook/src` for `uuid`, `crypto`, custom JSONata functions registered on the runtime). Decide: **deterministic uuid5 of `config_name + region/field_name`** via an addon-registered JSONata helper (preferred — idempotent), vs. accepting a random UUID per run (churns config). Record the exact helper name/signature to add (if any) for Task 3/4.

- [ ] **Step 4: Write the verdict** to `.superpowers/db2/task-1-report.md`: the routing decision (as-is vs. one-clause `transform.md` edit) and the UUID decision (helper to add, or random-accepted). No commit (spike only).

---

## Task 2: Shared `ui-patterns.md` blueprint (path-neutral UIP2 sub-pattern)

**Files:**
- Create: `.agents/skills/designbook-drupal/data-mapping/blueprints/ui-patterns.md`

**Interfaces:**
- Consumes: a ComponentNode (`{component, props{}, slots{}}` — schema `designbook/scenes/schemas.yml#/ComponentNode`) + the SDC `components/<comp>/<comp>.component.yml` (props types + `variants` + slots).
- Produces: the `### to_drupal` PATTERN for the UI-Patterns-2 config block — `component_id`, `variant_id`, `props{}` each `{source_id, source}`, `slots{}` — referenced by name from `layout-builder-display.md` (Task 3) and, later, by DESIGNBOOK-3's Display Builder blueprint.

- [ ] **Step 1: Load `designbook-skill-creator`** + `rules/blueprint-files.md` + `rules/common-rules.md`. Re-read `data-mapping/blueprints/field-map.md` and `layout-builder.md` for the house frontmatter/section style.

- [ ] **Step 2: Write the blueprint frontmatter** per the skill-creator blueprint-file rule: `type: data-mapping`, `name: ui-patterns`, `trigger: { domain: data-mapping }`, and a `priority`. No `filter` (path-neutral — usable by both LB and Display Builder). Follow the exact frontmatter shape the skill-creator rule mandates; do not invent keys.

- [ ] **Step 3: Write the `### to_drupal` pattern body** documenting the mapping (prose + a JSONata skeleton the generator adapts). It MUST specify, verbatim to the daisy-cms shape:
  - `component_id: '<provider>:<component>'` — from the ComponentNode `component` (`provider:name`).
  - **props** — for each ComponentNode prop, emit `{ source_id, source }`:
    - literal value + SDC prop `type: boolean` → `source_id: checkbox`, `source: { value: <literal> }`.
    - literal value + SDC prop enum `string` → `source_id: select`, `source: { value: <literal> }`.
    - literal value + SDC prop `$ref: "ui-patterns://url"` → `source_id: url`, `source: { value: <literal> }`.
    - the implicit `attributes` prop / a literal attribute string → `source_id: attributes`, `source: { value: <literal or ''> }`.
    - a `[…]`-shaped token literal → `source_id: token`, `source: { value: '<token>' }`.
    - a field-reference value (`$fields.field_x`) → `source_id: entity_field`, `source: { derivable_context: 'field:<et>:<bundle>:<field>', 'field:<et>:<bundle>:<field>': { value: { source_id: 'ui_patterns_source:<et>:<field>' } } }`. (For a specific field property, leaf `source_id: 'field_property:<et>:<field>:<prop>'`.)
  - **variant_id** — `null` when the SDC `.component.yml` declares no `variants:`; otherwise a field-derived `{source_id, source}` (same `entity_field` shape) from the designated component-settings field.
  - **slots** — the `layout_settings.ui_patterns.slots` map is `{}` when slot content is placed via `field_block` regions (Task 3); inline slot sources (e.g. a nested component's slot) use `slots.<name>.sources[]` with a `field_property:...` `source_id` (as in the daisy-cms hero button `slots.label`).
  - Include a "Reused by" note: this block is the shared UIP2 mechanism; DESIGNBOOK-3 (Display Builder) references it unchanged — keep it free of Layout Builder / Display Builder specifics.
  - Paste a trimmed reference excerpt (a hero field-derived prop + a card static prop + a `variant_id` derived example) copied from the design doc's verified shapes so the generator has a concrete target.

- [ ] **Step 4: Validate + touch.** Run the `designbook-skill-creator` validator over the new file — zero errors. `touch` the file.

- [ ] **Step 5: Commit.**

```bash
git add .agents/skills/designbook-drupal/data-mapping/blueprints/ui-patterns.md
git commit -m "feat(drupal): shared ui-patterns.md blueprint — UIP2 {source_id,source} sub-pattern"
```

---

## Task 3: `layout-builder-display.md` blueprint + rule tweak + transform routing

**Files:**
- Create: `.agents/skills/designbook-drupal/data-mapping/blueprints/layout-builder-display.md`
- Modify: `.agents/skills/designbook-drupal/data-model/rules/layout-builder.md`
- Modify: `.agents/skills/designbook/sync/tasks/transform.md` (only if Task 1 Step 2 confirmed a routing clause is needed)
- Modify: `packages/storybook-addon-designbook/src/**` (only if Task 1 Step 3 chose a JSONata UUID helper to register) + its test

**Interfaces:**
- Consumes: the shared `ui-patterns.md` block (Task 2); a display unit `{ config_name: core.entity_view_display.<et>.<bundle>.<view_mode>, entity_type, bundle, def }`; the bundle's `entity-mapping/<et>.<bundle>.<vm>.jsonata` ComponentNode(s); the SDC `.component.yml`; the prepare-fetched typed-config schema.
- Produces: the `### to_drupal` PATTERN for `core.entity_view_display.*` on the Layout Builder path — the full `third_party_settings.layout_builder` + `sections[]` + UUID-keyed `field_block` component structure.

- [ ] **Step 1: Load `designbook-skill-creator`** + `rules/blueprint-files.md`, `rules/rule-files.md`, `rules/task-files.md`, `rules/common-rules.md`.

- [ ] **Step 2: Write `layout-builder-display.md` frontmatter** — `type: data-mapping`, `name: layout-builder-display`, `trigger: { domain: data-mapping }`, `filter: { extensions: layout_builder }`, a `priority`. (Distinct from the existing `layout-builder.md` data-mapping blueprint, which is the sample-data passthrough — do NOT overwrite it.)

- [ ] **Step 3: Write the `### to_drupal` pattern body.** It MUST specify, verbatim to the daisy-cms shape:
  - Input resolution (keeps input surfacing in the blueprint, no `resolve-filter` change): read the bundle's `entity-mapping/<et>.<bundle>.<view_mode>.jsonata` for the ComponentNode(s), and each referenced SDC `.component.yml`.
  - `third_party_settings.layout_builder: { enabled: true, allow_custom: false, sections: [...] }`.
  - Each ComponentNode → one section: `layout_id: 'ui_patterns:<set>:<component>'` (set = SDC provider), `layout_settings: { label: '', ui_patterns: <shared ui-patterns.md block>, context_mapping: { entity: layout_builder.entity } }`. A block_content SDC-as-layout display yields one section; a node/full LB display yields one-or-more sections (each a UI-Patterns layout with node field_blocks).
  - For each slot filled by a field, one `sections[].components.<uuid>`:
    - `uuid` (see UUID rule below), `region: <slot name>`, `weight`, `additional: {}`.
    - `configuration: { id: 'field_block:<et>:<bundle>:<field>', label, label_display: '0', provider: layout_builder, context_mapping: { entity: layout_builder.entity, view_mode: view_mode }, formatter: {...} }`.
    - `formatter.type` by field type: `string` (string/title), `text_default` (formatted text), `link` (link), a media formatter for entity-reference media; a field that renders AS a nested SDC (slot value is a nested ComponentNode/EntityNode) → `formatter.type: ui_patterns_component_per_item` whose `settings.ui_patterns` is the SAME shared `ui-patterns.md` block again (nested).
  - Top-level `content` / `hidden`: fields placed as `field_block`s are listed under `hidden: { <field>: true }`; a component-settings field (if the model has one) sits under `content` with `type: ui_patterns_source`.
  - Standard emission keys: `uuid`, `langcode: en`, `status: true`, `dependencies`, `id`, `targetEntityType`, `bundle`, `mode` (Drupal owns `dependencies` computation at import; author the identity keys).
  - **UUID rule** — apply Task 1 Step 3's decision: if deterministic, mint `uuid5(config_name + '/' + region + '/' + field)` via the registered JSONata helper (name from Task 1); state it explicitly so re-sync is idempotent. If random was accepted, state that re-sync churns component UUIDs (documented limitation).
  - Paste a trimmed reference excerpt (one hero section + its `field_block:...:field_title` component + the `ui_patterns_component_per_item` action component) from the design doc as the concrete target.

- [ ] **Step 4: Tweak `data-model/rules/layout-builder.md`** — add: per-entity Layout Builder overrides are out of scope (`allow_custom: false`); block_content `default` and landing-page `full` view modes render via a UI-Patterns-section display (the `layout-builder-display` blueprint). Keep existing rules intact.

- [ ] **Step 5: Transform routing (conditional).** If Task 1 Step 2 found a routing clause is needed, add ONE backend-neutral sentence to `sync/tasks/transform.md`: for a `core.entity_view_display.*` unit, read the display-mapping blueprint matching the view mode's `template` + active `extensions` (not the entity-type blueprint). No Drupal specifics. If Task 1 found resolution works as-is, skip this step and note it.

- [ ] **Step 6: UUID helper (conditional).** If Task 1 chose a registered JSONata helper, implement it in the addon (`packages/storybook-addon-designbook/src/**`), write a unit test (deterministic output for fixed input; stable across calls), and wire it into the JSONata runtime the transform uses. TDD: failing test → implement → passing.

- [ ] **Step 7: Validate + check + touch.** `designbook-skill-creator` validator zero errors over all edited skill files. If any `packages/` file changed, `pnpm check` green. `touch` every edited `.md`.

- [ ] **Step 8: Commit.**

```bash
git add .agents/skills/designbook-drupal/data-mapping/blueprints/layout-builder-display.md \
        .agents/skills/designbook-drupal/data-model/rules/layout-builder.md \
        .agents/skills/designbook/sync/tasks/transform.md \
        packages/storybook-addon-designbook/src
git commit -m "feat(drupal): layout-builder-display blueprint (LB + UIP2 entity view display)"
```

---

## Task 4: Fixture + sync-eval case + e2e against ddev

**Files:**
- Create/modify: a daisy-cms-like block_content component bundle (hero or card) in the drupal fixture data model used by the sync eval (`fixtures/drupal-web/**` — bundle + fields + entity-mapping + SDC + sample data for one bundle).
- Create: `fixtures/drupal-web/cases/sync-block-content.yaml` (the LB+UIP sync-eval case).

**Interfaces:**
- Consumes: Tasks 2–3 (the blueprints + routing); the `debo-test` research loop (`2026-06-30-sync-e2e-eval-design.md`); the ddev fixture (`start-drupal-workspace.sh`) + `designbook:config-schema` / `config-validate`.
- Produces: proof that `sync-to` authors a valid `core.entity_view_display.block_content.<bundle>.default` that validates against the live typed-config schema, imports via `config:import`, and matches the daisy-cms reference shape structurally.

- [ ] **Step 1: Add the fixture bundle.** In the reduced `drupal-web` data model, add (or slim to) one block_content component bundle — `hero` or `card` — with its fields, its `entity-mapping/block_content.<bundle>.default.jsonata` ComponentNode (component + static + field-derived props + slot→field placement), its SDC `components/<bundle>/<bundle>.component.yml` (props types + slots + `variants` for card), and sample data. Mirror the daisy-cms bundle's prop/slot set so the shapes are comparable.

- [ ] **Step 2: Write `sync-block-content.yaml`.** A `debo-test` case: `fixtures:` = the bundle slice + sample data; `prompt:` = run `/debo sync-to` for that bundle; `assert:` = workflow completed; `expected_config:` includes `block_content.type.<bundle>`, the `field.storage.*` / `field.field.*` names, and **`core.entity_view_display.block_content.<bundle>.default`**; `metric:` / `direction: max` = the composite `validate_pass_rate` + cim + `existence_rate` score (copy the shape from an existing `sync-*.yaml`).

- [ ] **Step 3: Provision + run e2e.** `./scripts/setup-workspace.sh db2e2e && ./scripts/start-drupal-workspace.sh db2e2e`. Drive `sync-to` for the bundle. Confirm: `prepare` fetches the `core.entity_view_display.*` schema; the generated `.jsonata` produces the LB+UIP display; it validates against the fetched schema + `designbook:config-validate`; `write-config` + `sync` (`config:import --partial`) apply it; `ddev drush config:get core.entity_view_display.block_content.<bundle>.default` shows the imported display.

- [ ] **Step 4: Shape-match check.** Diff the generated display against the daisy-cms reference (`core.entity_view_display.block_content.<bundle>.default.yml`) for structural equivalence: `layout_builder.enabled`+`allow_custom:false`, one `ui_patterns:<set>:<component>` section, `ui_patterns` props as `{source_id,source}` (field-derived + static + `variant_id`), one `field_block:<et>:<bundle>:<field>` per slot with `region` = slot name, `context_mapping.entity: layout_builder.entity` at both levels, nested `ui_patterns_component_per_item` where a field renders as a nested SDC. Record the comparison in the report. (Structural match, not identical `field_component` wiring — per the design Non-Goals.)

- [ ] **Step 5: Negative check.** Hand-break the generated `.jsonata` (drop `context_mapping.entity` or a required prop) and re-validate; confirm it fails at the prepare-schema / `validate_cmd` gate, not only at `config:import`.

- [ ] **Step 6: Cleanup + report.** `(cd workspaces/db2e2e && ddev delete -Oy); rm -rf workspaces/db2e2e`. Record full evidence (prepare output, generated display YAML, validation, cim, shape-diff, negative) in `.superpowers/db2/task-4-report.md`.

- [ ] **Step 7: Commit.**

```bash
git add fixtures/drupal-web
git commit -m "test(sync): LB+UIP entity view display fixture + sync-block-content eval case"
```

---

## Self-Review

- **Spec coverage:** shared UIP2 mechanism (Task 2 — acceptance #2, #4); LB display structure + field_block + nested + context_mapping (Task 3 — acceptance #1, #3, #5); validates against live schema + matches daisy-cms shape for ≥1 bundle (Task 4 — acceptance #6). Mechanism unknowns (blueprint routing, UUID) resolved before authoring (Task 1). `allow_custom:false` + node/full-in-scope + reuse-ComponentNode all carried into Tasks 3–4.
- **Placeholder scan:** the `### to_drupal` bodies specify exact keys/shapes copied from the verified daisy-cms reference; the only deliberately deferred items are gated behind Task 1 decisions (routing clause presence, UUID helper) — each is a concrete branch, not an open TODO.
- **Type consistency:** ComponentNode = `designbook/scenes/schemas.yml#/ComponentNode` throughout; display unit fields (`config_name`, `entity_type`, `bundle`, `def`) match `resolve-filter.md`'s emitted `ConfigNameUnit`; the shared block referenced by name (`ui-patterns.md`) in both the section `layout_settings.ui_patterns` and the nested `ui_patterns_component_per_item.settings.ui_patterns`.
- **Scope:** single subsystem (sync-to display authoring); one plan is right.
- **Backend-neutrality:** the only `designbook/sync/` touch is a possible one-sentence neutral routing clause (Task 3 Step 5, gated by Task 1) — flagged for the owner; all Drupal knowledge stays in `designbook-drupal` blueprints.
