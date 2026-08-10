---
title: Sync to Drupal
description: Export a filtered subset of the data model as Drupal config YAML into the config-sync directory.
params:
  scene:
    type: string
    description: >
      Scene id (SceneDef.name) to sync. When set, sync-to takes the **scene branch** —
      it syncs that Scene as a real page: the page's block/layout config (Layout Builder)
      or page-template/`page_layout` config (Display Builder), **plus a presenter-template**
      (a Twig theme file) for any surface whose binding needs Drupal theme markup — forms,
      pager, exposed filter — that UI-Patterns display config cannot express. No content,
      no content units — a Scene is a composite *config* subject (the presenter-template is
      theme markup, not content). Leave empty to take the config/data-model export path
      instead. The scene branch is selected by this scene-kind story input, not by a flag.
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
  outtake:
    steps: [outtake]
---

sync-to dispatches on `kind`: a **scene**-kind run (a `scene` is provided) synchronises the
target page as the block/layout config (Layout Builder) or page-template/`page_layout` config
(Display Builder) that composes the page, **plus a presenter-template** where a surface binds
only through Drupal theme markup (see *Contract* below); a **config**-kind run (no `scene`) is
the config `data-model` export, sliced by `filter` (an empty `filter` is the unchanged bulk
export of the whole model). The kind is chosen by the story input, not a flag.

Both kinds run over the **same config path** (`resolve-filter` → `transform` → `sync`): the
scene branch only makes `resolve-filter` emit additional `ConfigNameUnit`s (block/layout/
`page_layout` config) and, where a surface is theme-methods-only, a presenter-template. There
are no content units and no content stages — a Scene resolves to config (plus theme markup),
never to content. Ordering and idempotency follow the existing pattern: dependency before
user, and the `config:get` existence filter.

## Fidelity — the Scene is the source

The entity model and the Scene are carried to Drupal **unchanged**: the Scene is the source,
the emitted config is its translation. This is a requirement, not an aspiration — two runs
over one Scene must yield the same config.

- **The Drupal schema decides the *form*; the Scene decides the *content*.** The live
  typed-config schema (fetched per unit as `prepared` in `transform`) governs which properties
  are allowed and required — the *shape*. The Scene supplies the *values* that fill that shape.
  Where the two meet, shape yields to the Scene's meaning, never the reverse.
- **Where the Scene does not determine an outcome, the Scene is extended — the sync never
  guesses.** An ambiguous source cannot produce one config; the answer is to make the source
  unambiguous (data model / Scene format), not to decide per-run inside the sync.

## Contract — config, plus a presenter-template where the binding needs theme markup

A scene-kind run emits **config always, plus a presenter-template (a Twig theme file) for any
surface whose binding is theme-methods-only** — forms, pager, exposed filter — that cannot be
expressed as UI-Patterns display config. A UI-Patterns-bindable surface stays config
(`template: field-map`); a theme-methods-only surface additionally emits a presenter-template
(`template: presenter`). The presenter-template is theme markup, not content — the scene branch
still creates no content entity. The **kind-dispatch and the `resolve-filter → transform →
sync` stage chain are unchanged**; only the units `resolve-filter` may emit are widened. The
*how* of the Twig emission is a `designbook-drupal` blueprint — no backend code in the core.
