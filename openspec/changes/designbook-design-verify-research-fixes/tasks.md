## 1. Compare Tasks — Draft-Only Publishing

- [x] 1.1 Remove Phase 2 CLI calls from `compare-screenshots.md` — delete the `_debo story check` and `_debo story issues --add` code blocks and surrounding text. Keep only Phase 1 (capture), Phase 2 (visual compare → in-memory), and Phase 3 (write draft JSON).
- [x] 1.2 Replace `npx playwright-cli -s=compare open` in `compare-markup.md` Phase 1 with Playwright Node API pattern (`const { chromium } = require('playwright')`) consistent with `playwright-capture.md`.

## 2. Triage Consolidation

- [x] 2.1 Add consolidation rule to `triage--design-verify.md` Step 2: "Each distinct actionable fix SHALL be a separate issue. If fixing one problem does not fix the other, they are separate issues — even if both appear in the same region or component."
- [x] 2.2 Update `triage--design-verify.md` Step 4 to use explicit CLI command: `_debo workflow done --workflow $WF --task $TASK_ID --params '{"issues": [...]}'`. Remove the vague "update YAML directly" fallback.

## 3. Polish Task

- [x] 3.1 Change `polish.md` title from `"Polish Issue {id}: "` to `"Polish {id}"`.
- [x] 3.2 Document in `polish.md` Step 4 that `--update` accepts an issue `id` string (not just numeric index): `_debo story issues --scene ${scene} --check ${checkKey} --update --id ${id} --json '...'`.

## 4. Playwright Capture Rule

- [x] 4.1 Remove `verify` from `playwright-capture.md` `when.steps` — change to `[capture, recapture, compare, polish]`.

## 5. Verification

- [ ] 5.1 Run `./scripts/setup-workspace.sh drupal-stitch` and execute `/designbook-test drupal-stitch design-verify` to confirm the updated task files produce correct behavior.
