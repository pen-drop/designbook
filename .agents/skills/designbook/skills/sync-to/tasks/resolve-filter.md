---
title: Resolve Filter
trigger:
  steps: [sync-to:resolve-filter]
params:
  type: object
  required: [data_model, backend_cmd]
  properties:
    data_model:
      $ref: designbook/skills/data-model/schemas.yml#/DataModel
      type: object
      description: The loaded data model from the intake stage.
    scene:
      type: string
      default: ""
      description: >
        Scene id (SceneDef.name) to expand. When set, selects the Scene-expansion (scene)
        branch below; empty for a config/data-model export run.
    section:
      type: string
      default: ""
      description: >
        Section id locating the Scene's scenes file. Set when `scene` is set.
    section_scenes:
      path: $DESIGNBOOK_DATA/sections/[section]/[section].section.scenes.yml
      workflow: design-screen
      type: object
      $ref: ../../../scenes/schemas.yml#/SceneFile
      description: >
        The Scene's section scenes file, read on the scene branch (absent for a
        config/data-model run). The named Scene's component tree and entity nodes are the
        source of the Scene's config units (block/layout/page_layout config — never content).
    filter:
      type: object
      description: >
        Filter from workflow params. Empty object = export all entity types,
        bundles, and config keys found in the data model.
      default: {}
    backend_cmd:
      type: object
      description: >
        Backend command strings from designbook.config.yml. Provides
        exists_cmd (append config name → exit 0 iff the config already
        exists in the live backend, non-zero otherwise) — the same config
        existence check for both the config/data-model and the scene branch.
      required: [exists_cmd]
      properties:
        exists_cmd:
          type: string
          description: >
            Command prefix for checking whether a config object already
            exists in the live backend. The engine appends the config name
            before running; exit 0 means the config exists, non-zero means
            it is absent.
          examples: ["ddev drush config:get"]
result:
  type: object
  required: [units]
  properties:
    units:
      type: array
      description: >
        Ordered list of config-name units that do NOT yet exist in the live
        backend. Each unit identifies one Drupal configuration object to
        generate and write. The transform stage iterates over this array via
        each.
      items:
        $ref: ../schemas.yml#/ConfigNameUnit
---

# Resolve Filter

On a config/data-model run (no `scene`), expand the workflow filter into an ordered list of config-name units, then drop units whose config already exists in the live backend. On the scene branch (`scene` is set), expand the named Scene into **additional config-name units** — never content — over the same `units` list (see the scene section below). Both branches emit only `ConfigNameUnit`s.

## Result: units

Each unit is one Drupal configuration object (one `.yml` file in the config/sync directory).

**For a content bundle slice** (`data_model.content.<entity_type>.<bundle>`) that matches the filter, emit these units in order:

1. One bundle-type unit: `config_name = <et>.type.<bundle>` (e.g. `node.type.article`, `media.type.image`, `block_content.type.basic`). Carries `entity_type`, `bundle`, `def`.
   - The standard pattern is `<et>.type.<bundle>` — applies to `node`, `media`, `block_content`, and all other content entity types.
   - The exception for `taxonomy_term`: use `taxonomy.vocabulary.<bundle>` instead of `taxonomy_term.type.<bundle>`.
   - The exception for `paragraph`: use `paragraphs.paragraphs_type.<bundle>` instead of `paragraph.type.<bundle>`.
2. For each field in `def.fields`, one storage unit: `config_name = field.storage.<et>.<field_name>`. Carries `entity_type`, `field_name`, `def` (the field def from `def.fields.<field_name>`). Deduplicate storage units by `config_name` across all bundles — emit only once per unique `field.storage.*` name.
3. For each field in `def.fields`, one instance unit: `config_name = field.field.<et>.<bundle>.<field_name>`. Carries `entity_type`, `bundle`, `field_name`, `def` (the field def).
4. For each view mode in `def.view_modes` (if present), two units:
   - One view-mode definition unit: `config_name = core.entity_view_mode.<et>.<view_mode>`. Carries `entity_type` and `bundle` (bundle carried through for provenance only — the view-mode definition itself is bundle-agnostic). Deduplicate definition units by `config_name` across all bundles — emit only once per unique `entity_type` + `view_mode` pair, since the same view mode (e.g. `teaser`) can be shared by multiple bundles.
   - One display unit: `config_name = core.entity_view_display.<et>.<bundle>.<view_mode>`. Carries `entity_type`, `bundle`, `def` (the view-mode def from `def.view_modes.<view_mode>`).

   The definition unit must exist in Drupal before the display unit can be imported. Core view modes (e.g. `teaser`, `full`) already exist in a stock Drupal install; the existence filter below drops their definition units automatically, leaving only custom view modes (e.g. `card`) to be authored.

