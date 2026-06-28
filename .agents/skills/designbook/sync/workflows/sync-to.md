---
title: Sync to Drupal
description: Export a filtered subset of the data model as Drupal config YAML into the config-sync directory.
params:
  unit:
    type: string
    description: Data unit to export. Always "data-model" in the current implementation.
    default: "data-model"
  filter:
    type: object
    description: >
      Slice filter. An empty object exports all content entity types and config keys
      defined in the data model. Non-empty keys narrow the export to the specified
      entity types / bundles or config keys.
    default: {}
  with_deps:
    type: boolean
    description: >
      When true, follow inter-entity dependencies (e.g. field storage shared across
      bundles) and include them in the export even if not explicitly filtered.
    default: true
  config_sync_dir:
    type: string
    description: Absolute path to the Drupal config-sync directory where YAML files are written.
    resolve: config_sync_dir
engine: direct
stages:
  intake:
    steps: [intake]
  resolve-filter:
    steps: [resolve-filter]
  transform:
    steps: [transform]
  resolve-deps:
    steps: [resolve-deps]
  write-config:
    steps: [write-config]
  sync:
    steps: [sync]
  outtake:
    steps: [outtake]
---
