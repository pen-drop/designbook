## Why

The `design-verify` workflow was tested end-to-end and a `--research` audit revealed 7 issues in task files: contradictory meta-publishing logic, broken CLI references, missing title interpolation, undocumented params, and a missing triage consolidation rule that caused the search button to be merged into an unrelated issue instead of becoming its own fix task.

## What Changes

- **compare-screenshots.md**: Remove Phase 2 meta-publishing (contradicts triage-only publishing flow). Keep only draft JSON writing.
- **compare-markup.md**: Replace `npx playwright-cli` with correct Playwright Node API pattern (consistent with `playwright-capture.md` rule).
- **polish.md**: Fix title to `"Polish {id}"` (description is now a separate field). Document `--update` index resolution.
- **triage--design-verify.md**: Add explicit CLI command for writing issues to workflow params (`workflow done --params`). Add consolidation rule: separate issues per element (don't merge logo-icon + search-button into one issue).
- **playwright-capture.md**: Remove vestigial `verify` step from `when.steps`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `workflow-execution`: Clarify `--update` index vs ID resolution in polish step documentation

## Impact

- **Skill files**: 5 task/rule files under `.agents/skills/designbook/design/`
- **No code changes**: All fixes are in skill markdown files (task instructions, not TypeScript)
- **No breaking changes**: Existing workflows continue to work, fixes improve accuracy
