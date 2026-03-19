## 1. Config Schema

- [ ] 1.1 Add `workflow.skills` key documentation to the `designbook-configuration` skill spec (`designbook-configuration/index.md` or equivalent) — schema reference table and YAML example
- [ ] 1.2 Add `workflow.skills` to the config YAML example in the skill's main doc

## 2. Workflow Skill — Rule 4 Extension

- [ ] 2.1 Update `designbook-workflow` Rule 4 prose: after scanning task/rule files, add a step that reads `designbook.config.yml` → `workflow.skills.<stage>` and loads each skill via the Skill tool
- [ ] 2.2 Update Rule 4 to also check workflow-scoped dialog keys (e.g. `debo-design-tokens:dialog`) using the same scoping logic already used for `workflow.rules`
- [ ] 2.3 Specify load order: external skills from `workflow.skills` are loaded **before** task/rule file scanning

## 3. Validation

- [ ] 3.1 Add a usage example to `designbook-configuration` skill showing `workflow.skills` alongside `workflow.rules` and `workflow.tasks`
- [ ] 3.2 Test manually: add `frontend-design` to `workflow.skills.debo-design-tokens:dialog` in `designbook.config.yml` and verify it loads during the next `/debo-design-tokens` run
