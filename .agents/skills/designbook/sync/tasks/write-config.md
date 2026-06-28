---
title: Write Config
trigger:
  steps: [sync-to:write-config]
params:
  type: object
  required: [config-set, config_sync_dir]
  properties:
    config-set:
      type: array
      description: DrupalConfigEntity items to serialize, from the transform stage.
      $ref: ../schemas.yml#/DrupalConfigSet
    config_sync_dir:
      type: string
      description: Absolute path to the Drupal config-sync directory.
      resolve: config_sync_dir
result:
  type: object
  required: [written-files]
  properties:
    written-files:
      type: array
      description: One entry per written YAML file — the absolute path of the file on disk.
      items:
        type: string
        description: Absolute path to the written Drupal config YAML file.
        examples: ["/var/www/html/config/sync/node.type.article.yml"]
      validators:
        - "cmd:npx js-yaml {{ file }}"
---

# Write Config

Write each `DrupalConfigEntity` from `config-set` as a YAML file into `{{ config_sync_dir }}`.
One file per entity; the filename derives from the entity's `config_name`.
