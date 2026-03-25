## 1. Prerequisites

- [x] 1.1 Confirm `skill-scan-subdirs` is merged and the skill scanner reads sub-directories of a skill root
- [x] 1.2 Verify `openspec/changes/skill-scan-subdirs/` (or equivalent) is in `archive/` or its spec is in `openspec/specs/`

## 2. Create New Skill Root Structure

- [x] 2.1 Create directory `.agents/skills/designbook-drupal/` with sub-directories `data-model/rules/`, `data-model/resources/`, `data-mapping/rules/`, `data-mapping/resources/`, `sample-data/rules/`, `components/rules/`, `components/tasks/`, `components/resources/`
- [x] 2.2 Write `.agents/skills/designbook-drupal/SKILL.md` — index-only, four sections (Data Model, Data Mapping, Sample Data, Components), frontmatter `name: designbook-drupal`, no `when:` condition, under 500 lines

## 3. Migrate data-model Files

- [x] 3.1 Copy `designbook-data-model-drupal/rules/drupal-data-model.md` → `designbook-drupal/data-model/rules/conventions.md`
- [x] 3.2 Copy `designbook-data-model-drupal/rules/canvas.md` → `designbook-drupal/data-model/rules/canvas.md`
- [x] 3.3 Copy `designbook-data-model-drupal/rules/layout-builder.md` → `designbook-drupal/data-model/rules/layout-builder.md`
- [x] 3.4 Copy `designbook-data-model-drupal/resources/drupal-views.md` → `designbook-drupal/data-model/resources/drupal-views.md`
- [x] 3.5 Verify `when: backend: drupal` is present in each copied rule file's front-matter

## 4. Migrate data-mapping Files

- [x] 4.1 Copy `designbook-scenes-drupal/rules/field-map.md` → `designbook-drupal/data-mapping/rules/field-map.md`
- [x] 4.2 Copy `designbook-scenes-drupal/rules/canvas.md` → `designbook-drupal/data-mapping/rules/canvas.md`
- [x] 4.3 Copy `designbook-scenes-drupal/rules/layout-builder.md` → `designbook-drupal/data-mapping/rules/layout-builder.md`
- [x] 4.4 Copy `designbook-scenes-drupal/resources/field-mapping.md` → `designbook-drupal/data-mapping/resources/field-mapping.md`
- [x] 4.5 Verify `when: backend: drupal` is present in each copied rule file's front-matter

## 5. Migrate sample-data Files

- [x] 5.1 Copy `designbook-sample-data-drupal/rules/sample-canvas.md` → `designbook-drupal/sample-data/rules/sample-canvas.md`
- [x] 5.2 Copy `designbook-sample-data-drupal/rules/sample-layout-builder.md` → `designbook-drupal/sample-data/rules/sample-layout-builder.md`
- [x] 5.3 Copy `designbook-sample-data-drupal/rules/sample-formatted-text.md` → `designbook-drupal/sample-data/rules/sample-formatted-text.md`
- [x] 5.4 Copy `designbook-sample-data-drupal/rules/sample-image.md` → `designbook-drupal/sample-data/rules/sample-image.md`
- [x] 5.5 Copy `designbook-sample-data-drupal/rules/sample-link.md` → `designbook-drupal/sample-data/rules/sample-link.md`
- [x] 5.6 Verify `when: backend: drupal` is present in each copied rule file's front-matter

## 6. Migrate components Files

- [x] 6.1 Copy `designbook-components-sdc/rules/sdc-conventions.md` → `designbook-drupal/components/rules/sdc-conventions.md`
- [x] 6.2 Copy `designbook-components-sdc/rules/component-discovery.md` → `designbook-drupal/components/rules/component-discovery.md`
- [x] 6.3 Copy `designbook-components-sdc/tasks/create-component.md` → `designbook-drupal/components/tasks/create-component.md`
- [x] 6.4 Copy all five resource files (`twig.md`, `story-yml.md`, `component-yml.md`, `component-patterns.md`, `layout-reference.md`) from `designbook-components-sdc/resources/` → `designbook-drupal/components/resources/`
- [x] 6.5 Verify `when: frameworks.component: sdc` is present in each copied rule and task file's front-matter

## 7. Update Cross-References

- [x] 7.1 Update any relative path references inside the migrated files that pointed to sibling files in the old skill root (e.g. `../resources/` → `../resources/` within same sub-directory should be unchanged; verify none point to the old root)
- [x] 7.2 Search entire codebase for references to `designbook-data-model-drupal`, `designbook-scenes-drupal`, `designbook-sample-data-drupal`, `designbook-components-sdc` and update each to `designbook-drupal` (with appropriate sub-path where needed)
- [x] 7.3 Update `openspec/specs/lazy-skill-loading/spec.md` to reflect the new `designbook-drupal/components/` path per the delta spec in this change
- [x] 7.4 Check `designbook.config.yml` for any `skills:` entries referencing old skill names and update them
- [x] 7.5 Check `promptfoo/` for test fixtures referencing old skill paths

## 8. Delete Original Skill Roots

- [x] 8.1 Delete `.agents/skills/designbook-data-model-drupal/`
- [x] 8.2 Delete `.agents/skills/designbook-scenes-drupal/`
- [x] 8.3 Delete `.agents/skills/designbook-sample-data-drupal/`
- [x] 8.4 Delete `.agents/skills/designbook-components-sdc/`

## 9. Verification

- [x] 9.1 Run the skill scanner and confirm all rule/task/resource files under `designbook-drupal/` are discovered
- [x] 9.2 Confirm `designbook-drupal/SKILL.md` loads cleanly and lists all sub-directory contents
- [x] 9.3 Confirm no broken references remain in the codebase (`grep -r designbook-components-sdc .agents/` returns nothing)
- [x] 9.4 Confirm no broken references remain for the other three deleted skill names
