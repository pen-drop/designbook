## 1. Ref Renderer

- [x] 1.1 Create `.storybook/refRenderer.js` with `resolveRef(data, fieldPath)` function — dot-notation traversal returning plain value
- [x] 1.2 Handle array indices in paths (e.g., `block_content.contact_person.0.field_name`)
- [x] 1.3 Return `undefined` for missing fields

## 2. Vite Plugin Enhancement

- [x] 2.1 Update `loadDesignComponentYml` in `vite-plugin.ts` to parse `designbook:` metadata from `.story.yml`
- [x] 2.2 Load `data.json` from `testdata` path and extract record by `entity_type`, `bundle`, `record` index
- [x] 2.3 Resolve `$ref:` prefixed prop values using imported `resolveRef` function
- [x] 2.4 Render `slots.content[]` component nodes as HTML — use `<div data-component="name">` wrappers with resolved props
- [x] 2.5 Replace current text placeholder output with composed HTML in the CSF `render()` function

## 3. Entity Skill Update

- [x] 3.1 Update `.agent/skills/designbook-entity/SKILL.md`: change from per-field slots to single `content` slot
- [x] 3.2 Update `.component.yml` template: single `content` slot
- [x] 3.3 Update `.story.yml` template: `designbook:` metadata + `type: component` nodes with `$ref:` props in `content` slot
- [x] 3.4 Update Twig template: simplify to `{{ content }}` wrapper
- [x] 3.5 Update examples and documentation in SKILL.md

## 4. Regenerate Entity Components

- [x] 4.1 Regenerate `entity-node-article.component.yml` with single content slot
- [x] 4.2 Regenerate `entity-node-article.story.yml` with `designbook:` metadata + component composition
- [x] 4.3 Regenerate `entity-node-article.twig` with minimal `{{ content }}` template

## 5. Verification

- [x] 5.1 Start Storybook and verify entity component renders with data from `data.json`
- [x] 5.2 Verify all `$ref:` props resolve to actual data values
- [x] 5.3 Verify static props (e.g. CTA banner) pass through without resolutionchanged
- [ ] 5.4 Verify screen component still composes shell + entity correctly
