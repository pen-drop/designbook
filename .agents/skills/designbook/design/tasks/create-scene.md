---
when:
  steps: [create-scene]
domain: [components, scenes]
params:
  type: object
  required: [output_path, scene_id, section_id, section_title]
  properties:
    output_path: { type: string }
    scene_id: { type: string }
    section_id: { type: string }
    section_title: { type: string }
    reference: { type: array, default: [] }
    reference_dir: { type: string, default: "" }
result:
  type: object
  required: [scene-file]
  properties:
    scene-file:
      path: "{{ output_path }}"
      validators: [scene]
reads:
  - path: $DESIGNBOOK_DIRS_COMPONENTS
    description: Components -- location resolved by the active framework skill
  - path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
    optional: true
  - path: $DESIGNBOOK_DATA/data-model.yml
    optional: true
---

# Create Scene

Creates a scene file at `{{ output_path }}`. The exact structure depends on the active workflow step (shell or screen); see the applicable constraints rule.

## Input

- `$DESIGNBOOK_DIRS_COMPONENTS` — available components and their slot/prop signatures; location resolved by the active framework skill
- `design-system.scenes.yml` — the shell scene (required for screen scenes that inherit via `scene:`)
- `$reference_dir` — optional path to a hash-based cache directory; if non-empty, read `$reference_dir/extract.json` which provides source URL for scene `reference:` entries
- `data-model.yml` — available entity types, bundles, and image styles (required for screen scenes)

## Output

```yaml
id: "{{ scene_id }}"
title: "{{ scene identifier }}"
description: "[description]"
status: planned
order: [number]

group: "{{ group path }}"
scenes:
  - name: "[Scene Name]"
    reference:       # include ONLY when {{ reference }} is non-empty
      - type: "<url|image|...>"
        url: "<resource URL>"
        breakpoint: "<breakpoint name>"   # omit for shell scenes
        threshold: 3
        title: "<label>"
    # ↑ Write the reference entries from {{ reference }} param.
    #   If {{ reference }} is null or empty, OMIT the reference: key entirely.
    items:
      - component: "$DESIGNBOOK_COMPONENT_NAMESPACE:COMPONENT_NAME"
        slots:
          ...
```

## Reference Resolution

If `$reference_dir` is non-empty, read `$reference_dir/extract.json` and use its `source` field to extract the reference URL. Use this URL to populate the scene's `reference:` array (type: url, threshold: 3). If the `{{ reference }}` param is empty but `$reference_dir` is non-empty, construct the reference entry from the `source` field of `$reference_dir/extract.json`.

## Scene Node Types

Each entry in `items:` uses one of four keys:

- **`component:`** — render a UI component directly (`$DESIGNBOOK_COMPONENT_NAMESPACE:card`)
- **`entity:`** — render an entity from sample data (`node.article`, `view.recent_articles`)
- **`scene:`** — embed the shell and fill `$content`. The value MUST start with `design-system:` followed by an existing scene name under the design-system folder.
- **`image:`** — render an image using a named image style from `config.image_style` in data-model.yml. The value is the style name (e.g. `hero`, `"16_9"`). Add `alt` for alt text, optional `src` for custom images.

## Ensure Meta

After writing the scene file, ensure `meta.yml` is created for each story via the `DeboStory` entity. This is handled automatically when design-verify runs as a subworkflow — the intake queries `_debo story --scene ${scene_id}:${scene_name}` which triggers `ensureMeta()` if needed.

## Constraints

- **Discover, don't assume** — read actual components to determine slots and props
- **Provider prefix** — every `component:` value uses `$DESIGNBOOK_COMPONENT_NAMESPACE:name`
- **No `type: element`** — plain strings for text content
