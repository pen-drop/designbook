## 1. CLI — workflow done --loaded flag

- [x] 1.1 Add `--loaded <json>` option to `workflow done` command handler
- [x] 1.2 Parse and validate the `--loaded` JSON; exit 1 with error on invalid JSON
- [x] 1.3 Write `loaded` (task_file, rules, config_rules, config_instructions) to the stage entry in tasks.yml — deduplicate: skip if stage already has `loaded`
- [x] 1.4 Write `validation` array to the task entry in tasks.yml
- [x] 1.5 Ensure existing `workflow done` calls without `--loaded` continue to work unchanged

## 2. tasks.yml Schema

- [x] 2.1 Update tasks.yml TypeScript types / schema to include optional `loaded` on stage entries
- [x] 2.2 Update tasks.yml TypeScript types / schema to include optional `validation` array on task entries
- [x] 2.3 Verify backwards compatibility: existing tasks.yml files without these fields parse without error

## 3. designbook-workflow Skill

- [x] 3.1 Update Rule 2 in `SKILL.md`: after `workflow validate`, read output and build `validation[]` array
- [x] 3.2 Update Rule 2 in `SKILL.md`: on every `workflow done` call, pass `--loaded` JSON with task_file, rules, config_rules, config_instructions, and validation results
- [x] 3.3 Document the `--loaded` JSON shape in the CLI Commands section of `SKILL.md`
