## Context

Currently, workflow state is split across two mechanisms:
1. **Directory position**: `workflows/changes/` (running) vs `workflows/archive/` (complete)
2. **File contents**: `started_at` / `completed_at` timestamps + per-task status (pending/in-progress/done)

There is **no planning phase** — workflows start immediately. File registration is **manual**: each workflow/skill must call `workflow update --files` directly. The **Workflow Tracking section** sits at the bottom of each workflow as boilerplate. The **Panel** shows only two states: ⚡ (active) and ✅ (archived).

A new requirement emerged: workflows should distinguish:
- **Planning**: defined, not yet started
- **Running**: active work
- **Completed**: finished

The change must also **auto-register files** (removing manual `--files` calls) and **enforce validation as a hard gate** (can't mark task done until files validate).

## Goals / Non-Goals

**Goals:**
- Add explicit `planning | running | completed` status field to `WorkflowFile`
- Auto-transition status: planning → running (first files), running → completed (all done)
- Replace manual file registration with declarative `!WORKFLOW_FILE` markers + AI rules
- Make validation a blocking step: files must validate (exit 0) before task done
- Update Panel to show 📋/⚡/✅ icons matching the three statuses
- Refactor all debo-* workflows to use the new marker system
- Update designbook-* skills to include `!WORKFLOW_FILE` markers for consistency

**Non-Goals:**
- Change the existing `pending/in-progress/done` task status values
- Modify the CLI interface (workflow create/update commands stay the same)
- Migrate or auto-update old workflows — they continue to work as-is (backwards compatible)
- Create new abstractions; keep the system simple and AI-driven

## Decisions

**Decision 1: Status field on WorkflowFile**
- Add `status?: 'planning' | 'running' | 'completed'` to `WorkflowTaskFile` interface
- **Why**: Explicit, queryable state. Easy to render in the Panel. Decouples status from directory position (future flexibility).
- **Alternative considered**: Keep status implicit (directory position). Rejected — requires moving files on state change, less clear.

**Decision 2: Auto-transitions via CLI**
- `workflowCreate` always sets `status: 'planning'`
- `workflowUpdate` with `--files` checks if first files are being registered → auto-set `status: 'running'`
- `workflowUpdate` with `--status done` on final task → auto-set `status: 'completed'` + archive
- **Why**: No external triggers needed. Status transitions are implicit in normal CLI usage. No surprises.
- **Alternative considered**: Explicit `workflow set-status` command. Rejected — adds ceremony, violates DRY (would need manual call every time).

**Decision 3: Marker system is AI-only, not technical**
- `!WORKFLOW_FILE <task-id>: <path>` and `!WORKFLOW_DONE` are markers in the markdown file
- The AI (Claude) reads these markers and knows to call the corresponding CLI commands
- **Why**: Simple, no fs hooks or interceptors needed. Works everywhere (Shell, CI/CD, other AI assistants). Easy to document.
- **Alternative considered**: Node.js fs hooks to auto-intercept file writes. Rejected — ties to specific runtime, harder to document/understand.

**Decision 4: Validation is a hard gate**
- After `!WORKFLOW_FILE`, immediately run `workflow validate`
- If exit != 0: AI must fix the specific errors, re-run validate, repeat until exit 0
- **Only then** mark task done and continue
- **Why**: Prevents silent failures. Forces issues to be resolved before moving forward. Clear contract.
- **Alternative considered**: Soft validation (warn but allow). Rejected — doesn't catch real problems.

**Decision 5: YAML frontmatter for workflow metadata**
- Workflows will use standard YAML front matter (`---` blocks) to declare:
  ```yaml
  workflow:
    title: Design Tokens
    tasks:
      - id: create-tokens
        title: Create design tokens
        type: tokens
  ```
- **Why**: Standard Markdown convention. Already used in the codebase. Clear, structured, parseable.
- **Alternative considered**: Inline markers like `!WORKFLOW_META workflow=...`. Rejected — less standard, harder to parse.

## Risks / Trade-offs

**Risk: Backwards compatibility with old workflows**
- Old workflows (without markers and YAML frontmatter) won't auto-transition status
- Mitigation: New status field defaults to nil/computed from directory position. Existing workflows continue working. When old workflow is updated → auto-upgrade its status field.

**Risk: Marker documentation clarity**
- AI-driven rules are harder to debug than technical hooks
- Mitigation: Comprehensive AI Rules section in designbook-workflow/SKILL.md with examples. Clear error messages if validation fails.

**Risk: Refactoring all debo-* workflows is scope creep**
- 13 workflows to update, plus ~8 skills
- Mitigation: Changes are mechanical (YAML frontmatter + marker insertion). Can FF through all of them. Worth it for consistency.

**Trade-off: Status field is optional**
- Makes migration easier but complicates Panel logic (must handle nil status)
- Mitigation: Panel logic treats nil status as "legacy; compute from directory". Soon all workflows will have it.

## Migration Plan

**Phase 1 (immediate):**
1. Add `status` field to `WorkflowTaskFile` interface
2. Update `workflowCreate`, `workflowUpdate` to handle status transitions
3. Update Panel to render status with icons (📋/⚡/✅)

**Phase 2 (immediate, parallelizable):**
4. Add `## AI Rules` section to designbook-workflow/SKILL.md
5. Refactor all 13 debo-* workflows to use YAML frontmatter + markers
6. Remove `## Workflow Tracking` sections from those workflows

**Phase 3 (immediate, low priority):**
7. Add `!WORKFLOW_FILE` markers to ~8 designbook-* skills for consistency

**Rollback:** Old workflows continue to work (status computed from directory). Remove status field from interface if needed (though not necessary).

## Open Questions

1. **Parallel file registration**: If a task produces multiple files (e.g., `.component.yml`, `.twig`, `.story.yml`), should each have its own `!WORKFLOW_FILE <task-id>: <path>` marker, or one marker with multiple files? → Decision: One marker per file for clarity and independent validation tracking.

2. **Validation per file or per task**: Should each file be validated independently, or should all files in a task be validated together before marking done? → Decision: All files in a task validated together (one `workflow validate` call).
