## Context

The designbook workflow CLI (`packages/storybook-addon-designbook/src/workflow.ts`) tracks AI workflow progress via `tasks.yml` files. Storybook polls these files and shows notifications on task completion.

The current CLI has two problems that cause AI agents to make frequent errors:
1. Mixed positional/flag argument style — `workflow update $WORKFLOW_NAME create-vision --status done` requires knowing argument positions
2. Tasks must be declared in frontmatter upfront — prevents generating tasks dynamically (e.g. one task per SDC component)

Additional gaps: no resume support, no per-task validation scope, no standalone mode prompt.

## Goals / Non-Goals

**Goals:**
- Fully `--flag` based CLI API (no positional args)
- Plan-then-execute: `workflow create --tasks <json>` declares ALL tasks + files upfront before any file is created
- `validate --task <id>` for per-task validation scoped to declared files
- `workflow done --task <id>` to mark task complete and trigger auto-archive
- `workflow add-file` as escape hatch for files not known at plan time
- Resume detection: list unarchived workflows with same `--workflow` id
- Standalone mode: AI asks user if they want tracking when `$WORKFLOW_NAME` is unset
- New SKILL.md marker syntax: `!WORKFLOW_PLAN` / `!TASK` / `!TASK_END` / `!WORKFLOW_DONE`

**Non-Goals:**
- Changing the `tasks.yml` file format or Storybook display logic
- Auto-migration of existing `debo-*` workflows (can be done separately)
- Changing the archive/changes directory structure

## Decisions

### Decision: Plan-then-execute — all tasks + files declared at `workflow create` time

`workflow create --workflow <id> --title "<title>" --tasks '<json>'` creates the workflow with the full task plan including expected file paths. The workflow does NOT start until the plan is complete.

This mirrors how OpenSpec works: artifacts are declared before implementation begins. Storybook immediately shows the full plan as soon as `create` runs — all tasks visible as `pending` with their file lists.

```json
[
  {
    "id": "create-page",
    "title": "Create page component",
    "type": "component",
    "files": [
      "components/page/page.component.yml",
      "components/page/page.twig",
      "components/page/page.story.yml"
    ]
  }
]
```

Alternative: `--tasks-file <path>` accepted as alternative to inline JSON, to avoid shell escaping issues with long task lists.

Alternative considered: separate `add-task` / `add-file` commands called during execution — rejected because Storybook can't show the plan upfront and execution requires 4+ CLI calls per task instead of 2.

### Decision: Execution is just `validate` + `done` per task

Once the plan is created, execution for each task is:
1. Create the files (declared in the plan)
2. `workflow validate --workflow <name> --task <id>` — validates only files for this task
3. Fix errors, re-validate until exit 0
4. `workflow done --workflow <name> --task <id>` — marks task done, auto-archives if last

This is a 2-call execution path per task. No `add-task`, no `add-file` needed during execution.

### Decision: `workflow add-file` kept as escape hatch

For cases where a file path is not known at plan time (e.g. a file name derived from user input mid-workflow), `workflow add-file --workflow <name> --task <id> --file <path>` is still available. This registers the additional file and includes it in subsequent `validate --task` runs.

### Decision: Workflow does not start until the plan is ready

The AI MUST NOT create any files before `workflow create --tasks <json>` is called. The `!WORKFLOW_PLAN` marker in SKILL.md is the gate: the AI gathers all context (including any user dialog needed to determine component names, section counts, etc.), builds the full task JSON, calls `create`, and only then proceeds to file creation.

### Decision: Resume check via `workflow list --workflow <id>`

Returns all unarchived workflows for a given `--workflow` id. The AI reads this and either resumes the existing workflow or creates a new one. The CLI does not auto-resume — that decision belongs to the AI (and ultimately the user).

### Decision: New marker syntax in SKILL.md

```
!WORKFLOW_PLAN
← AI gathers context, asks user what's needed, builds task JSON
← calls: workflow create --workflow <id> --title "<title>" --tasks '<json>'
← workflow is now in planning status, Storybook shows full plan

!TASK <id>
← create the files (already declared in plan)
!TASK_END <id>    ← = validate --task + done --task

!WORKFLOW_DONE
```

The `!WORKFLOW_PLAN` marker explicitly separates the planning phase from execution. No file creation happens before this marker completes.

## Risks / Trade-offs

- **BREAKING CLI API** → All `debo-*` workflows using `!WORKFLOW_FILE` need updating. Mitigation: update all in the same PR.
- **AI must know all files at plan time** → Usually possible (component names and counts are known after user dialog). Escape hatch (`add-file`) covers edge cases.
- **Long JSON strings in CLI** → `--tasks-file <path>` alternative avoids shell escaping issues.

## Migration Plan

1. Implement new CLI commands in `workflow.ts` (keep old commands as deprecated aliases for one release)
2. Update `SKILL.md` with new marker syntax and rules
3. Update all `debo-*` workflow files to new marker syntax
4. Remove deprecated aliases in next release

## Open Questions

- Should `workflow list` support `--json` output? (Nice to have, not blocking)
