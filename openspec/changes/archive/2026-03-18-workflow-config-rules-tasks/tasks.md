## 1. Config Spec Update

- [x] 1.1 Update `openspec/specs/designbook-configuration/spec.md` — sync `workflow.rules` and `workflow.tasks` requirements from delta spec (archive-time merge)

## 2. Designbook Configuration Skill

- [x] 2.1 Update `.agents/skills/designbook-configuration/SKILL.md` — add `workflow.rules` and `workflow.tasks` to the config mapping table and usage documentation

## 3. Designbook Workflow Skill

- [x] 3.1 Update Rule 4 in `.agents/skills/designbook-workflow/SKILL.md` — after scanning skill rule files, also read `designbook.config.yml` → `workflow.rules.<stage>` and apply each string as an additional constraint
- [x] 3.2 Update Rule 2 in `.agents/skills/designbook-workflow/SKILL.md` — after loading the task file for a stage, also read `designbook.config.yml` → `workflow.tasks.<stage>` and append each string as additional instructions
