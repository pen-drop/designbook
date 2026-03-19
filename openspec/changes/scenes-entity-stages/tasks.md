## 1. Task Files

- [x] 1.1 Rename `designbook-scenes/tasks/create-view-modes.md` → `map-entity.md`; update frontmatter stage to `map-entity`; update description to clarify scope (structured only, all view modes except full+unstructured)
- [x] 1.2 Create `designbook-scenes/tasks/compose-entity.md` — describes direct composition for full+unstructured and view entities; references extension rules; documents routing decision (view entity vs extension-based)

## 2. designbook-scenes: Generic Compose Rule

- [x] 2.1 Create `designbook-scenes/rules/compose-view-entity.md` — `when: stages: [compose-entity]`; describes view entity JSONata pattern: `{}` input, wrapper component, inline entity refs in slots

## 3. designbook-scenes-drupal: New Skill

- [x] 3.1 Create `designbook-scenes-drupal/SKILL.md` — `name: designbook-scenes-drupal`, `description: Drupal-specific compose rules for unstructured full view modes. Load when DESIGNBOOK_BACKEND is drupal.`
- [x] 3.2 Create `designbook-scenes-drupal/rules/compose-layout-builder.md` — `when: stages: [compose-entity], extensions: [layout_builder]`; sections with `block_content` entity refs in column slots; no direct component nodes inside sections
- [x] 3.3 Create `designbook-scenes-drupal/rules/compose-canvas.md` — `when: stages: [compose-entity], extensions: [canvas]`; flat component tree with direct component nodes

## 4. SKILL.md Updates

- [x] 4.1 Update `designbook-scenes/SKILL.md`: add routing decision tree (when map-entity vs compose-entity); list both task files; reference `designbook-scenes-drupal` for Drupal extension rules
