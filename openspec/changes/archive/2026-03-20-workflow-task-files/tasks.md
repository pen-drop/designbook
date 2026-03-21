## 1. Task & Rule File Format — Document & Create

- [x] 1.1 Document task file convention in SKILL.md: filename = stage name, frontmatter (`when`, `params`, `files`), param templating
- [x] 1.2 Document rule file convention in SKILL.md: `when` (stage + config), body = constraint prose
- [x] 1.3 Document canonical stage names in SKILL.md (create-component, create-scene, create-data-model, create-tokens, etc.)
- [x] 1.4 Create `designbook-components-sdc/tasks/create-component.md` — `when: { component.framework: sdc }`, params: component/slots/group, files: component.yml/twig/story.yml
- [x] 1.5 Create `designbook-components-sdc/rules/sdc-slot-naming.md` — `when: { stage: create-component }`
- [x] 1.6 Create `designbook-scenes/tasks/create-shell-scene.md` — no when, params: components
- [x] 1.7 Create `designbook-tokens/tasks/create-tokens.md` — no when, files: design-tokens.yml
- [x] 1.8 Create `designbook-data-model/tasks/create-data-model.md` — no when, files: data-model.yml
- [x] 1.9 Create `designbook-data-model/rules/drupal-field-naming.md` — `when: { backend: drupal, stage: create-data-model }`
- [x] 1.10 Create task files for remaining skills (sample-data, view-modes, css)

## 2. Workflow Frontmatter — Stages Only

- [x] 2.1 Update `debo-design-shell.md`: frontmatter = `stages: [dialog, create-component, create-scene]` only; body = dialog + task-collection step
- [x] 2.2 Update `debo-design-tokens.md`: `stages: [dialog, create-tokens]`
- [x] 2.3 Update `debo-data-model.md`: `stages: [dialog, create-data-model]`
- [x] 2.4 Update `debo-sample-data.md`: stages
- [x] 2.5 Update remaining `debo-*.md` workflows

## 3. tasks.yml Format — stages + stage field per task

- [x] 3.1 Update `workflow create` CLI: write `stages` array from input JSON into tasks.yml
- [x] 3.2 Update `workflow create` CLI: write `stage` field per task in tasks.yml
- [x] 3.3 Update `workflow-utils.ts` / `parseTaskFile` to read `stages` and `task.stage`

## 4. Storybook Panel — Stage Grouping

- [x] 4.1 Update Panel.tsx: group tasks by `stage` field
- [x] 4.2 Use `stages` array from tasks.yml for group ordering

## 5. SKILL.md — Updated Rules

- [x] 5.1 Update Rule 1 (Plan): AI reads `stages` from workflow; runs `dialog` stage; scans skills for `tasks/<stage>.md` per remaining stage; filters by `when`; collects task instances; calls `workflow create --tasks '<json>'`
- [x] 5.2 Update Rule 2 (Execute): AI processes stages in order; for each task loads its task file + matching rules; creates files; `validate --task`; `done --task`
- [x] 5.3 Document rule auto-loading: scan `skills/*/rules/*.md`, filter by `when.stage` and config
