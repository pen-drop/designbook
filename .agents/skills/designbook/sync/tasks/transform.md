---
title: "Transform config-name unit to Drupal config YAML"
trigger:
  steps: [sync-to:transform]
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

The shape is authoritative from `prepared` (the JSON Schema fetched by the `prepare` cmd for this config name). Use `prepared` as the primary guide for what properties to produce and which are required.

For the JSONata at the generator path: read the matching blueprint's `### to_drupal` block (the blueprint for `unit.entity_type` + the `field-types` prelude for field units, or the config-type blueprint for config-slice units) — this is the pattern to follow when authoring the transform. Run the authored JSONata over `unit` (binding `unit.entity_type`, `unit.bundle`, `unit.field_name`, `unit.def` as needed) to produce the config payload written to `{{ file }}`.

Schema conformance for `config-file` is validated against `prepared` — the live Drupal typed-config JSON Schema fetched by `prepare` — checked against the submitted content on completion. Live validation via the backend's config-validate command is deferred: it takes a file path argument, and the staged file lives on the host while the command executes inside the backend container, so the path does not resolve there. `backend_cmd.validate_cmd` is declared for this future capability but is currently unused by transform.
