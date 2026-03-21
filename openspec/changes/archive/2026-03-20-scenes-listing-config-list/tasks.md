## 1. Split scene-reference.md into focused resource files

- [x] 1.1 Create `resources/field-reference.md` with file-level and scene-level field tables (extracted from scene-reference.md)
- [x] 1.2 Create `resources/entry-types.md` documenting all entry types: component, entity, records (demo-only note), config, scene-ref
- [x] 1.3 Create `resources/config-list.md` with full config:list documentation: syntax, data-model mapping, sources, JSONata bindings ($rows/$count/$limit), and when to use vs entity
- [x] 1.4 Delete `resources/scene-reference.md`

## 2. Add listing pattern rule

- [x] 2.1 Create `rules/listing-pattern.md` with `when.stages: [create-scene]` — listing scenes SHALL use `config: list.*`, never `entity + records: []`

## 3. Update task files

- [x] 3.1 Update `tasks/create-scene.md`: replace listing example (`entity + records`) with `config: list.*` template; add full section scene YAML example (previously in scene-reference.md)
- [x] 3.2 Update `tasks/create-shell-scene.md`: add full shell scene YAML example (previously in scene-reference.md)

## 4. Update SKILL.md index

- [x] 4.1 Update `SKILL.md` resources section to list the three new resource files (field-reference.md, entry-types.md, config-list.md) instead of scene-reference.md
