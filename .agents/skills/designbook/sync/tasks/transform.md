---
title: "Transform config-name unit to Drupal config data"
trigger:
  steps: [sync-to:transform]
params:
  type: object
  required: [units, backend_cmd]
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
        (append config name → JSON Schema on stdout) and validate_cmd (append
        config name + yaml path → exit non-zero on violation).
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
result:
  type: object
  required: [data]
  properties:
    data:
      path: "$DESIGNBOOK_DATA/sync/{{ unit.config_name }}.yml"
      description: >
        The Drupal configuration payload for this unit. Written verbatim to the
        config/sync directory by write-config. Shape is authoritative from the
        prepare-fetched schema (stored as prepared).
      prepare:
        cmd: "{{ backend_cmd.schema_cmd }} {{ unit.config_name }}"
        as: prepared
      generator:
        jsonata: "$DESIGNBOOK_DATA/sync/{{ unit.config_name }}.jsonata"
      validators:
        - "cmd:{{ backend_cmd.validate_cmd }} {{ unit.config_name }} {{ file }}"
each:
  unit:
    expr: "units"
    schema:
      $ref: ../schemas.yml#/ConfigNameUnit
---

# Transform

Author and run a per-config-name JSONata to produce the Drupal configuration data for one unit.

## Result: data

For each unit, the result is the configuration payload object — not an envelope; the `config_name` comes from the iteration binding `unit.config_name`.

The shape is authoritative from `prepared` (the JSON Schema fetched by the `prepare` cmd for this config name). Use `prepared` as the primary guide for what properties to produce and which are required.

For the JSONata at the generator path: read the matching blueprint's `### to_drupal` block (the blueprint for `unit.entity_type` + the `field-types` prelude for field units, or the config-type blueprint for config-slice units) — this is the pattern to follow when authoring the transform. Run the authored JSONata over `unit` (binding `unit.entity_type`, `unit.bundle`, `unit.field_name`, `unit.def` as needed) to produce the config payload.
