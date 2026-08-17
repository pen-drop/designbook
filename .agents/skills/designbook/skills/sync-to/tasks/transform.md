---
title: "Transform config-name unit to Drupal config YAML"
trigger:
  steps: [sync-to:transform]
domain: [data-mapping, data-model]
params:
  type: object
  required: [units, backend_cmd, config_sync_dir]
  properties:
    units:
      type: array
      description: Ordered list of config-name units from the resolve-filter stage.
      items:
        $ref: ../schemas.yml#/ConfigNameUnit
    backend_cmd:
      type: object
      resolve: backend_cmd
      description: >
        Backend command strings from designbook.config.yml. Provides schema_cmd
        (append config name → JSON Schema on stdout), validate_cmd (append
        config name + yaml path → exit non-zero on violation), and import (run
        as-is by the sync stage to apply the config-sync directory).
      required: [schema_cmd, validate_cmd]
      properties:
        schema_cmd:
          type: string
          description: >
            Command prefix for fetching a config JSON Schema. The engine appends
            the config name before running (e.g. "ddev drush designbook:config-schema").
          examples: ["ddev drush designbook:config-schema"]
        validate_cmd:
          type: string
          description: >
            Command prefix for validating a config YAML file. The engine appends
            the config name and yaml path before running
            (e.g. "ddev drush designbook:config-validate").
          examples: ["ddev drush designbook:config-validate"]
        import:
          type: string
          description: >
            Complete command run as-is by the sync stage to import the
            config-sync directory into the live backend. Not used by transform
            itself; declared here so the shared backend_cmd shape validates
            when the config supplies it.
          examples: ["ddev drush config:import --partial -y --source=/var/www/html/web/sites/default/files/sync"]
        exists_cmd:
          type: string
          description: >
            Command prefix that exits 0 iff a config object already exists in
            the live backend; append the config name. Not used by transform
            itself (the resolve-filter stage already dropped existing units);
            declared here so the shared backend_cmd shape validates when the
            config supplies it.
          examples: ["ddev drush config:get"]
    config_sync_dir:
      type: string
      description: Absolute path to the Drupal config-sync directory where YAML files are written.
      resolve: config_sync_dir
result:
  type: object
  required: [config-file]
  properties:
    config-file:
      path: "{{ config_sync_dir }}/{{ unit.config_name }}.yml"
      description: >
        The Drupal configuration YAML file written directly to the config-sync directory.
        Filename derives from the iteration binding unit.config_name. Shape is
        authoritative from the prepare-fetched schema (stored as prepared).
      prepare:
        cmd: "{{ backend_cmd.schema_cmd }} {{ unit.config_name }}"
        as: prepared
      generator:
        jsonata: "$DESIGNBOOK_DATA/sync/{{ unit.config_name }}.jsonata"
each:
  unit:
    expr: "units"
    schema:
      $ref: ../schemas.yml#/ConfigNameUnit
---

# Transform

Author and run a per-config-name JSONata to produce the Drupal configuration YAML for one unit, written directly to the config-sync directory.

## Result: config-file

For each unit, the result is the Drupal config YAML file at `{{ config_sync_dir }}/{{ unit.config_name }}.yml` — one file per config name, written as the terminal step.

`prepared` (the JSON Schema fetched by the `prepare` cmd for this config name) is authoritative for the **shape**: it decides which properties are allowed and which are required — the *form* of the config. The **content** — the values that fill that shape — comes from the Scene and the unit's `def`, carried unchanged: the Scene is the source, this config its translation. `prepared` is the guide for the form, never a stand-in for what the Scene means; where a property could take many schema-valid values, the Scene's value is the one to produce.

For the JSONata at the generator path, pick the guiding blueprint by this precedence: (1) if a loaded blueprint declares a `trigger.config_name` glob that matches `unit.config_name`, follow that blueprint's `### to_drupal` block — such a blueprint is already gated to the project by its own `filter:` (extensions/frameworks), so it is present only when it applies; (2) otherwise, for a content-derived unit follow the blueprint for `unit.entity_type` plus the `field-types` prelude for field units; (3) otherwise, for a config-slice unit follow the config-type blueprint; (4) with no matching blueprint, author from `prepared` alone — **a reported state, never a silent one**: record the unit as an uncovered stage-4 case in the outtake (surfaced in `workflow summary`), so a missing blueprint shows up instead of quietly producing schema-conformant-but-not-Scene config. Every unit kind that occurs today has a covering blueprint; a stage-4 hit means a new unit kind needs one. This is the pattern to follow when authoring the transform. Run the authored JSONata over `unit` (binding `unit.entity_type`, `unit.bundle`, `unit.field_name`, `unit.def` as needed) to produce the config payload written to `{{ file }}`.

When a display unit's `def` carries `template: presenter` (a surface whose presentation the display config cannot express), follow the presenter-template blueprint **in addition to** the display-unit pattern: `transform` writes the **presenter-template** to the path and shape that blueprint directs, alongside the unit's config YAML. The config remains the binding; the presenter-template carries the presentation the display config cannot express. A declaratively bindable surface (`template: field-map`) writes config only.

Schema conformance for `config-file` is validated against `prepared` — the live Drupal typed-config JSON Schema fetched by `prepare` — checked against the submitted content on completion. Live validation via the backend's config-validate command is deferred: it takes a file path argument, and the staged file lives on the host while the command executes inside the backend container, so the path does not resolve there. `backend_cmd.validate_cmd` is declared for this future capability but is currently unused by transform.
