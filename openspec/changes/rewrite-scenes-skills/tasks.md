## 1. New Resources

- [x] 1.1 Create `resources/scenes-schema.md` — JSON Schema defining `*.scenes.yml` format (file-level fields, scene-level fields, all duck-typed SceneNode types: component, entity, scene)
- [x] 1.2 Update `resources/jsonata-reference.md` — refresh JSONata output format, ComponentNode structure, syntax quick reference. Remove any `type: scene` / `ref:` examples
- [x] 1.3 Update `resources/scenes-constraints.md` — update all examples to use `scene:` format

## 2. Rewrite SKILL.md

- [x] 2.1 Rewrite `designbook-scenes/SKILL.md` — concept-first: Shell, Section, Entity-Mapping with one complete example each. End with note that all resolves to `ComponentNode[]`. Link to tasks and resources
- [x] 2.2 Rewrite `designbook-scenes-drupal/SKILL.md` — explain it adds Drupal field mapping rules to base entity-mapping concept. Link to field-map rule and field-mapping resource

## 3. Update Tasks (output-focused, preserve frontmatter)

- [x] 3.1 Rewrite `tasks/create-shell-scene.md` — define output format and constraints, remove step-by-step procedure. Keep frontmatter identical
- [x] 3.2 Rewrite `tasks/create-section-scene.md` — define output format and constraints, remove step-by-step procedure. Keep frontmatter identical
- [x] 3.3 Rewrite `tasks/plan-components.md` — output-focused component planning. Keep frontmatter identical
- [x] 3.4 Rewrite `tasks/plan-entities.md` — output-focused entity work list. Keep frontmatter identical
- [x] 3.5 Rewrite `tasks/map-entity.md` — output-focused JSONata generation. Keep frontmatter identical

## 4. Update Rules

- [x] 4.1 Update `rules/scenes-constraints.md` — no `type: scene` references found, already clean
- [x] 4.2 Update `rules/listing-pattern.md` — verified, no `type: scene` references

## 5. Cleanup

- [x] 5.1 Remove `resources/entry-types.md` — content captured by scenes-schema.md
- [x] 5.2 Remove `resources/field-reference.md` — content captured by scenes-schema.md
- [x] 5.3 Update `designbook-scenes-drupal/resources/field-mapping.md` — verified, no format changes needed
