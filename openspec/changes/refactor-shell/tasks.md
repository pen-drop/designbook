# Tasks: refactor-shell

## 1. Rewrite Workflow ✅
- [x] Rewrite `.agent/workflows/debo-design-shell.md` to produce `shell.screen.yml` + components
- [x] Add component existence checks (create page/header/footer if missing via skill)
- [x] Keep conversational design questions (layout, navigation, responsive)
- [x] Add `docs` field in screen.yml for Storybook Docs tab (replaces shell-spec.md)
- [x] Update name/id to `debo-design-shell`

## 2. Update design-screen Workflow Reference ✅
- [x] Update `debo-design-screen.md`: change shell prerequisite from `design-shell/shell-spec.md` to `shell/shell.screen.yml`

## 3. Update Promptfoo Test
- [ ] Update `promptfoo/fixtures/debo-design-shell/` — add missing fixture files for new output
- [ ] Update `promptfoo/promptfooconfig.yaml` — shell test prompt: output is `shell.screen.yml` + components, not `shell-spec.md`
- [ ] Update `promptfoo/promptfooconfig.yaml` — shell test rubric: check for screen.yml + page/header/footer components

## 4. Verify
- [ ] Run promptfoo shell test in isolation
- [ ] Lint + test pass
