## 1. Fixture Directory Structure

- [x] 1.1 Create `fixtures/drupal-stitch/` directory with `designbook.config.yml` (copy from `packages/integrations/test-integration-drupal/designbook.config.yml`)
- [x] 1.2 Create `fixtures/drupal-petshop/` directory with `designbook.config.yml` (same base config)
- [x] 1.3 Populate `fixtures/drupal-petshop/` fixture layers from existing `promptfoo/fixtures/_shared/` and per-workflow fixtures: `vision/`, `tokens/`, `data-model/`, `sections/`, `design-component/`, `sample-data/`
- [x] 1.4 Create initial `fixtures/drupal-stitch/` fixture layers (at minimum `vision/` — can be populated later via snapshot)

## 2. Case Files

- [x] 2.1 Create case files for `drupal-petshop` by migrating existing promptfoo configs: `vision.yaml`, `tokens.yaml`, `data-model.yaml`, `sections.yaml`, `design-component.yaml`, `design-screen.yaml`, `design-shell.yaml`, `css-generate.yaml`, `sample-data.yaml`, `shape-section.yaml`
- [x] 2.2 Create initial case files for `drupal-stitch` (at minimum `vision.yaml`)
- [x] 2.3 Migrate chain config (`promptfoo/configs/chain.yaml`) prompts into individual case files

## 3. Setup Script

- [x] 3.1 Create `scripts/setup-test.sh <suite> <case> [--into <dir>]` that reads case YAML, layers fixtures, symlinks `.agents/` and `.claude/`, runs `git init` + commit "base"
- [x] 3.2 Ensure script works from repo root and from git worktrees

## 4. debo-test Skill

- [x] 4.1 Create `.agents/skills/designbook-test/SKILL.md` with argument parsing for `<suite> <case>`
- [x] 4.2 Implement workspace setup (calls `setup-test.sh`)
- [x] 4.3 Implement prompt display and execution confirmation
- [x] 4.4 Implement snapshot offer: `git diff` + `git ls-files --others` → copy to fixtures
- [x] 4.5 Implement case listing when invoked with suite only (`/debo-test drupal-stitch`)

## 5. Promptfoo Migration

- [x] 5.1 Update promptfoo provider/setup to call `scripts/setup-test.sh` instead of `promptfoo/scripts/setup-workspace.sh`
- [x] 5.2 Update promptfoo configs to read prompts from case files (or reference them)
- [ ] 5.3 Remove old `promptfoo/fixtures/` directory after migration is verified
- [x] 5.4 Update `promptfoo/scripts/clean.sh` to use new fixture paths

## 6. Verification

- [x] 6.1 Run `scripts/setup-test.sh drupal-petshop design-screen` and verify workspace contains expected files
- [ ] 6.2 Run `/debo-test drupal-petshop vision` in a workspace and verify full cycle (setup → prompt → workflow → snapshot offer)
- [ ] 6.3 Run `promptfoo eval -c` with a migrated config and verify it passes existing assertions
