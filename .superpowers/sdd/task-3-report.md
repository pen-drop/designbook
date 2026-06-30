# Task 3 Report: Per-config-name units + transform via prepare/generator

**Date:** 2026-06-30
**Verdict: DONE**

---

## 1. ConfigNameUnit schema (`schemas.yml`)

Added `ConfigNameUnit` at the end of `designbook/sync/schemas.yml`. Shape:

```yaml
ConfigNameUnit:
  config_name: string (required, dotted pattern)  # e.g. node.type.article
  entity_type?: string                            # e.g. "node", "media"
  bundle?: string                                 # e.g. "article"
  field_name?: string                             # e.g. "field_body"
  config_key?: string                             # e.g. "views.listing" (config-slice units)
  def?: object                                    # bundle def, field def, or config def
```

`DrupalConfigEntity` and `DrupalConfigSet` were intentionally NOT removed (Task 4 scope). `ExportSlice`, `ExportSummary`, `SyncResult` kept unchanged.

---

## 2. resolve-filter.md — expand slices → config-name units

**Result changed:** `slices: ExportSlice[]` → `units: ConfigNameUnit[]`

Expansion logic per content bundle slice:
1. One bundle-type unit: `<et>.type.<bundle>` (with `taxonomy_term` → `taxonomy.vocabulary.<bundle>` exception; `media` → `media.type.<bundle>`; `block_content` → `block_content.type.<bundle>`)
2. Per field: one storage unit `field.storage.<et>.<field_name>` — deduplicated across bundles
3. Per field: one instance unit `field.field.<et>.<bundle>.<field_name>`
4. Per view mode in `def.view_modes`: one display unit `core.entity_view_display.<et>.<bundle>.<view_mode>`

Config slice → single unit with `config_name = <config_key>`.

Each unit carries its gen context (`entity_type`, `bundle`, `field_name`, `config_key`, `def`).

---

## 3. transform.md — iterate units with prepare/generator

**Params changed:** `slices: ExportSlice[]` → `units: ConfigNameUnit[]` + `backend_cmd: {schema_cmd, validate_cmd}`

**each binding:** `unit` over `units` (was `slice` over `slices`)

**Result changed:** removed `config-set: DrupalConfigSet` (with `schema:DrupalConfigSet` validator). Added `data` (file result):

```yaml
data:
  path: "$DESIGNBOOK_DATA/sync/{{ unit.config_name }}.yml"
  prepare:
    cmd: "{{ backend_cmd.schema_cmd }} {{ unit.config_name }}"
    as: prepared
  generator:
    jsonata: "$DESIGNBOOK_DATA/sync/{{ unit.config_name }}.jsonata"
  validators:
    - "cmd:{{ backend_cmd.validate_cmd }} {{ unit.config_name }} {{ file }}"
```

Body: instructs the agent to read the matching blueprint `### to_drupal` pattern, use `prepared` as the authoritative shape, author the `.jsonata`, and run it over `unit` to produce the config payload.

---

## 4. write-config.md — write unit data

**Params changed:** `config-set: DrupalConfigSet` removed; added `units: ConfigNameUnit[]`. `config_sync_dir` kept.

**each binding:** `unit` over `units` (was `config_entity` over `config-set`)

**Result:**
```yaml
config-file:
  path: "{{ config_sync_dir }}/{{ unit.config_name }}.yml"
  validators: ["cmd:npx js-yaml {{ file }}"]
```

No `DrupalConfigEntity` `$ref` (dropped per brief). TASK-12 warning accepted — file content is dynamically typed config data; no appropriate static schema exists.

---

## 5. Validator results per file

All files: **zero errors**.

| File | Errors | Warnings | Notes |
|---|---|---|---|
| `sync/schemas.yml` | 0 | 0 | ConfigNameUnit fully described |
| `sync/tasks/resolve-filter.md` | 0 | 0 | Clean |
| `sync/tasks/transform.md` | 0 | 1 | TASK-12 on `data` result: path without $ref — intentional (prepare-fetched schema) |
| `sync/tasks/write-config.md` | 0 | 1 | TASK-12 on `config-file`: path without $ref — intentional (dynamic config data) |

