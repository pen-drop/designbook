# Task 7 Report: Update consumers to nested theme working dir

## Skill-creator loaded

`designbook-skill-creator` skill loaded. Read `rules/workflow-files.md` and `rules/common-rules.md` before editing any `.agents/skills/` workflow files.

## Exact path changes — setup-test.sh

Added `THEME_REL="web/themes/custom/test_integration_drupal"` variable after the workspace-existence check (just before the echo lines), then:

1. **Config copy (section 2, lines ~108-110):**
   - Before: `cp ... "$TARGET_DIR/designbook.config.yml"` / `cp ... "$TARGET_DIR/"`
   - After: `cp ... "$TARGET_DIR/$THEME_REL/designbook.config.yml"` / `cp ... "$TARGET_DIR/$THEME_REL/"`

2. **Fixture layering (section 3, the `cp -r` inside the loop):**
   - Before: `cp -r "$FIXTURE_DIR/." "$TARGET_DIR/"`
   - After: `cp -r "$FIXTURE_DIR/." "$TARGET_DIR/$THEME_REL/"`

3. **Git reset (section 1, `cd "$TARGET_DIR"` + git reset) — unchanged.** The workspace git root stays at `$TARGET_DIR`.

## designbook-test workflow file updates

### run.md

- Added YAML frontmatter (`name: run`, `description:`) — required for COMMON-01.
- Section 3 "Start Storybook": added `cd workspaces/<suite>/web/themes/custom/test_integration_drupal` before the `_debo` commands, with explicit note that commands run from the designbook working dir.
- Section 4 subagent dispatch: changed "the workspace path as its working directory" to the explicit path `workspaces/<suite>/web/themes/custom/test_integration_drupal`.

### research.md

- Section "Setup", step 4: added `cd workspaces/$SUITE/web/themes/custom/test_integration_drupal` before the `npx` commands, with explicit note about the designbook working dir.

## config.ts hint change

`packages/storybook-addon-designbook/src/config.ts`, `assertNotRepoRoot()` function (~line 166):
- Before: `Run from a workspace (cd workspaces/<suite>) or set DESIGNBOOK_DATA explicitly.`
- After: `Run from a workspace theme dir (cd workspaces/<suite>/web/themes/custom/<theme>) or set DESIGNBOOK_DATA explicitly.`
- Logic unchanged — string only.

## Validator results

Ran designbook-skill-creator validator over run.md and research.md. Checks applied:
- COMMON-01: YAML frontmatter present and parseable — PASS (both files)
- COMMON-02: No site-specific references — NOT APPLICABLE (files are under designbook-test/, not core designbook/)
- WORKFLOW-01: No workflow-qualified step names — PASS (both files; no stages: YAML block present)
- WORKFLOW-02: stages.*.isolate is boolean if present — PASS (both files; no stages: block)

**Result: zero errors, zero warnings.**

## pnpm check results

`pnpm check` (typecheck → lint → test) passed fully:
- Typecheck: clean (no tsc errors)
- Lint: clean (no eslint errors)
- Test: 96 test files, 1022 tests — all passed

## Smoke test

`bash scripts/smoke-drupal-workspace.sh` was NOT re-run (slow, requires ddev/Docker). The path changes are targeted and mechanical; the git-reset step remains at `$TARGET_DIR` (workspace root), so git operations are unaffected.

## Concerns

None. All changes are minimal and targeted to the path migration. No backwards-compat code added.

## Fix: git-repo-root safety

### Root cause confirmed

`scripts/setup-workspace.sh` runs `git init` in the THEME dir (`$WORKSPACE_DIR/web/themes/custom/test_integration_drupal`), not the workspace root. The original `setup-test.sh` and workflow files ran git operations in `$TARGET_DIR` (workspace root), which is NOT a git repo. This caused git to resolve upward to the monorepo worktree — confirmed: `git -C workspaces/t7fix rev-parse --show-toplevel` returns `/home/cw/projects/designbook/.claude/worktrees/export` (the monorepo), not the workspace.

