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
