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
    unit:
      type: string
      enum: [data-model, scene]
      default: data-model
      description: Sync unit forwarded from intake. `scene` selects the Scene-expansion path below.
    scene:
      type: string
      default: ""
      description: >
        Scene id (SceneDef.name) to expand. Set for a `scene` unit.
    section:
      type: string
      default: ""
      description: >
        Section id locating the Scene's scenes file. Set for a `scene` unit.
    section_scenes:
      path: $DESIGNBOOK_DATA/sections/[section]/[section].section.scenes.yml
      workflow: design-screen
      type: object
      $ref: ../../../scenes/schemas.yml#/SceneFile
      description: >
        The Scene's section scenes file, read for `unit: scene` (absent for a
        data-model run). The named Scene's component tree and entity nodes are the
        source of the content units.
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
        exists in the live backend, non-zero otherwise) and, for Scene syncs,
        content_exists_cmd (the content counterpart keyed by content_ref).
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
        content_exists_cmd:
          type: string
          description: >
            Command template for checking whether a content entity already exists,
            keyed by its deterministic content_ref (uuid). Substitute the
            `{content_ref}` placeholder (like the render_url resolver substitutes
            `{config_id}`) — the command exits 0 when the entity exists (drop the
            unit), non-zero when absent (keep it). Used only on the Scene path;
            content has no config:get equivalent, so this is a substitution template,
            not an appended argument.
          examples: ["ddev drush eval \"if (!\\Drupal::service('entity.repository')->loadEntityByUuid('block_content','{content_ref}')) throw new \\Exception('absent');\""]
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
    content_units:
      type: array
      default: []
      description: >
        Ordered list of content units that do NOT yet exist in the live backend,
        emitted only for `unit: scene` (empty for `unit: data-model`). Ordered
        dependency-before-user: Layout-Builder block instances before the page.
        transform-content iterates this array via each; sync-content imports them.
      items:
        $ref: ../schemas.yml#/ContentUnit
---

# Resolve Filter

For `unit: data-model`, expand the workflow filter into an ordered list of config-name units, then drop units whose config already exists in the live backend; `content_units` is empty. For `unit: scene`, additionally expand the named Scene into content units (see below).

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

## Result: content_units

Only for `unit: scene` (otherwise submit `content_units: []`). The named Scene (its `SceneDef` in the section scenes file) is the page; the content units are what make that page exist in the backend.

**Build form (declarative, not guessed).** The page the Scene renders binds to a page bundle in the data model. Read the `template` of that bundle's **full** view mode: `layout-builder` ⇒ the page is assembled with Layout Builder; `canvas` ⇒ the page is a Display-Builder page entity. This value becomes each content unit's `build_form`.

**Config the page depends on.** Add to `units` — using the same content-bundle expansion rules as above — the config for the page bundle and, for the Layout-Builder form, each block_content bundle the Scene uses (bundle type + fields + the full view-mode display). For a Layout-Builder page bundle also emit the page's **layout-override field** config — the storage and instance that back per-entity layouts (`field.storage.<et>.layout_builder__layout` + `field.field.<et>.<bundle>.layout_builder__layout`): a real Layout-Builder config export includes them and `config:import` does not synthesise them on its own, so the page content cannot carry a layout until they exist. This config precedes the content that uses it: config units are imported (in the `sync` stage) before content units (in `sync-content`).

**Content units, ordered dependency-before-user.** Emit in this order:

1. **Layout Builder only** — one unit per block the Scene renders: `role: block`, `entity_type: block_content`, `bundle` the block bundle, `build_form: layout-builder`, `payload` the block's resolved component subtree from the Scene (and its sample data).
2. **The page** — one unit: `role: page`, `build_form` as determined above, `payload` the page's field values plus, for Layout Builder, the ordered references to the block units (by their `content_ref`) that populate `layout_builder__layout`; for Canvas, `entity_type: canvas_page` carrying the inline component tree. Canvas emits only this page unit (no block units).

Each unit's `content_ref` is a UUIDv5 minted from the Scene id and the unit's role (blocks disambiguated by their position/role in the Scene) — the same deterministic identity `transform-content` embeds in the payload, so re-syncs are stable.

## Existence Filter

After assembling the full candidate list above, apply the existence filter as the final step, before submitting `units`:

For every candidate unit, run `{{ backend_cmd.exists_cmd }} <config_name>` (substituting the candidate's own `config_name`). Exit code 0 means the config object already exists in the live backend — drop that unit. A non-zero exit means it is absent — keep the unit.

This existence check is the dependency-management mechanism for the whole sync: pre-existing config — core view modes (`teaser`, `full`), bundles or fields already present from a prior sync run, or config shipped by the environment itself — is skipped automatically because it already exists, without any data-model markers or pre-seeding logic. Only config that is genuinely missing is generated by `transform` and imported by `sync`. This also makes the workflow idempotent: re-running `sync-to` against a target that already has some or all of the config produces an empty or partial `units` list instead of re-authoring or failing on config that is already there.

Content has no `config:get`, so content units get the parallel check: for every candidate content unit, run `content_exists_cmd` with its deterministic `content_ref` substituted for the `{content_ref}` placeholder. Exit 0 means the entity already exists — drop the unit; non-zero means it is absent — keep it. This makes a second Scene sync idempotent the same way: an already-synced page and its blocks are skipped, so `content_units` comes back empty or partial with no duplicates and no abort.

Submit only the surviving (non-existent) units, in the same relative order they were assembled above.
