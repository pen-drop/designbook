---
title: Sync to backend
description: >-
  Generate the backend's files for a filtered subset of the data model (or one Scene) into the
  sync target directory and apply them to the live backend.
params:
  scene:
    type: string
    description: >
      Scene id (SceneDef.name) to sync. When set, sync-to takes the **scene branch** — it syncs
      that Scene as a real page: the page's layout/display output in the active build form,
      **plus a presenter-template** for any surface whose presentation the display output
      cannot express. No content, no content units. Leave empty to take the data-model export
      path instead. The scene branch is selected by this scene-kind story input, not by a flag.
    default: ''
  section:
    type: string
    description: >
      Section id locating the Scene's scenes file under
      $DESIGNBOOK_DATA/sections/<section>/. Required when `scene` is set.
    default: ''
  filter:
    type: object
    description: >
      Slice filter for the data-model export path (when no `scene` is set). An empty object
      exports all content entity types and config keys defined in the data model. Non-empty
      keys narrow the export to the specified entity types / bundles or config keys. Not used
      on the scene branch.
    default: {}
  sync_target_dir:
    type: string
    description: >-
      Absolute path to the backend's sync output root where generated files are written.
stages:
  transform:
    steps:
      - transform
  sync:
    steps:
      - sync
  outtake:
    steps:
      - outtake
---

Template for the planning agent. Use the ordered steps as building blocks. Enumerate repeated targets during intake and write each concrete task explicitly; these stages do not execute or expand at runtime.
