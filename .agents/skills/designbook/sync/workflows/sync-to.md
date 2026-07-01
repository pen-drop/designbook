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
  config_sync_dir:
    type: string
    description: Absolute path to the Drupal config-sync directory where YAML files are written.
    resolve: config_sync_dir
  gate:
    type: string
    enum: [hard, soft]
    default: hard
    description: >
      Validation gate mode. `hard` (default) aborts the workflow on the first
      config-import failure. `soft` records per-unit valid/error and continues
      to archive — used by the eval scorer to read pass/fail across all units.
engine: direct
stages:
  intake:
    steps: [intake]
  resolve-filter:
    steps: [resolve-filter]
  transform:
    steps: [transform]
  sync:
    steps: [sync]
  outtake:
    steps: [outtake]
---
