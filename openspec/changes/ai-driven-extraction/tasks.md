## 1. New CLI: `story issues`

- [x] 1.1 Implement `_debo story issues --scene <scene> --check <check-key> --add --json '[...]'` — add issues to a check
- [x] 1.2 Implement `_debo story issues --scene <scene>` — list all issues for a story
- [x] 1.3 Implement `_debo story issues --scene <scene> --check <check-key>` — list issues for one check
- [x] 1.4 Implement `_debo story issues --scene <scene> --open` — list only open issues
- [x] 1.5 Implement `_debo story issues --scene <scene> --check <check-key> --update <index> --json '{...}'` — update a single issue (status, result)
- [x] 1.6 Issue format: `{source, severity, description, label, category, property, expected, actual, status, result}`

## 2. Extend CLI: `story check` with lifecycle fields

- [x] 2.1 Add `status` field to checks: `open` (from compare) or `done` (from verify)
- [x] 2.2 Add `result` field to checks: `pass|fail` (set by verify, null while open)
- [x] 2.3 Update `--checks-open` filter: return checks where `status != done`
- [x] 2.4 Update CLI documentation in `resources/cli-story.md`

## 3. Update meta.yml schema

- [x] 3.1 Update `design/resources/story-meta-schema.md` — add structured issue format to check entries, add `status`/`result` fields
- [x] 3.2 Add `extractions/` to path convention: `stories/{storyId}/extractions/{bp}--spec.yml`, `{bp}--reference.json`, `{bp}--storybook.json`
- [x] 3.3 Document issue lifecycle: `open` → `done` with `result: pass|fail`

## 4. Rewrite compare-markup task

- [x] 4.1 Rewrite `.agents/skills/designbook/design/tasks/compare-markup.md` — replace monolithic inspection with three-phase model, all CLI-based
- [x] 4.2 Phase 1: AI opens Playwright on reference URL, retrieves DOM summary, inspects screenshot, writes `extractions/{bp}--spec.yml`
- [x] 4.3 Phase 2: for each element in spec, run `querySelectorAll` + `getComputedStyle` on both URLs, write `extractions/{bp}--reference.json` and `{bp}--storybook.json`
- [x] 4.4 Phase 3: compute diff in memory, AI classifies severity, create check via `story check` (status: open), add issues via `story issues --add`
- [x] 4.5 Add extraction-spec.yml format documentation
- [x] 4.6 Add extraction JSON output format documentation
- [x] 4.7 Add severity classification table (critical/major → issue, minor/info → dropped)
- [x] 4.8 Add iterative refinement section: max 2 rounds
- [x] 4.9 Add spec reuse section: reuse/refine existing spec on re-run

## 5. Update compare-screenshots task

- [x] 5.1 Update `.agents/skills/designbook/design/tasks/compare-screenshots.md` — create check via `story check` (status: open), add issues via `story issues --add` with `source: screenshots`
- [x] 5.2 Issue format: `{source:"screenshots", severity, description}`

## 6. Update polish task

- [x] 6.1 Update `.agents/skills/designbook/design/tasks/polish.md` — read issues via `story issues --open`, receives individual issue as iteration item
- [x] 6.2 After fixing, update issue via `story issues --update` with `status: done`
- [x] 6.3 Issues contain actionable details: label, property, expected, actual, severity

## 7. Update verify task

- [x] 7.1 Update `.agents/skills/designbook/design/tasks/verify.md` — re-evaluate after recapture, update issues via `story issues --update` with `result: pass|fail`
- [x] 7.2 Close check via `story check` with `status: done`, `resulja t: pass|fail` (pass if all issues pass)

## 8. Update design-verify workflow

- [x] 8.1 Update `.agents/skills/designbook/design/workflows/design-verify.md` — change polish stage from `each: checks` to `each: issues`
- [x] 8.2 `story issues --open` provides the iteration items for the polish stage

## 9. Verification

- [ ] 9.1 Run `./scripts/setup-workspace.sh drupal-stitch` from repo root, trigger a `design-verify` workflow on a scene with a reference URL — verify: extraction artifacts generated, check created, issues added via CLI, polish iterates over issues, verify confirms resolution
