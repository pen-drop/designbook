## 1. Workflow frontmatter fix

- [x] 1.1 Add `each: section` to the execute stage in `.agents/skills/designbook/sections/workflows/sections.md`

## 2. Intake task params format

- [x] 2.1 Update `intake--sections.md`: replace `--items` JSON format with `--params` format using `{"section": [...]}` keyed by `each` name

## 3. Create-section template quoting

- [x] 3.1 Add double quotes to `title`, `group`, and `description` values in the YAML template in `create-section.md`

## 4. CLI: Auto-complete intake tasks

- [x] 4.1 `workflow plan` SHALL automatically mark all intake-stage tasks as `done` after successful expansion

## 5. Verification

- [ ] 5.1 In the workspace: `git add -A && git commit -m "pre-research"` then `git reset --hard HEAD~1` to get clean state
- [ ] 5.2 Run `/designbook sections --research` and verify multi-section expansion works
- [x] 5.3 Document the verification workflow pattern in the `designbook-skill-creator` skill (research → fix → rebuild workspace → re-run with `--research` → confirm zero friction)
