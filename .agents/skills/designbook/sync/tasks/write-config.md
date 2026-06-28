---
title: Write Config
trigger:
  steps: [sync-to:write-config]
params:
  type: object
  required: [config-set, config_sync_dir]
  properties:
    config-set:
      description: DrupalConfigEntity items to serialize, from the transform stage.
      $ref: ../schemas.yml#/DrupalConfigSet
    config_sync_dir:
      type: string
      description: Absolute path to the Drupal config-sync directory.
      resolve: config_sync_dir
result:
  type: object
  required: [config-file]
  properties:
    config-file:
      path: "{{ config_sync_dir }}/{{ config_entity.config_name }}.yml"
      $ref: ../schemas.yml#/DrupalConfigEntity
      validators:
        - "cmd:npx js-yaml {{ file }}"
each:
  config_entity:
    expr: "config-set"
    schema:
      $ref: ../schemas.yml#/DrupalConfigEntity
---

# Write Config

Write each `DrupalConfigEntity` from `config-set` as a YAML file into `{{ config_sync_dir }}`.
One file per entity; the filename derives from the entity's `config_name`.
