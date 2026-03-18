## Context

Designbook workflows are currently standalone — each `debo-*.md` workflow executes independently with no awareness of related workflows. The `designbook-workflow` SKILL.md defines AI rules for execution, and workflow frontmatter declares stages and reads. The `before`/`after` hooks extend this frontmatter-driven model without changing the underlying task tracking format significantly.

The `reads:` mechanism already provides a partial dependency signal (Rule 2a checks reads before stage execution), but it only blocks — it doesn't trigger anything. Hooks are the complementary "trigger" side.

Workflows currently only appear in the Storybook panel after `workflow create` is called with a full task list (post-dialog). This means long dialog phases are invisible in the panel.

## Goals / Non-Goals

**Goals:**
- Declare `before`/`after` workflow hooks in frontmatter
- Three `before` policies: `always`, `if-never-run`, `ask`
- `after` always asks (no policy field)
- `before` hooks run after the current workflow's dialog, before tasks
- `reads:` as a natural gate: if a before-workflow's reads are unsatisfied, skip it regardless of policy
- New CLI flag `workflow list --include-archived` for `if-never-run` checks
- `status: dialog` — workflows created at dialog start, visible in Storybook from the beginning
- `parent` field — triggered workflows store who triggered them; shown in panel

**Non-Goals:**
- Automatic workflow sequencing without user input (after is always ask)
- Nested hook chains (hooks on hooks)
- Parallel before-workflow execution
- Changes to task-level tracking

## Decisions

### Decision: `after` has no policy field — always ask

`after` hooks are suggestions to the user. Automatically running a follow-up workflow without confirmation would be surprising. Ask is the only sensible default.

*Alternative considered*: Allow `execute: always` on after-hooks. Rejected — silent automatic follow-up workflows would confuse users.

### Decision: `before` runs after the current workflow's dialog, not before it

The dialog gathers params needed for the current workflow. Running a before-workflow before the dialog would mean starting something before the user has committed. Running after dialog gives user context ("you're designing a component — first, let's set up tokens").

*Alternative considered*: Run before-hooks before the dialog. Rejected — awkward UX, user hasn't committed yet.

### Decision: `reads:` as gate for before-hooks

A before-workflow's own `reads:` are checked before applying its policy. If unsatisfied, skip silently. This makes `always` safe on dialog-based workflows — they typically have reads that won't exist until earlier workflows have run.

*Alternative considered*: Explicit `when-reads-satisfied: true` flag. Rejected — redundant.

### Decision: `if-never-run` checks archives via `--include-archived`

`workflow list` only returns active workflows. A flag extension is the least-invasive change for checking "ever completed".

### Decision: Split `workflow create` into init + plan

Currently `workflow create` does everything in one call (post-dialog). To support `dialog` status, we split:

1. **`workflow create --workflow <id> --title "<title>" --status dialog [--parent <name>]`** — called at workflow start, returns `$WORKFLOW_NAME`, creates skeleton with no tasks
2. **`workflow plan --workflow $WORKFLOW_NAME --stages '<json>' --tasks '<json>'`** — called after dialog, adds tasks, transitions `dialog` → `planning`

The existing single-call `workflow create` (with `--stages --tasks`) remains valid and skips `dialog` status — no migration needed for workflows that don't need early visibility.

*Alternative considered*: Modify `workflow create` to accept empty tasks. Rejected — semantically confusing, existing callers would need to change.

### Decision: Parent stored in tasks.yml, displayed as reference in panel

When a workflow is triggered by a hook (before or after), the `workflow create --parent <name>` flag stores the parent's `$WORKFLOW_NAME` in the child's `tasks.yml`. The panel shows this as a compact "↳ `<parent-title>`" line under the child workflow header.

*Alternative considered*: Parent only in memory (not persisted). Rejected — panel gets data from tasks.yml via polling, not from AI context.

### Decision: `dialog` status icon — 💬

Status progression with icons:
```
💬 dialog  →  📋 planning  →  ⚡ running  →  ✅ completed
```

`dialog` workflows show without a task list (since tasks aren't known yet). Reduced opacity to distinguish from active work.

## Risks / Trade-offs

- **Infinite loops**: `always` on a workflow that hooks back could loop. Mitigation: hooks are not recursive (no hooks-on-hooks); `always` is documented for task-only workflows.
- **Long chains**: Multiple `before` hooks each with full dialogs could make a workflow feel very long. Mitigation: `if-never-run` limits to first-time runs only.
- **`--include-archived` scan cost**: O(n) over archive dirs — acceptable for typical project sizes.
- **Stale `dialog` entries**: If a workflow's dialog is abandoned, a `dialog`-status entry persists. Mitigation: treated same as `planning` for the resume check (Rule 0).

## Open Questions

- Should the after-hook prompt appear even if the current workflow was interrupted (not cleanly completed)?
- Should a `dialog`-status workflow be included in Rule 0's resume check, or only `planning`/`running`?
