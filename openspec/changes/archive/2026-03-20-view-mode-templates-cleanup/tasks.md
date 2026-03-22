## 1. designbook-data-model/SKILL.md

- [ ] 1.1 Remove `composition` line from the schema tree (line 28)
- [ ] 1.2 Remove the `### composition` section (lines 48–52)
- [ ] 1.3 Add `view_modes` to the schema tree under bundle: `├── view_modes  # optional: map of view_mode_name → { template, settings }`

## 2. designbook-data-model/rules/drupal-field-naming.md

- [ ] 2.1 Replace the `## Composition per Bundle` table (which references `unstructured`) with a `## View Mode Templates per Bundle` table guiding the AI to use `view_modes.full.template`:

| Bundle type | view_modes.full.template |
|-------------|--------------------------|
| Content types with fields | _(omit view_modes — all view modes use field-map by default)_ |
| Landing pages with Layout Builder | `layout-builder` |
| Landing pages with Canvas/Experience Builder | `canvas` |
| Block content, Media, Taxonomy | _(omit view_modes)_ |

## 3. designbook-data-model-drupal/rules/drupal-data-model.md

- [ ] 3.1 Replace the `## Composition per Bundle` table with `## View Mode Templates per Bundle` — same content as 2.1
- [ ] 3.2 Remove the `extensions` paragraph (`The project's extensions config determines...`)
- [ ] 3.3 Add a `view_modes` example under `## Entity Mapping` or as its own section showing:
```yaml
node:
  landing_page:
    view_modes:
      full:
        template: layout-builder
```

## 4. designbook-scenes/resources/jsonata-reference.md

- [ ] 4.1 Replace the `### Composition-aware patterns` section (lines 120–150) with `### Template-aware patterns` explaining that the view mode's `template` key (not `composition`) determines the JSONata pattern — `layout-builder` outputs sections with entity refs, `field-map` outputs field-driven components

## 5. designbook-scenes/resources/view-entity.md

- [ ] 5.1 Replace the `## data-model.yml Entry` example — remove `composition: unstructured`, replace with `view_modes.default.template: view-entity`

## 6. designbook-sample-data/tasks/ensure-sample-data.md

- [ ] 6.1 Replace the two composition-based branches in Step 2 (`composition: structured` and `composition: unstructured`) with template-based logic:
  - `view_mode: full` AND `view_modes.full.template` is `layout-builder` or `canvas` → `required_count = max(existing_count, 1)`
  - `view_mode: full` AND other templates (e.g. `field-map`) → `required_count = 1`

## 7. Archive orphan change

- [ ] 7.1 Move `openspec/changes/view-mode-templates` to `openspec/changes/archive/2026-03-20-view-mode-templates`