5. For each form mode in `def.form_modes` (if present) — the editing-half counterpart of the view-mode expansion above:
   - For every **non-default** form mode, one form-mode definition unit: `config_name = core.entity_form_mode.<et>.<form_mode>`. Carries `entity_type` and `bundle` (bundle carried through for provenance only — the form-mode definition itself is bundle-agnostic). Deduplicate definition units by `config_name` across all bundles, emitting once per unique `entity_type` + `form_mode` pair. The `default` form mode is built in and gets no definition unit.
   - One form-display unit: `config_name = core.entity_form_display.<et>.<bundle>.<form_mode>`. Carries `entity_type`, `bundle`, `def` (the form-mode def from `def.form_modes.<form_mode>`).

   As with view modes, the definition unit must exist before the display unit can be imported. Form modes shipped by a stock Drupal install (e.g. `user.register`) already exist; the existence filter below drops their definition units automatically, leaving only genuinely new modes to be authored.

**For a config slice** (`data_model.config.<config_key>`) that matches the filter:

- **General rule:** emit one unit with `config_name = <config_key>` (using the key exactly as it appears in the data model, e.g. `views.listing` → `config_name = views.listing`). Carries `config_key` and `def` (the config def).

- **Exception — `image_style`:** the `image_style` config block is bundle-nested (each child key is one image style, e.g. `ratio_16_9`). Do NOT emit a single `image_style` unit. Instead emit one unit PER child key: `config_name = image.style.<child>` (e.g. `image.style.ratio_16_9`). Each unit carries `config_key = image_style` and `def` set to the child def (e.g. `{ aspect_ratio: '16:9' }`). This mirrors how content bundles expand into multiple Drupal-named units and matches the `image.style.<name>` filename shape expected by Drupal. All OTHER config keys (already Drupal-native, e.g. `views.view.landing_teasers`) stay as single verbatim units.

When the filter is empty, include every entity type + bundle and every config key found in the data model.

## Scene branch — Scene expands to config units

Only when `scene` is set. The named Scene (its `SceneDef` in the section scenes file) is the page. A Scene is a **composite config subject**: it expands into `ConfigNameUnit`s appended to the same `units` list above — **never content, never content units**.

**Build form (declarative, not guessed).** The page the Scene renders binds to a page bundle in the data model. Read the `template` of that bundle's **full** view mode: `layout-builder` ⇒ Layout Builder; `canvas` ⇒ Display Builder. This value becomes each Scene-derived unit's `build_form`, so the concrete config naming and shape (delegated below) is selected without guessing.

**Units the Scene emits.** Both build forms resolve to config only:

- **Layout Builder** — the page bundle config (bundle type + fields via the same content-bundle expansion rules above), each block bundle the Scene uses (bundle type + fields + full view-mode display), the page's **layout-override field** config (`field.storage.<et>.layout_builder__layout` + `field.field.<et>.<bundle>.layout_builder__layout` — a real Layout-Builder config export includes them and `config:import` does not synthesise them), and the page's **layout config** unit `core.entity_view_display.<et>.<bundle>.<full>` whose `layout_builder.sections` anchor the blocks. The visible content lives inline in that config (SDC props / component tree), not in a content entity.
- **Display Builder** — the page's **`page_layout` config** unit carrying the inline component tree; its own route/URL. No content entity.

The concrete config names, the per-build-form shape, and how the Scene's component tree is embedded in the config are delegated to the Drupal build-form blueprints (`layout-builder` / `canvas`) — WHAT here, HOW there.

**Ordering.** Append the Scene units to `units` following the same dependency-before-user order the `transform` stage relies on: bundle / block-type / layout config before the page's display/`page_layout` config that references them. Do not restate the ordering — it is the existing config ordering, unchanged.

## Existence Filter

After assembling the full candidate list above, apply the existence filter as the final step, before submitting `units`:

For every candidate unit, run `{{ backend_cmd.exists_cmd }} <config_name>` (substituting the candidate's own `config_name`). Exit code 0 means the config object already exists in the live backend — drop that unit. A non-zero exit means it is absent — keep the unit.

This existence check is the dependency-management mechanism for the whole sync: pre-existing config — core view modes (`teaser`, `full`), bundles or fields already present from a prior sync run, or config shipped by the environment itself — is skipped automatically because it already exists, without any data-model markers or pre-seeding logic. Only config that is genuinely missing is generated by `transform` and imported by `sync`. This also makes the workflow idempotent: re-running `sync-to` against a target that already has some or all of the config produces an empty or partial `units` list instead of re-authoring or failing on config that is already there.

The same `config:get` existence filter covers the scene branch: a Scene's block/layout/`page_layout` config units are dropped when they already exist, so a second Scene sync comes back with an empty or partial `units` list — no duplicates, no abort. There is no separate content existence check, because a Scene sync creates no content.

Submit only the surviving (non-existent) units, in the same relative order they were assembled above.
