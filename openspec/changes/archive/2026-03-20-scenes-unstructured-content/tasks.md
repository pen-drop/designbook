## 1. Runtime — entityBuilder inline path

- [ ] 1.1 Extend `EntitySceneNode` in `types.ts` with optional `components?: RawNode[]` field
- [ ] 1.2 Add early-return guard in `entityBuilder.build()`: if `Array.isArray(node['components'])`, return `node['components'] as RawNode[]` before the JSONata lookup
- [ ] 1.3 Add unit test: entity node with inline `components` returns them directly without loading any `.jsonata` file
- [ ] 1.4 Add unit test: nested entity ref inside inline `components` slot is resolved via `resolveEntityRefs`

## 2. Skill — designbook-scenes rules

- [ ] 2.1 Create `.agents/skills/designbook-scenes/rules/structured-content.md` — documents entity + view_mode → JSONata file pattern; when to use (composition: structured or absent)
- [ ] 2.2 Create `.agents/skills/designbook-scenes/rules/unstructured-content.md` — documents entity + components: [...] inline pattern; when to use (composition: unstructured); shows Layout Builder (nested entity slots) and Canvas (pure component tree) as sub-patterns
- [ ] 2.3 Update `SKILL.md` to reference the two new rules and add the composition decision logic
- [ ] 2.4 Update `tasks/create-scene.md` to check `composition` in data-model.yml and apply the correct rule
