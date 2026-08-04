---
title: Sync to Drupal
description: Export a filtered subset of the data model as Drupal config YAML into the config-sync directory.
params:
  scene:
    type: string
    description: >
      Scene id (SceneDef.name) to sync. When set, sync-to takes the **scene branch** —
      it syncs that Scene as a real page: its config plus the content (block instances +
      page entity) that make the page exist and be reachable at a URL. Leave empty to take
      the config/data-model export path instead. The scene branch is selected by this
      scene-kind story input, not by a flag.
    default: ""
  section:
    type: string
    description: >
      Section id locating the Scene's scenes file under
      $DESIGNBOOK_DATA/sections/<section>/. Required when `scene` is set.
    default: ""
  filter:
    type: object
    description: >
      Slice filter for the config/data-model export path (when no `scene` is set). An empty
      object exports all content entity types and config keys defined in the data model.
      Non-empty keys narrow the export to the specified entity types / bundles or config
      keys. Not used on the scene branch.
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

sync-to dispatches on `kind`: a **scene**-kind run (a `scene` is provided) creates the
target page — config **plus** content; a **config**-kind run (no `scene`) is the existing
config-only `data-model` export, sliced by `filter` (an empty `filter` is the unchanged bulk
export of the whole model). The kind is chosen by the story input, not a flag.

The `transform-content` and `sync-content` stages run only on the scene branch. They come
**after** `sync` so all config (bundles, fields, displays) is imported into the live
backend before any content that depends on it is created (dependency before user). On a
config/data-model run the `resolve-filter` stage emits an empty `content_units` list, so
both content stages expand to no work and the config-only path is unaffected.
