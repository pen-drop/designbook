## Why

The design-shell and design-screen workflows produce components and scenes but have no built-in quality feedback. The outtake immediately launches a full design-verify child workflow (7 stages) which is heavyweight for a first-pass quality check. Users need a quick visual diff with a numeric score so they can see "how close did we get?" and decide whether to run the full verify cycle.

Additionally, information from the design reference extraction (landmark structure, colors, dimensions) is stored as free-form Markdown and must be re-interpreted by each subsequent stage. Passing extracted design data (styles, fonts, content) directly as component params eliminates this re-interpretation.

## What Changes

- Add `capture` and `compare` stages to both `design-shell` and `design-screen` workflows, between the `scene` stage and `outtake`
- Reuse existing `capture` and `compare-screenshots` tasks — no new task files
- Modify the intake task for design-shell to pass extracted design data (styles, fonts, content, nav items) directly as component params — no separate `ref` field, no changes to `create-component.md`
- Modify the shared outtake task (`outtake--design-screen.md`) to:
  - Read draft issue JSON files produced by `compare-screenshots`
  - Compute a weighted score per region: `critical x 3 + major x 2 + minor x 1`
  - Display a score + diff table
  - Ask the user "Ist dir noch etwas aufgefallen?"
  - Ask "Soll design-verify gestartet werden?" instead of launching it automatically
- Simplify design-verify's issue handling: eliminate the entire `_debo story issues` CLI layer. Draft JSON files from compare are the source of truth — triage consolidates them and passes directly as workflow params. Workflow tasks ARE the issues. No meta-publish, no CLI issue management, no `--update` / `--close` roundtrips.

## Capabilities

### New Capabilities

- `design-workflow-compare`: Inline capture + compare stages for design-shell and design-screen workflows with score-based diff output in the outtake

### Modified Capabilities

- `workflow-format`: The design-shell and design-screen workflow definitions gain new stages (capture, compare) that depend on a `checks` iterable produced between scene and capture
- `scene-conventions`: The outtake task changes from auto-launching design-verify to showing a score table and asking the user

## Impact

- Skill files only (no TypeScript/addon changes):
  - `designbook/design/workflows/design-shell.md`
  - `designbook/design/workflows/design-screen.md`
  - `designbook/design/tasks/intake--design-shell.md`
  - `designbook/design/tasks/outtake--design-screen.md`
- `create-component.md` unchanged — extra params are passed through by the workflow engine without needing declaration
- Existing `compare-screenshots` and `capture` tasks reused unchanged
- The `checks` iterable must be produced between scene creation and capture — requires either a setup step or the scene task passing checks as params
- design-verify task files affected: `triage--design-verify.md` (remove meta-publish), `polish.md` (remove issue status CLI calls), `outtake--design-verify.md` (read task status instead of story issues CLI)
- Addon CLI: `_debo story issues` commands can be deprecated/removed
