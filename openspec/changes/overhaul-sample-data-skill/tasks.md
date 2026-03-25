## 1. Rewrite format.md

- [ ] 1.1 Document `content:` and `config:` as top-level buckets with identical `entity_type → bundle → [records]` structure underneath
- [ ] 1.2 Fix entity reference documentation: content fields use plain string IDs; show correct YAML examples
- [ ] 1.3 Document the two-pass generation order (content first, config second) and why
- [ ] 1.4 Document `{type: entity, entity_type, bundle, view_mode, record: N}` object form as template-only (used inside `rows[]` and similar template-generated structures)
- [ ] 1.5 Remove all `_meta` references and examples
- [ ] 1.6 Add `views` to the built-in template list alongside `canvas` and `layout-builder`

## 2. Simplify create-sample-data.md

- [ ] 2.1 Remove `view_configs` param from the frontmatter params section
- [ ] 2.2 Replace the special-cased view generation loop (Step 3) with a unified two-pass loop: pass 1 iterates `content:` bundles, pass 2 iterates `config:` bundles
- [ ] 2.3 Remove the `items_per_page`-driven record count logic from the view branch — this moves into the `views` template rule
- [ ] 2.4 Update the validation section to reflect that `_meta` is never written and content refs are string IDs

## 3. Add views template rule

- [ ] 3.1 Create `tasks/rules/views-template.md` (or equivalent rule file) defining the `when: template: views` rule
- [ ] 3.2 Rule generates `rows[]` with `{type: entity, entity_type, bundle, view_mode, record: N}` entries
- [ ] 3.3 Row count = `items_per_page` from the same record (default 6); `record: N` cycles through available content records (round-robin)
- [ ] 3.4 Document required `settings` keys: `entity_type`, `bundle`, `view_mode`

## 4. Simplify intake.md

- [ ] 4.1 Replace scenes-file reading with direct `data-model.yml` enumeration — list all `content:` and `config:` bundles as candidates
- [ ] 4.2 Remove the scenes-file check from the section selection step
- [ ] 4.3 Update the analysis output format to show content bundles and config bundles separately

## 5. Update SKILL.md

- [ ] 5.1 Update description to reflect unified content/config generation
- [ ] 5.2 Update task file list if new rule file was added in step 3