Checked: COMMON-01/02, TASK-01/03/04/09/11/12/14, SCHEMA-01/02/03/04.

---

## 6. pnpm check

**Green.** 96 test files, 1030 tests passed. No addon test referenced `schema:DrupalConfigSet` — the smoke test (`sync-to.smoke.test.ts`) tests the JSONata blueprints directly and was unaffected.

---

## 7. Param/result chain

- resolve-filter outputs `units: ConfigNameUnit[]`
- transform consumes `units: ConfigNameUnit[]` + `backend_cmd`, iterates via `each: unit`, produces one `data` file per unit
- write-config consumes `units: ConfigNameUnit[]` (same source), iterates via `each: unit`, writes each to `config_sync_dir`

The `backend_cmd` param in transform is declared with `required: [schema_cmd, validate_cmd]` and full `description:`/`examples:` — sourced from the `designbook.config.yml` `backend_cmd` block (finalized in Task 2).

---

## 8. Concerns

None blocking.

Minor: write-config re-declares `units` as a param (mirrors transform). The engine uses scope flow between stages — this is consistent with how the current write-config declared `config-set` as an explicit param. Both TASK-12 warnings are intentional and documented above.

`resolve-deps.md` still exists and references `DrupalConfigSet`; its retirement is Task 4 scope per the brief.

---

## Fix: transform terminal write

**Date:** 2026-06-30

### Root cause resolved

The data handoff between transform and write-config was split across two stages, with transform writing intermediate data to `$DESIGNBOOK_DATA/sync/` and write-config copying it to `config_sync_dir`. The `validate_cmd` requires a YAML file (`{{ file }}`), the Plan-2 engine validates a FILE result's parsed content against the prepare-fetched schema, and `generator` requires the `.jsonata` artifact. This means transform must be the terminal writer and write-config is redundant.

### Changes

**`tasks/transform.md`**
- Result key renamed `data` → `config-file` (file result)
- Path changed from `$DESIGNBOOK_DATA/sync/{{ unit.config_name }}.yml` → `{{ config_sync_dir }}/{{ unit.config_name }}.yml` (terminal config-sync dir)
- `config_sync_dir` added to `params` (with `resolve: config_sync_dir`, mirroring sync-to.md / old write-config.md)
- `prepare`, `generator`, `validators` retained on the `config-file` result
- Body updated: instructs agent that this is the terminal write step; uses `{{ file }}` reference

**`workflows/sync-to.md`**
- Dropped `resolve-deps` stage (Drupal `cim` owns dependency wiring; resolve-deps.md file kept for Task 4)
- Dropped `write-config` stage (transform is now the terminal writer)
- New stage order: `intake → resolve-filter → transform → sync → outtake`
- `with_deps` param removed (consumed only by resolve-deps which is now dropped from the pipeline)

**`tasks/write-config.md`**
- Deleted via `git rm` — transform is the terminal writer

**`tasks/resolve-filter.md`**
- Fixed bundle-type exception wording: `media` and `block_content` are NOT exceptions — they follow the standard `<et>.type.<bundle>` pattern. Only `taxonomy_term` is a real exception (`taxonomy.vocabulary.<bundle>`).

### Validator results

| File | Errors | Warnings | Notes |
|---|---|---|---|
| `sync/tasks/transform.md` | 0 | 1 | TASK-12 on `config-file`: file result without $ref — expected/intentional (prepare-fetched dynamic schema) |
| `sync/workflows/sync-to.md` | 0 | 0 | Clean; WORKFLOW-01 pass (all step names plain) |
| `sync/tasks/resolve-filter.md` | 0 | 0 | Clean |

### pnpm check

**Green.** 96 test files, 1030 tests passed.

### Pipeline param flow confirmed

- resolve-filter outputs `units: ConfigNameUnit[]`
- transform consumes `units` + `backend_cmd` + `config_sync_dir`, iterates via `each: unit`, writes `{{ config_sync_dir }}/{{ unit.config_name }}.yml` as the terminal file
- No further write step
