---
title: "Intake"
trigger:
  steps: [design-screen:intake]
domain: [components, components.layout]
params:
  type: object
  required: [data_model, design_scenes, vision, section_scenes]
  properties:
    reference_dir: { type: string, default: "" }
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
      $ref: ../../data-model/schemas.yml#/DataModel
    design_scenes:
      path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
      type: object
      $ref: ../../scenes/schemas.yml#/SceneFile
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      type: object
      $ref: ../../vision/schemas.yml#/Vision
    section_scenes:
      path: $DESIGNBOOK_DATA/sections/[section-id]/[section-id].section.scenes.yml
      workflow: debo-shape-section
      type: object
      $ref: ../../scenes/schemas.yml#/SceneFile
result:
  type: object
  required: [components, output_path, entity_mappings, sample_data_bundles, section_id, section_title, scenes, scene_path]
  properties:
    components:
      type: array
      items:
        $ref: ../schemas.yml#/Component
    output_path:
      type: string
    entity_mappings:
      type: array
      items:
        $ref: ../schemas.yml#/EntityMapping
    sample_data_bundles:
      type: array
      items:
        $ref: ../../sample-data/schemas.yml#/BundleRef
    section_id:
      type: string
    section_title:
      type: string
    scenes:
      type: array
      items:
        $ref: ../../scenes/schemas.yml#/SceneDef
    scene_path:
      type: string
      description: >
        Path of the target SceneFile relative to $DESIGNBOOK_DATA — the section's
        scenes file that create-scene fills.
---

# Intake: Design Screen

Gather section, screen type, entity mappings, and component plan for one screen. The `extract-reference` stage runs after intake — design reference data is not available during intake.

## Replay Mode (`--from-plan`)

When running under `--from-plan <file>`, skip the interactive steps below entirely. Instead:

1. Read `<file>`. Locate the `## Decisions` and `## Notes` sections.
2. Derive the following from those sections, resolved against the CURRENT on-disk `data-model.yml` and section scenes (read fresh — do not use stale plan values when the on-disk file has the authoritative shape):
   - `section_id` — from the `Section:` line in `## Decisions`
   - Screen type — from the `Screen type:` line in `## Decisions`
   - Embedded entity lists — from the `Embedded entity lists:` line in `## Decisions` (if present)
   - Entity mappings — from the `Entities:` line in `## Decisions`, cross-referenced against the current data-model
   - Component plan — from the `Components (new):` line in `## Decisions`
   - Freeform intent — from `## Notes` (use to resolve any ambiguity without asking the user)
3. Compose the full result from the derived values and call `workflow done` without user interaction.

**Degrade rule:** If a required decision is absent from `## Decisions` (e.g. the `Screen type:` line is missing), call `workflow wait` for that single decision and ask the user. Once answered, resume and continue autonomously. Never guess a missing decision.

## Steps

1. **Confirm section** — use provided section or ask the user
2. **Determine screen type** — landing, overview, or detail page; for landing pages ask about embedded entity lists
3. **Plan entities** — collect `entity:` nodes from section spec scenes, deduplicate by entity+view_mode, traverse `type: reference` fields recursively, order leaf-first; present table and confirm
4. **Plan components** — scan existing components, identify new ones needed per entity and screen-level; if `$reference_dir/extract.json` exists, derive from landmark structure; present grouped table and confirm
5. **Summary** — present complete build plan, wait for confirmation
6. **Structure preview** — ASCII tree per [structure-preview.md](partials/structure-preview.md), starting from `scene: design-system:shell` with `content` injection. Because `extract-reference` runs *after* this stage, the plan is formed without reference data — state `reference: none` in the preview so the user knows the structure was inferred from the section spec and data model, not an observed design.

## Result: components

One entry per **new** component. When `$reference_dir/extract.json` exists, include `design_hint` on each item.

## Result: output_path

`$DESIGNBOOK_DATA/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml`

## Result: sample_data_bundles

The distinct `entity_type` + `bundle` pairs that need sample data for this screen: every entity the screen renders (from the entity mappings) plus every bundle reached by traversing their `type: reference` fields, ordered leaf-first. `create-sample-data` expands one task (and one `data/` file) per entry.

## Result: scenes

Emit the screen `SceneDef[]` that `create-scene` fills into the section's
SceneFile — normally a single scene for the screen. Each scene is composed from
the planned components and the section's entity nodes (per the entity mappings),
injected into the shell at its `content` point. The section spec's empty
`scenes: []` is populated from this result; `create-scene` derives each scene's
component tree from the binding rather than from any pre-existing scene.

## Plan Mode (`--plan`)

When running under `--plan`, after the user confirms the build plan in step 5, append the confirmed decisions to the plan file's `## Decisions` and `## Notes` sections (per `resources/workflow-execution.md` § 9). The execution loop (§ 9 step 2) writes the `# Plan:` header and `## Params` section — this task only appends to `## Decisions` and `## Notes`. Write one line per decision:

- `Section: <section-id>`
- `Screen type: <type>`
- `Embedded entity lists: <entity> (<view_mode>), …` (if any)
- `Entities: <entity>, …`
- `Components (new): <name>, …`

If the user added freeform notes during intake, append them verbatim under `## Notes`. The normal (non-plan) flow is unchanged — this step is only active when `--plan` is set.
