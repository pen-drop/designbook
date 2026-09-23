---
title: Resolve Filter
trigger:
  steps: [sync-to:resolve-filter]
domain: [data-model]
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
      resolve: backend_cmd
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
        backend. Each unit identifies one backend configuration object to
        generate and write. The transform stage iterates over this array via
        each.
      items:
        $ref: ../schemas.yml#/ConfigNameUnit
---
# Resolve Filter

Expand the selected model slices or scene into ordered config units using the
active backend's naming and dependency rules. Preserve the scene and model as
the source of each unit's content. A scene expands into configuration, with
presentation artifacts where required by its selected template.

## Result: units

Return one unit per selected configuration object, deduplicated by config name
and ordered with dependencies before consumers. Keep each unit's source definition
and provenance. Omit units already present according to `backend_cmd.exists_cmd`:
run the configured command with each candidate name; zero means present and
nonzero means absent. Both model and scene branches use this same filter.

Completion: every selected source is accounted for, only absent units remain,
and each unit has a concrete name and source definition under the active backend.
