## 1. Workflow Definitions

- [x] 1.1 Add `setup-compare`, `capture`, and `compare` stages to `design/workflows/design-shell.md` between `scene` and `outtake`
- [x] 1.2 Add `setup-compare`, `capture`, and `compare` stages to `design/workflows/design-screen.md` between `scene` and `outtake`

## 2. Intake — Rich Component Params

- [x] 2.1 Update `design/tasks/intake--design-shell.md` Step 7 to document passing extracted design data (styles, fonts, content, description with ref= hint) directly as component params

## 3. Setup-Compare Task

- [x] 3.1 Create `design/tasks/setup-compare.md` with `when.steps: [design-shell:setup-compare, design-screen:setup-compare]` — calls `_debo story --scene <scene> --seed <meta-json>` and returns `checks` as params

## 4. Outtake — Score Table and User Questions

- [x] 4.1 Update `design/tasks/outtake--design-screen.md` to read draft issue JSON files, compute weighted score per region (critical×3 + major×2 + minor×1), and display a score + diff table with total score
- [x] 4.2 Update `design/tasks/outtake--design-screen.md` to ask "Ist dir noch etwas aufgefallen?" and "Soll design-verify gestartet werden?" instead of auto-launching design-verify
- [x] 4.3 When user accepts design-verify, launch it normally — capture tasks auto-skip when screenshots already exist

## 5. Remove CLI Issue Layer from design-verify

- [x] 5.1 Update `design/tasks/triage--design-verify.md` — remove all `_debo story issues --add` / `--close` calls, keep only draft JSON reading + consolidation + passing as params
- [x] 5.2 Update `design/tasks/polish.md` — remove `_debo story issues --update` calls, task done = issue resolved
- [x] 5.3 Update `design/tasks/outtake--design-verify.md` — read workflow task statuses instead of `_debo story issues --scene`, build result table from tasks

## 6. CLI Cleanup

- [x] 6.1 Remove or deprecate `_debo story issues` CLI commands from addon TypeScript code

## 7. Unify Playwright Usage via playwright-cli

- [x] 7.1 Create `resources/cli-playwright.md` reference documenting all playwright-cli commands used in designbook (open, goto, resize, screenshot, snapshot, eval, run-code, close)
- [x] 7.2 Update `design/rules/extract-reference.md` — replace Node API scripts with playwright-cli commands (goto, eval, screenshot)
- [x] 7.3 Update `design/rules/playwright-capture.md` — replace Node API element capture with playwright-cli snapshot + screenshot ref; keep `npx playwright screenshot` for full-page

## 8. Verification

- [x] 8.1 Run `./scripts/setup-workspace.sh drupal-web` from worktree root, then run a design-shell workflow to verify the new capture → compare → outtake flow works end-to-end
- [x] 8.2 Run a design-verify workflow to verify triage → polish works without CLI issue calls
