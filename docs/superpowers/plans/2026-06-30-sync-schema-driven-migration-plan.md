# Sync → Schema-Driven Generation — Implementation Plan (Plan 3 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Drupal sync export from static blueprint `to_drupal` JSONata + static `DrupalConfigEntity` validation to the schema-driven `prepare`/`generator` model: the AI generates a per-slice `.jsonata` guided by Drupal's *fetched* config schema, and the result is validated against that fetched schema + `config_inspector` — with the real backend command strings declared in `designbook-drupal` (no new backend code).

**Architecture:** The unit of work shifts from a slice-that-emits-an-array to **one Drupal config name** — because the Plan-2 engine sets ONE `prepare`-fetched schema per ONE result, and a Drupal config schema describes a single config object, not an array. `resolve-filter` expands a slice into its **config-name units** (a node bundle → `node.type.<bundle>` + `field.storage.node.<field>` + `field.field.node.<bundle>.<field>` …, derived from the data model + naming conventions). The `transform` task iterates per config-name: `prepare: {cmd: "<schema_cmd> <config_name>", as: prepared}` fetches that config's schema, `generator: {jsonata: <persisted path>}` has the AI author its transform (guided by the fetched schema + the blueprint pattern), and the result IS the config **data**, validated against the fetched schema + a `cmd: <validate_cmd>` config_inspector cross-check. `write-config` writes `data` → `<config_name>.yml` (config_name from the iteration binding). The static `### to_drupal` blocks become pattern guidance; **`DrupalConfigEntity`/`DrupalConfigSet` are removed entirely** (no envelope needed — config_name is the iteration key, data is the result); the dependency-closure step retires (Drupal `cim`/export own dependency wiring).

**Tech Stack:** Designbook skill files (sync tasks + designbook-drupal blueprints/config), JSONata, the `prepare`/`generator` engine primitives (Plan 2), ddev Drupal fixture (Plan 1) + `config_inspector`, `drush`.

## Global Constraints

- **No backend-specific code in our codebase.** `schema_cmd`/`validate_cmd` are command STRINGS in `designbook-drupal` config built on EXISTING drush + `config_inspector` (incl. `drush php:eval` one-liners as data). No new PHP module, no custom drush command, no backend TS. (Spec Non-Goals.)
- **Backend-neutral engine.** Reuse the Plan-2 `prepare`/`generator` result keys; the engine stays untouched here (this plan is skill files + config).
- **No backwards-compat/migration code.** Retire the superseded artifacts outright; testing is from scratch.
- **`.claude/skills/` is a symlink to `.agents/skills/`** — edit only `.agents/skills/`; load `designbook-skill-creator` before editing any `.agents/skills/designbook*/` file.
- **`pnpm check` green** for any addon change (this plan should need none; if a test references retired schemas, update it).
- **design-* / entity-mapping untouched** — this plan only reworks the Drupal config *sync* path.

## ⚠️ Linchpin risk (read before starting)

The whole plan hinges on **`schema_cmd`**: a command using only existing drush/`config_inspector` that, given a Drupal config name, prints a **JSON Schema** on stdout describing what Drupal expects. This is **unverified**. Task 1 is a **go/no-go spike**. If no existing-drush path can emit usable JSON Schema (typed-config → JSON Schema is non-trivial), STOP and escalate — the options would be (a) loosen "validate against a real JSON Schema" to "validate by attempting `cim --partial` + `config:inspect` only" (drop the prepare-fetched-schema AJV step for Drupal, keep the config_inspector cmd validator as the authoritative gate), or (b) revisit the no-new-code constraint. Do not invent a PHP module to force it.

---

## Plan Split (roadmap)

