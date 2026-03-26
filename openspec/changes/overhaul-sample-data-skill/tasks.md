## 1. Rewrite format.md

- [x] 1.1 Document `content:` and `config:` as top-level buckets with identical `entity_type → bundle → [records]` structure underneath
- [x] 1.2 Fix entity reference documentation: content fields use plain string IDs; show correct YAML examples
- [x] 1.3 Document the two-pass generation order (content first, config second) and why
- [x] 1.4 Document `{type: entity, entity_type, bundle, view_mode, record: N}` object form as template-only (used inside `rows[]` and similar template-generated structures)
- [x] 1.5 Remove all `_meta` references and examples
- [x] 1.6 Add `views` to the built-in template list alongside `canvas` and `layout-builder`

## 2. Simplify create-sample-data.md

- [x] 2.1 Remove `view_configs` param from the frontmatter params section
- [x] 2.2 Replace the special-cased view generation loop (Step 3) with a unified two-pass loop: pass 1 iterates `content:` bundles, pass 2 iterates `config:` bundles
- [x] 2.3 Remove the `items_per_page`-driven record count logic from the view branch — this moves into the `views` template rule
- [x] 2.4 Update the validation section to reflect that `_meta` is never written and content refs are string IDs

## 3. Add views template rule

- [x] 3.1 Create `tasks/rules/views-template.md` (or equivalent rule file) defining the `when: template: views` rule
- [x] 3.2 Rule generates `rows[]` with `{type: entity, entity_type, bundle, view_mode, record: N}` entries
- [x] 3.3 Row count = `items_per_page` from the same record (default 6); `record: N` cycles through available content records (round-robin)
- [x] 3.4 Document required `settings` keys: `entity_type`, `bundle`, `view_mode`

## 4. Simplify intake.md

- [x] 4.1 Replace scenes-file reading with direct `data-model.yml` enumeration — list all `content:` and `config:` bundles as candidates
- [x] 4.2 Remove the scenes-file check from the section selection step
- [x] 4.3 Update the analysis output format to show content bundles and config bundles separately

## 5. Update SKILL.md

- [x] 5.1 Update description to reflect unified content/config generation
- [x] 5.2 Update task file list if new rule file was added in step 3

## 6. Extend designbook-data-model skill

- [x] 6.1 Add rule `designbook-data-model/rules/sample-template-views.md` — auto-assigns `sample_template: template: views` on fields with `type: entity_list`, prompts for required settings (entity_type, bundle, view_mode)
