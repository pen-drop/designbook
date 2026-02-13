## 1. Extend designbook-drupal-components with outputDir Parameter

- [x] 1.1 Add optional `outputDir` parameter to `designbook-drupal-components` SKILL.md input schema
- [x] 1.2 Update Step 4 (Create Component Directory) to use `outputDir` when provided instead of `$DESIGNBOOK_DRUPAL_THEME/components/`
- [x] 1.3 Update Step 8 (Verify Output) to check the correct path based on `outputDir`
- [x] 1.4 Verify existing UI component generation still works unchanged (no `outputDir` = default behavior)

## 2. Create designbook-shell Skill

- [x] 2.1 Create `.agent/skills/designbook-shell/SKILL.md` with skill metadata and prerequisites
- [x] 2.2 Define input parameters: `force` flag (optional, defaults to false)
- [x] 2.3 Add step: Read `sections/*.section.yml` to derive navigation items (label from `title`, url from `id`)
- [x] 2.4 Define `shell_header` component: slots for `navigation`, `logo`, `user_menu`
- [x] 2.5 Define `shell_footer` component: slots for `footer_nav`, `copyright`
- [x] 2.6 Generate `shell_header.story.yml` with auto-derived navigation menu from section.yml files
- [x] 2.7 Generate `shell_footer.story.yml` with placeholder content
- [x] 2.8 Add skip-if-exists logic: check `$DESIGNBOOK_DIST/design/shell/header/` before generating
- [x] 2.9 Delegate file creation to `designbook-drupal-components` with `outputDir`

## 3. Create designbook-entity Skill

- [x] 3.1 Create `.agent/skills/designbook-entity/SKILL.md` with skill metadata and prerequisites
- [x] 3.2 Define input parameters: `section-id` (optional, defaults to all sections)
- [x] 3.3 Add step: Read `$DESIGNBOOK_DIST/data-model.json` and iterate entity types/bundles
- [x] 3.4 Map data model fields to component slots (field name → slot name, field type → slot type hint)
- [x] 3.5 Define naming convention: `entity_[entitytype]_[bundle]` for component name
- [x] 3.6 Read `$DESIGNBOOK_DIST/sections/[section-id]/data.json` to populate story slot values
- [x] 3.7 Read `screen-designs.md` to determine which UI component renders each field
- [x] 3.8 Generate structured view mode stories: one slot per field, populated from data.json + UI component refs
- [x] 3.9 Generate unstructured view mode stories: single `content` slot with layout + block entity references
- [x] 3.10 Generate block entity components: single view mode, one slot wrapping a UI component
- [x] 3.11 Delegate file creation to `designbook-drupal-components` with `outputDir`

## 4. Create designbook-screen Skill

- [x] 4.1 Create `.agent/skills/designbook-screen/SKILL.md` with skill metadata and prerequisites
- [x] 4.2 Define input parameters: `section-id` (optional, defaults to all sections)
- [x] 4.3 Add prerequisite check: verify shell components exist, warn if not → "Run `designbook-shell` first"
- [x] 4.4 Add prerequisite check: verify entity components exist for referenced entities → "Run `designbook-entity` first"
- [x] 4.5 Parse `screen-designs.md` to extract pages per section (section-id → page-name → entity + view mode)
- [x] 4.6 Define screen component with 3 slots: `header`, `content`, `footer`
- [x] 4.7 Generate `section_[sectionid]_[pagename]` component for each page
- [x] 4.8 Generate screen story.yml: populate header → `shell_header`, footer → `shell_footer`, content → entity component ref
- [x] 4.9 Generate structural Twig: `{{ header }}{{ content }}{{ footer }}`
- [x] 4.10 Delegate file creation to `designbook-drupal-components` with `outputDir`

## 5. Extend Storybook Addon — Story Glob

- [x] 5.1 Add design glob to `preset.ts` `stories()` function: `$DESIGNBOOK_DIST/design/**/*.component.yml`
- [x] 5.2 Verify glob does not match UI components under `$DESIGNBOOK_DRUPAL_THEME/components/`
- [x] 5.3 Test that Storybook starts cleanly when `design/` directory doesn't exist

## 6. Extend Storybook Addon — Design Indexer

- [x] 6.1 Create design component indexer in `preset.ts` with test regex: `/design\/.*\.component\.yml$/`
- [x] 6.2 Implement directory-to-title mapping: `design/shell/header/` → `Design/Shell/Header`
- [x] 6.3 Implement sections prefix override: `design/sections/news/article-list/` → `Sections/News/Article List`
- [x] 6.4 Read companion `.story.yml` to create story index entries per variant (full, teaser, etc.)
- [x] 6.5 Handle missing `.story.yml` gracefully: create single default story entry

## 7. Extend Storybook Addon — Vite Plugin

- [x] 7.1 Extend `load()` in `vite-plugin.ts` to handle `.component.yml` from `design/` directories
- [x] 7.2 Read companion `.story.yml` and transform to CSF module with story exports
- [x] 7.3 Create a CSF template for design components (similar to `section.story.tpl`)
- [x] 7.4 Verify rendered output in Storybook Canvas for shell, entity, and screen components

## 8. Update Workflow

- [x] 8.1 Update `debo-design-screen.md` workflow to invoke 3 skills in order: `designbook-shell` → `designbook-entity` → `designbook-screen`
- [x] 8.2 Document the full data flow: data-model.json + data.json + screen-designs.md → design components
- [x] 8.3 Add individual invocation guidance: "To regenerate only entity components, run `designbook-entity` directly"

## 9. Verification

- [ ] 9.1 Create a test integration scenario: run all 3 skills with test-integration-drupal data model
- [ ] 9.2 Verify shell components at `$DESIGNBOOK_DIST/design/shell/header/` and `footer/`
- [ ] 9.3 Verify entity components for each entity type/bundle in data-model.json
- [ ] 9.4 Verify screen components for each section page
- [ ] 9.5 Verify Storybook sidebar shows Design/Shell, Design/Entity, and Sections/*/PageName hierarchy
- [ ] 9.6 Verify independent skill invocation: change data model → re-run only `designbook-entity`
- [ ] 9.7 Verify incremental run: `designbook-shell` skips existing shells without force flag
