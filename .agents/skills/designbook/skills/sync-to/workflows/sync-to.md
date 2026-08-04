---
title: Sync to Drupal
description: Export a filtered subset of the data model as Drupal config YAML into the config-sync directory.
params:
  unit:
    type: string
    enum: [data-model, scene]
    description: >
      What to sync. `data-model` (default) exports the entity mapping as config only —
      the original path, unchanged. `scene` syncs one Scene as a real page: its config
      plus the content (block instances + page entity) that make the page exist and be
      reachable at a URL.
    default: "data-model"
  scene:
    type: string
    description: >
      Scene id (SceneDef.name) to sync. Required when `unit: scene`; ignored for
      `unit: data-model`. Identifies the page whose config and content are synced.
    default: ""
  section:
    type: string
    description: >
      Section id locating the Scene's scenes file under
      $DESIGNBOOK_DATA/sections/<section>/. Required when `unit: scene`.
    default: ""
  filter:
    type: object
    description: >
      Slice filter for `unit: data-model`. An empty object exports all content entity
      types and config keys defined in the data model. Non-empty keys narrow the export
      to the specified entity types / bundles or config keys. Not used for `unit: scene`.
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
  transform-content:
    steps: [transform-content]
  sync-content:
    steps: [sync-content]
  outtake:
    steps: [outtake]
---

The `transform-content` and `sync-content` stages run only for `unit: scene`. They come
**after** `sync` so all config (bundles, fields, displays) is imported into the live
backend before any content that depends on it is created (dependency before user). For
`unit: data-model` the `resolve-filter` stage emits an empty `content_units` list, so
both content stages expand to no work and the config-only path is unaffected.
