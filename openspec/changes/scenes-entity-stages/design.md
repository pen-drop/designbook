## Context

Entity rendering in designbook has two distinct operations that are currently conflated under "create view modes":

1. **Field mapping** (`map-entity`): Entity has fields → JSONata maps them to components. May encounter reference fields → emit `type: entity` nodes → resolved recursively via `map-entity` again. Always the same operation regardless of extension.

2. **Direct composition** (`compose-entity`): Entity has no meaningful fields for display → component tree is authored directly. Two cases: view entities (`entity_type: view`) and regular bundles with `composition: unstructured, view_mode: full`.

The routing between them is deterministic from the data-model:

```
entity node
  ├── entity_type: view              → compose-entity (view-entity rule)
  ├── view_mode != full              → map-entity
  ├── full + structured              → map-entity
  └── full + unstructured            → compose-entity (extension rule)
```

## Goals / Non-Goals

**Goals:**
- Two named task files: `map-entity.md` and `compose-entity.md`
- `compose-entity.md` routes to extension-specific rules via `when: extensions: [...]`
- `compose-entity.md` also covers view entities (`entity_type: view`) via a `compose-view-entity.md` rule
- `map-entity.md` replaces `create-view-modes.md` with clarified scope
- SKILL.md documents the routing decision tree

**Non-Goals:**
- No runtime changes — this is skill/documentation only
- No change to how JSONata expressions are evaluated
- No change to how `resolveEntityRefs` works
- The `scenes-unstructured-content` change (inline `components:` on entity nodes) is a separate concern

## Decisions

### `map-entity` is always recursive, always the same
No extension-specific rules needed for `map-entity`. The operation is uniform: look up data-model fields, map each field to a component or emit an entity ref. When an entity ref is emitted, `map-entity` is called again for that entity + view_mode. Paragraphs are just deep recursion — no special rule needed.

### `compose-entity` rules split by backend specificity

Extension-specific compose rules (layout_builder, canvas) are Drupal concepts — they live in a new `designbook-scenes-drupal` skill, mirroring the `designbook-data-model-drupal` pattern:

```
designbook-scenes (generic)
  rules/
    compose-view-entity.md    → when: stages: [compose-entity]
                                (no backend condition — view entities are backend-agnostic)

designbook-scenes-drupal (new, when: backend: drupal)
  rules/
    compose-layout-builder.md → when: stages: [compose-entity], extensions: [layout_builder]
    compose-canvas.md         → when: stages: [compose-entity], extensions: [canvas]
```

`designbook-scenes-drupal` is loaded automatically when `DESIGNBOOK_BACKEND=drupal` — same mechanism as `designbook-data-model-drupal`. The `compose-entity.md` task in `designbook-scenes` stays generic; Drupal-specific rules enrich it automatically.

### `create-view-modes.md` is renamed, not deleted
The file is renamed to `map-entity.md` with updated frontmatter (`stage: map-entity`). Content stays the same — it already describes structured field mapping correctly.

### Routing logic lives in SKILL.md, not in task files
The decision tree (when to use map-entity vs compose-entity) is documented in SKILL.md as a reference, not in individual task files. Task files describe *how*, SKILL.md describes *when*.

## Risks / Trade-offs

- **[Risk] View entity rule fires too broadly** → The `compose-view-entity.md` rule should check for `entity_type: view` explicitly in its content. The `when:` frontmatter can't filter by entity_type — that's the agent's responsibility when reading the rule.
