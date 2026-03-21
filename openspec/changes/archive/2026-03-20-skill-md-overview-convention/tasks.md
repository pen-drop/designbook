## 1. designbook-addon-skills: document the SKILL.md contract

- [x] 1.1 Add a `## SKILL.md Contract` section to `resources/skill-authoring.md` (or directly to `SKILL.md` if that file does not exist) that documents:
  - The skill-creator progressive disclosure model (3 levels)
  - What is allowed in designbook-* SKILL.md: frontmatter, overview, links to tasks/rules/resources, small reference material (schema diagrams, valid value tables, format specs)
  - What is NOT allowed: execution instructions, CLI commands, step-by-step procedures, AI rules with if/then branching, "load X skill" directives
  - Where displaced content goes: `tasks/` (execution), `rules/` (conditional constraints), `resources/` (reference docs)
  - Target size: ~40 lines for designbook-* SKILL.md files

## 2. designbook-workflow: extract execution logic

- [x] 2.1 Create `rules/workflow-execution.md` — move all AI Rules (Rule 0 through Rule 6) + before/after hook logic from SKILL.md. Set `when:` to apply to all stages (omit `when.stages`).
- [x] 2.2 Create `resources/cli-reference.md` — move CLI Commands section (all `workflow create/plan/list/validate/done/add-file` commands + `--loaded` JSON shape)
- [x] 2.3 Create `resources/task-format.md` — move Task JSON Format, tasks.yml Format, and Directory Structure sections
- [x] 2.4 Create `resources/architecture.md` — move Stage-Based Architecture, Integration Pattern, Storybook Integration, and Status Transitions sections
- [x] 2.5 Reduce `SKILL.md` to: frontmatter + 1-paragraph overview + Task Types table (small reference) + links to resources/ and rules/

## 3. designbook-configuration: extract config reference

- [x] 3.1 Create `rules/config-loading.md` — document the two-step bootstrap that every workflow stage depends on:
  1. **Locate `designbook.config.yml`** by walking up from the current directory; read the `cmd` key → set `$DESIGNBOOK_CMD` (fallback: `npx storybook-addon-designbook`)
  2. **Load all env vars** by running `eval "$($DESIGNBOOK_CMD config)"` — this exports `$DESIGNBOOK_DIST`, `$DESIGNBOOK_BACKEND`, etc.
  This rule must fire before any `$DESIGNBOOK_CMD workflow *` call. Set `when:` to apply to all stages (omit `when.stages`).
- [x] 3.2 Create `resources/config-reference.md` — move: Environment Variable Mapping table, full `designbook.config.yml` example, `entity_mapping.templates` docs, `sample_data.field_types` docs, `workflow.rules/tasks` docs, Node.js/bash usage examples
- [x] 3.3 Reduce `SKILL.md` to: frontmatter + 1-paragraph overview + links to `resources/config-reference.md` and `rules/config-loading.md`

## 4. designbook-scenes: extract critical rules and entity rendering

- [x] 4.1 Create `rules/scenes-constraints.md` — move the three ⛔ Critical Rules (provider format, no `type: element`, shell scenes inline slots). Set `when.stages: [create-shell-scene, create-scene, map-entity]`.
- [x] 4.2 Reduce `SKILL.md` to: frontmatter + overview + output structure diagram (small reference) + Task Files index + Resources index + Drupal template note + validation commands block

## 5. designbook-sample-data: extract format reference

- [x] 5.1 Create `resources/format.md` — move: Format: Nested entity_type.bundle section, Structure Rules table, Record Rules list, Field Templates section, Content Guidelines
- [x] 5.2 Reduce `SKILL.md` to: frontmatter + overview + output path + link to `resources/format.md` + task file link

## 6. designbook-data-model: extract schema reference

- [x] 6.1 Create `resources/schema-reference.md` — move: Schema Reference section (full schema tree diagram, `composition` note, View Config section + YAML example)
- [x] 6.2 Reduce `SKILL.md` to: frontmatter + 1-sentence overview + steps (write data-model.yml) + link to `resources/schema-reference.md`
