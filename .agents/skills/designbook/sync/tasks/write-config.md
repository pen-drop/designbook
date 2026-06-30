---
title: Write Config
trigger:
  steps: [sync-to:write-config]
params:
  type: object
  required: [units, config_sync_dir]
  properties:
    units:
      type: array
      description: Config-name units from the resolve-filter stage. Drives the iteration — one output file per unit.
      items:
        $ref: ../schemas.yml#/ConfigNameUnit
    config_sync_dir:
      type: string
      description: Absolute path to the Drupal config-sync directory.
      resolve: config_sync_dir
result:
  type: object
  required: [config-file]
  properties:
    config-file:
      path: "{{ config_sync_dir }}/{{ unit.config_name }}.yml"
      description: >
        The Drupal config YAML file written to the config-sync directory.
        Filename derives from the iteration binding unit.config_name.
        Content is the transform data for this unit.
      validators:
        - "cmd:npx js-yaml {{ file }}"
each:
  unit:
    expr: "units"
    schema:
      $ref: ../schemas.yml#/ConfigNameUnit
---

# Write Config

Write each per-unit config data as a YAML file into `{{ config_sync_dir }}`.
One file per unit; the filename derives from `unit.config_name`.