1. ✅ Unified Drupal-layout workspace + backend command config (PR #114).
2. ✅ `prepare:`/`generator:` engine primitives (PR #114).
3. **Sync → schema-driven generation** — THIS PLAN. Drupal sync only; design-*/entity-mapping untouched.

---

## File Structure (Plan 3)

- Modify: `.agents/skills/designbook-drupal/install/blueprints/designbook-config.md` — finalize `backend_cmd.schema_cmd` / `validate_cmd` to the verified real commands (from Task 1).
- Modify: `.agents/skills/designbook/sync/tasks/resolve-filter.md` — expand each slice into its **config-name units** (a content bundle → `<et>.type.<bundle>` + `field.storage.<et>.<field>` + `field.field.<et>.<bundle>.<field>` …; a config slice → its config name), each carrying the data-model context needed to generate that one config. Emits a list of config-name units.
- Modify: `.agents/skills/designbook/sync/tasks/transform.md` — `each` iterates config-name units; result per unit declares `prepare` + `generator`; the result IS the config `data` (validated against the fetched schema), not an array; drop `schema:DrupalConfigSet`.
- Modify: `.agents/skills/designbook/sync/tasks/write-config.md` — write the unit's `data` to `{{ config_sync_dir }}/{{ unit.config_name }}.yml` (config_name from the iteration, no envelope).
- Modify: `.agents/skills/designbook/sync/workflows/sync-to.md` — drop the `resolve-deps` stage (Drupal owns dependency wiring); keep intake→resolve-filter→transform→write-config→sync→outtake.
- Modify: `.agents/skills/designbook/sync/schemas.yml` — **remove `DrupalConfigEntity` AND `DrupalConfigSet` entirely**; add a thin `ConfigNameUnit` (config_name + the gen context) for resolve-filter's output; keep `ExportSlice`/`ExportSummary`/`SyncResult`.
- Modify: `.agents/skills/designbook-drupal/data-model/blueprints/{node,media,view,block_content,taxonomy_term,field-types}.md` + `data-mapping/blueprints/{field-map,...}.md` — reframe the `### to_drupal` blocks as **pattern guidance** for the generator (not the executed expression).
- Delete/retire: `.agents/skills/designbook/sync/tasks/resolve-deps.md` + `packages/storybook-addon-designbook/src/sync/deps-closure.ts` (+ its test) — if Task 4 confirms deps are owned by Drupal.
- Modify: `.agents/skills/designbook-drupal/data-model/rules/drupal-config.md` — drop the field.storage-dedup/deps invariants that Drupal now owns; keep only what still applies.

---

## Task 1: Spike — realize `schema_cmd` + `validate_cmd` against the fixture (GO/NO-GO)

**Files:**
- Create (scratch, not committed): notes in `.superpowers/sdd/task-1-report.md`
- (No source changes yet — this is investigation.)

**Interfaces:**
- Produces: two verified command STRINGS (built on existing drush/`config_inspector`) — `schema_cmd` (config name → JSON Schema on stdout) and `validate_cmd` (config YAML file → non-zero exit on schema violation) — or a documented GO/NO-GO verdict with the fallback.

- [ ] **Step 1: Provision + boot the fixture**

Run `./scripts/setup-workspace.sh p3spike` then `./scripts/start-drupal-workspace.sh p3spike`. Confirm `cd workspaces/p3spike && ddev drush status` bootstraps and `config_inspector` is enabled.

- [ ] **Step 2: Probe schema emission via existing capabilities**

From the workspace, try (in order, stop at the first that yields usable JSON Schema for `node.type.article`):
- `ddev drush config:inspect --help` — does it expose a schema/definition dump or `--format=json`?
- `ddev drush ev "echo json_encode(\Drupal::service('config.typed')->getDefinition('node.type.article'));"` — does typed-config return a definition tree that maps to JSON Schema (mapping→object, sequence→array, scalar types, required)?
- A `drush php:eval` one-liner that walks the typed-config definition into a minimal JSON Schema (`{type, required, properties}`) — KEEP IT A DATA STRING (no committed PHP file). Test it emits valid JSON for `node.type.article`, `field.field.node.article.<f>`, `core.entity_view_display.node.article.teaser`, `image.style.<s>`, `views.view.<v>`.

Record the exact working command string (or that none works).

- [ ] **Step 3: Probe validation via config_inspector**

Write a known-good config YAML into the sync dir, then find the `config_inspector` invocation that reports a schema violation with a non-zero exit (try `ddev drush config:inspect --detail <name>` after importing, or its list/validate mode). Record the exact `validate_cmd` string + how it signals failure.

- [ ] **Step 4: GO/NO-GO verdict + cleanup**

Write the verdict to the report: the two verified command strings, or NO-GO with which fallback (per the Linchpin risk note) is recommended. Clean up: `(cd workspaces/p3spike && ddev delete -Oy); rm -rf workspaces/p3spike`.

- [ ] **Step 5: Escalate if NO-GO**

If schema emission is not achievable with existing drush/config_inspector, STOP and report — do not proceed to Tasks 2–5 without a decision on the fallback. No commit needed (spike only); the controller decides next.

---

## Task 2: Finalize `backend_cmd` to the verified commands

**Files:**
- Modify: `.agents/skills/designbook-drupal/install/blueprints/designbook-config.md`

**Interfaces:**
- Consumes: the verified `schema_cmd`/`validate_cmd` strings from Task 1.
- Produces: the emitted `designbook.config.yml` `backend_cmd` block carries the REAL commands (not the Plan-1 placeholders).

- [ ] **Step 1: Load skill-creator** (blueprint-files + common rules).

- [ ] **Step 2: Replace the placeholder commands** with Task 1's verified strings:
  - `schema_cmd:` → the verified config-name → JSON-Schema command.
  - `validate_cmd:` → the verified config_inspector validation command.
  Keep `cmd: "ddev drush"` as the base prefix; keep the data-not-code framing prose; note these were verified against the committed fixture.

- [ ] **Step 3: Validate** — skill-creator validator zero errors. `touch` the file.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook-drupal/install/blueprints/designbook-config.md
git commit -m "feat(drupal): finalize backend_cmd schema_cmd/validate_cmd to verified commands"
```

---

## Task 3: Migrate the `transform` task to prepare/generator

**Files:**
- Modify: `.agents/skills/designbook/sync/tasks/transform.md`

**Interfaces:**
- Consumes: `ExportSlice` slices; `backend_cmd.*` (via `{{ backend_cmd.* }}`); the per-type blueprint `### to_drupal` PATTERN; the Plan-2 `prepare`/`generator` engine keys.
- Produces: per slice, a generated, persisted `.jsonata` + a `config-set` result validated against the prepare-fetched Drupal schema + `validate_cmd`.

- [ ] **Step 1: Load skill-creator** (task-files + schema-files + common rules). Re-read the current `transform.md`.

- [ ] **Step 2: Iterate per config-name unit + rewrite the result declaration**

Change `each` to iterate the config-name units from `resolve-filter` (binding e.g. `unit`, each with `unit.config_name` + its gen context). The single result (the config `data`) declares:
- `prepare: { cmd: "{{ backend_cmd.schema_cmd }} {{ unit.config_name }}", as: prepared }` — fetch that config's Drupal schema; the result `data` is validated against it.
- `generator: { jsonata: "$DESIGNBOOK_DATA/sync/{{ unit.config_name }}.jsonata" }` — the persisted, re-runnable transform for this one config.
- `validators: [ "cmd:{{ backend_cmd.validate_cmd }} {{ file }}" ]` — config_inspector cross-check.
Remove `config-set`, `schema:DrupalConfigSet`, and the `$ref: ../schemas.yml#/DrupalConfigSet`. The result is the config `data` object (no `{config_name,data}` envelope — config_name is the iteration key).

- [ ] **Step 3: Rewrite the body**

Instruct the AI: for this config-name unit, read the matching blueprint pattern (entity-type/config-type/field-types `### to_drupal` block) for HOW this config maps from the data model; using `prepared` (Drupal's expected schema for `unit.config_name`) as the authoritative shape, author the `.jsonata` at the generator path conforming to it; run it over `unit`'s gen context to produce the config `data`; it is validated against `prepared` + `validate_cmd`.

- [ ] **Step 4: Validate + check** — skill-creator validator zero errors; `pnpm check` (update any addon test that asserted the old `schema:DrupalConfigSet` transform result). `touch` the file.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/sync/tasks/transform.md
git commit -m "feat(sync): transform via prepare/generator (fetched schema + config_inspector)"
```

---

## Task 4: Retire static to_drupal contract + deps-closure

**Files:**
- Modify: `.agents/skills/designbook/sync/workflows/sync-to.md` (drop `resolve-deps` stage)
- Modify: `.agents/skills/designbook/sync/schemas.yml` (remove `DrupalConfigEntity` AND `DrupalConfigSet` entirely)
- Delete: `.agents/skills/designbook/sync/tasks/resolve-deps.md`, `packages/storybook-addon-designbook/src/sync/deps-closure.ts` + `__tests__/deps-closure.test.ts`
- Modify: the `### to_drupal` blueprints (data-model + data-mapping) — reframe as pattern guidance
- Modify: `.agents/skills/designbook-drupal/data-model/rules/drupal-config.md`

**Interfaces:**
- Produces: a sync path with no static `DrupalConfigSet` validation and no dependency-closure step; blueprints document the mapping PATTERN, not an executed expression.

- [ ] **Step 1: Load skill-creator.**

- [ ] **Step 2: Drop `resolve-deps`** from `sync-to.md` stages; delete `resolve-deps.md` + `deps-closure.ts` + its test. (Drupal `cim`/export own dependency wiring — confirm Task 1/5 import works without our closure.)

- [ ] **Step 3: Remove `DrupalConfigEntity` + `DrupalConfigSet` entirely** from `sync/schemas.yml` — both are superseded (config_name = iteration key; data-shape = the prepare-fetched Drupal schema). write-config no longer `$ref`s them (Task 3 repointed it to write `unit.data` → `{{ unit.config_name }}.yml` with a `cmd:npx js-yaml {{ file }}` parse check). Keep `ExportSlice`, `ExportSummary`, `SyncResult`; the new `ConfigNameUnit` is added (File Structure).

- [ ] **Step 4: Reframe the `### to_drupal` blocks** in `node/media/view/block_content/taxonomy_term/field-types` (+ data-mapping `field-map` etc.) as **pattern/guidance** for the generator (a heading note: "Pattern for the generated transform; the concrete jsonata is authored per task against the prepare-fetched schema"). Do NOT delete the patterns — they guide generation.

- [ ] **Step 5: Trim `drupal-config.md` rule** — drop the field.storage-dedup + dependency-completeness invariants now owned by Drupal; keep any still-valid invariant (e.g. provider/namespace resolution).

- [ ] **Step 6: Validate + check** — skill-creator validator over edited skill files zero errors; `pnpm check` green (deps-closure test removed; no dangling import). `touch` edited .md files.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(sync): retire static DrupalConfigEntity + deps-closure; blueprints become generator patterns"
```

---

## Task 5: End-to-end against the fixture

**Files:**
- (Test/verification; a smoke note in the report.)

**Interfaces:**
- Consumes: Tasks 2–4 + the ddev fixture.
- Produces: proof that `sync-to` for a real bundle fetches the Drupal schema (prepare), the AI-generated jsonata validates against it + config_inspector, the config writes + `cim`-imports, and a deliberately-broken transform is caught at validation time (not at `cim`).

- [ ] **Step 1: Provision + boot** — `./scripts/setup-workspace.sh p3e2e && ./scripts/start-drupal-workspace.sh p3e2e`.

- [ ] **Step 2: Run sync-to for one bundle** — drive the `sync-to` workflow for `node`/`article` (the data model in the fixture theme). Confirm: prepare runs `schema_cmd` and returns a schema; the generated `.jsonata` persists; the produced config validates against the fetched schema + `validate_cmd`; `write-config` + `sync` (`cim --partial`) apply it; `ddev drush` confirms the bundle exists.

- [ ] **Step 3: Negative check** — hand-break the generated jsonata (drop a schema-required key) and re-validate; confirm it fails at the prepare-schema/validate_cmd gate, NOT only at `cim`.

- [ ] **Step 4: Re-export check** — re-run the persisted `.jsonata`; confirm identical config (no drift).

- [ ] **Step 5: Cleanup + report** — `(cd workspaces/p3e2e && ddev delete -Oy); rm -rf workspaces/p3e2e`. Record the full evidence (prepare output, generated jsonata, validation, cim, negative + re-export) in the report.

- [ ] **Step 6: Commit** (any test/doc artifacts; the e2e is manual evidence in the report).

```bash
git commit --allow-empty -m "test(sync): e2e schema-driven export verified against ddev fixture"
```

---

## Self-Review (Plan 3)

- **Spec coverage:** schema_cmd/validate_cmd realized + verified (T1/T2); transform → prepare/generator with fetched-schema validation (T3); static `to_drupal`/`DrupalConfigEntity`/deps-closure retired, blueprints become patterns (T4); e2e + negative + re-export against the fixture (T5). Backend-neutral (commands as config; no new backend code). design-*/entity-mapping untouched.
- **Linchpin honesty:** Task 1 is an explicit GO/NO-GO; if existing drush can't emit JSON Schema, the plan stops for a fallback decision rather than inventing backend code. Tasks 2–5 are contingent on Task 1 GO.
- **Placeholder scan:** Task 1 is investigation (no fabricated commands — it derives them); later tasks reference Task 1's verified strings rather than guessing. The `<config-name-expr>` in T3 is described by its mapping rule (content → `<et>.type.<bundle>`; config → config_key) — confirm exact JSONata against the slice shape when implementing.
- **Type consistency:** `ExportSlice`/`ExportSummary`/`SyncResult` retained; `DrupalConfigEntity` AND `DrupalConfigSet` removed entirely. New `ConfigNameUnit` (resolve-filter output) flows into transform's `each`. write-config no longer `$ref`s a removed schema — it writes `unit.data` → `{{ unit.config_name }}.yml`. Confirm NO file still `$ref`s `DrupalConfigEntity`/`DrupalConfigSet` after T3/T4 (grep `.agents/skills/designbook/sync`).
- **Granularity note:** the unit is one Drupal config name (forced by Plan-2's one-schema-per-result `prepare`). A bundle expands to many units (type + per-field storage/instance) → more, smaller `.jsonata` files + a schema fetch per config name. Accepted: this is what makes `prepare`/`generator` validate correctly.
