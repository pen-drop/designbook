---
title: Transform sync unit to its backend file
trigger:
  steps:
    - sync-to:transform
domain:
  - data-mapping
  - data-model
params:
  type: object
  required:
    - unit
    - backend_cmd
    - sync_target_dir
  properties:
    unit:
      $ref: ../schemas.yml#/SyncUnit
      description: The one sync unit this task writes (intake plans one transform task per unit).
    backend_cmd:
      type: object
      resolve: backend_cmd
      description: >
        Backend command strings from designbook.config.yml. Optionally provides schema_cmd
        (append unit name → JSON Schema of the unit's output on stdout) and validate_cmd; import
        and exists_cmd belong to the sync stage and the intake existence filter.
      properties:
        schema_cmd:
          type: string
          description: >
            Command prefix for fetching the JSON Schema of a unit's output. The engine appends
            the unit name before running. Absent for backends without typed output schemas.
        validate_cmd:
          type: string
          description: >
            Command prefix for validating a written output file. The engine appends the unit
            name and file path before running; exit non-zero with the violations on stderr
            when invalid.
        import:
          type: string
          description: Complete command run as-is by the sync stage. Not used by transform itself.
        exists_cmd:
          type: string
          description: Existence-check prefix used at intake. Not used by transform itself.
    sync_target_dir:
      type: string
      description: Absolute path to the backend's sync output root where files are written.
      resolve: sync_target_dir
result:
  type: object
  required:
    - output-file
  properties:
    output-file:
      path: '{{ sync_target_dir }}/{{ unit.path }}'
      description: >
        The unit's backend file written below the sync target directory. When `schema_cmd` is
        configured, its shape is authoritative from the prepare-fetched schema (stored as
        prepared).
      prepare:
        cmd: '{{ backend_cmd.schema_cmd }} {{ unit.name }}'
        as: prepared
      generator:
        jsonata: $DESIGNBOOK_DATA/sync/{{ unit.name }}.jsonata
      validators:
        - 'cmd:{{ backend_cmd.validate_cmd }} {{ unit.name }} {{ file }}'
---

# Transform

Author and run a per-unit JSONata that produces the unit's backend file, written below the sync target directory.

## Result: output-file

For each unit, the result is the file at `{{ sync_target_dir }}/{{ unit.path }}` — one file per unit, written as the terminal step. A structured result is serialized by the file extension; a string result is written verbatim (source code such as PHP or Twig).

When `backend_cmd.schema_cmd` is configured, the `prepare` command runs and `prepared` (the JSON Schema it fetches for this unit) is authoritative for the **shape**: which properties are allowed and which are required. Without `schema_cmd` the matching blueprint alone defines the shape. The **content** — the values that fill that shape — comes from the Scene and the unit's `def`, carried unchanged: the Scene is the source, this file its translation. Where a property could take many valid values, the Scene's value is the one to produce.

For the JSONata at the generator path, pick the guiding blueprint by this precedence: (1) if a loaded blueprint declares a `trigger.config_name` glob that matches `unit.name`, follow that blueprint — such a blueprint is already gated to the project by its own `filter:`, so it is present only when it applies; (2) otherwise, for a content-derived unit follow the blueprint for `unit.entity_type` plus the `field-types` prelude for field units; (3) otherwise, for a config-slice unit follow the config-type blueprint; (4) with no matching blueprint, author from `prepared` (or the unit `def`) alone — **a reported state, never a silent one**: record the unit as an uncovered stage-4 case in the outtake (surfaced in `plan summary`), so a missing blueprint shows up. Run the authored JSONata over `unit` (binding `unit.entity_type`, `unit.bundle`, `unit.field_name`, `unit.def` as needed) to produce the payload written to `{{ file }}`.

When a display unit's `def` carries `template: presenter` (a surface whose presentation the display output cannot express), follow the presenter-template blueprint **in addition to** the display-unit pattern: `transform` writes the **presenter-template** to the path and shape that blueprint directs, alongside the unit's file. A declaratively bindable surface (`template: field-map`) writes the unit's file only.

Schema conformance for `output-file` is checked against `prepared` on completion when `schema_cmd` is configured. When `backend_cmd.validate_cmd` is configured, it runs on the written file at completion; a failure leaves the task open until the file passes.
