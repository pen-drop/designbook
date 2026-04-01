## 1. CLAUDE.md consolidation

- [ ] 1.1 Move all content from `agents.md` into `CLAUDE.md` (code quality rules, skill references)
- [ ] 1.2 Add Skill Architecture section to `CLAUDE.md`: 3-part project map + instruction to load `designbook-skill-creator` before any `.agents/skills/` edits
- [ ] 1.3 Add Development Rules section to `CLAUDE.md`: workspace setup command + worktree behavior
- [ ] 1.4 Delete `agents.md`

## 2. OpenSpec context

- [ ] 2.1 Populate `openspec/config.yaml` `context:` field with: project one-liner, 3-part architecture, 4-level skill model summary, key principles (tasks = what, blueprints = overridable how, rules = hard)
- [ ] 2.2 Add `rules.tasks` to `openspec/config.yaml`: for changes that touch `.agents/skills/` or integration code, ask the user whether to add a Verification task group (workspace setup via `./scripts/setup-workspace.sh <name>` + `pnpm run dev` in workspace)

## 3. designbook-skill-creator skill

- [ ] 3.1 Create `.agents/skills/designbook-skill-creator/SKILL.md` — entry point with 3-part architecture, 4-level model, and skill map
- [ ] 3.2 Create `rules/principles.md` — task/blueprint/rule principles with examples
- [ ] 3.3 Create `rules/structure.md` — file structure conventions (tasks/ = stage name, rules/ = when conditions, blueprints/ = overridable)
- [ ] 3.4 Create `resources/skill-map.md` — full listing of all skills across parts 1–3
- [ ] 3.5 Create `resources/research.md` — `--research` flag: how it works, output format (numbered diagnostic), and the convention: "If actionable issues found → run `/opsx:ff skill-fix-<name>` to create an OpenSpec change for the fixes"

## 4. designbook-addon-skills scope correction

- [ ] 4.1 Update `.agents/skills/designbook-addon-skills/SKILL.md` — narrow description and content to Storybook addon TypeScript development only; remove references to designbook skill authoring conventions

## 5. Workspace script fix

- [ ] 5.1 Update `scripts/setup-workspace.sh` — remove early-exit when workspace exists; add `rm -rf` of existing workspace before creation
- [ ] 5.2 Replace symlink calls (`ln -sfn`) for `.agents` and `.claude` with `cp -r` from CWD
- [ ] 5.3 Update script header comment to reflect new behavior (always rebuild, copy not symlink)