### Changes made

**scripts/setup-test.sh:**
- Added `mkdir -p "$TARGET_DIR/$THEME_REL"` immediately after the `THEME_REL=...` declaration (line 87) — defensive guard before any git/cp operations into the theme dir.
- Section 1 (reset): changed `cd "$TARGET_DIR"` to `cd "$TARGET_DIR/$THEME_REL"` — git reset/clean now target the theme dir (the actual git repo root).
- Section 3 (commit): changed `cd "$TARGET_DIR"` to `cd "$TARGET_DIR/$THEME_REL"` — git add/commit now target the theme dir.
- Non-git path logic (cp fixture files, cp config) was already correct (`$TARGET_DIR/$THEME_REL`).

**`.agents/skills/designbook-test/workflows/run.md`:**
- Section 6 "Snapshot offer" step 1: changed "cd into the workspace directory" to "cd into the theme dir (`workspaces/<suite>/web/themes/custom/test_integration_drupal`) — that is the git repo root for the workspace". Git diff/ls-files now explicitly target the theme dir.

**`.agents/skills/designbook-test/workflows/research.md`:**
- Setup step 5: changed `cd workspaces/$SUITE && git tag workspace-baseline` to `cd workspaces/$SUITE/web/themes/custom/test_integration_drupal && git tag workspace-baseline` with inline note that theme dir is the git repo root.
- Loop section 4 "Reset workspace": added explicit `cd workspaces/$SUITE/web/themes/custom/test_integration_drupal` before the `git reset --hard workspace-baseline` and `git clean` commands. Note added.

Note: Loop section 6 "Decide" keep/discard operations (`git commit -am`, `git restore`) annotated as "Repo root:" — these apply patches to monorepo skill files (the experiment), which is correct; they remain unchanged.

### Monorepo HEAD — before/after (proving untouched)

- Before (captured at conversation start): `2ca7938557ffc02a3daa5bc81c51d0678de75f75`
- After workspace creation + setup-test run + cleanup: `2ca7938557ffc02a3daa5bc81c51d0678de75f75`
- UNCHANGED.

### Theme-dir git-root verification

Created throwaway workspace `workspaces/t7fix` via `./scripts/setup-workspace.sh t7fix`.

```
git -C workspaces/t7fix/web/themes/custom/test_integration_drupal rev-parse --show-toplevel
# → /home/cw/projects/designbook/.claude/worktrees/export/workspaces/t7fix/web/themes/custom/test_integration_drupal ✓

git -C workspaces/t7fix rev-parse --show-toplevel
# → /home/cw/projects/designbook/.claude/worktrees/export  (monorepo — NOT the workspace!) ✓ confirms bug was real
```

Ran `./scripts/setup-test.sh drupal-petshop data-model --into workspaces/t7fix`:
- Completed successfully with fixed git operations targeting theme dir.
- `git -C workspaces/t7fix/web/themes/custom/test_integration_drupal log --oneline` shows:
  ```
  18f34d5 fixtures: drupal-petshop/data-model
  31b88ad init: test_integration_drupal workspace
  ```
  Two workspace-own commits; no monorepo history present.

Workspace cleaned up: `rm -rf workspaces/t7fix`. Monorepo HEAD still `2ca7938557ffc02a3daa5bc81c51d0678de75f75`.

### Validator results (run.md + research.md)

Checks applied per `designbook-skill-creator` rules:
- COMMON-01: YAML frontmatter present and parseable — PASS (both files)
- COMMON-02: No site-specific references — N/A (files are under designbook-test/, not core designbook/)
- WORKFLOW-01: No workflow-qualified step names — PASS (no `stages:` block in either file)
- WORKFLOW-02: `stages.*.isolate` boolean if present — PASS

**Result: zero errors, zero warnings.**

### pnpm check

`pnpm check` (typecheck → lint → test): 96 test files, 1022 tests — all passed.
