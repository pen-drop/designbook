## 1. CLI — New Commands

- [x] 1.1 Add `workflow list --workflow <id>` command: scan `workflows/changes/` for dirs matching `<id>-*`, print names newest-first
- [x] 1.2 Update `workflow create` to accept `--tasks '<json>'` and `--tasks-file <path>`: parse JSON array, write tasks with file lists into `tasks.yml`
- [x] 1.3 Add `workflow validate --task <id>` flag: when provided, scope validation to files declared for that task only
- [x] 1.4 Add `workflow done --workflow <name> --task <id>` command: mark task done, auto-archive if last task
- [x] 1.5 Add `workflow add-file --workflow <name> --task <id> --file <path>` command: append file to task's file list (escape hatch)

## 2. CLI — Breaking Changes

- [x] 2.1 Remove `--task "<id>:<title>:<type>"` flag from `workflow create` (tasks now via `--tasks` JSON)
- [x] 2.2 Remove `workflow update --files` / positional-arg form; print deprecation warning if old form is detected
- [x] 2.3 Update CLI command registration in `cli.ts` for all new/changed commands

## 3. Vite Plugin — Remove Defunct Middleware

- [x] 3.1 Remove `/__validate` middleware from `vite-plugin.ts` (validation owned by CLI; endpoint was already unused — "kept for backwards compat")

## 4. SKILL.md — New Marker Syntax & Rules

- [x] 4.1 Rewrite marker syntax section: `!WORKFLOW_PLAN` gate, `!TASK` / `!TASK_END` execution blocks, `!WORKFLOW_DONE`
- [x] 4.2 Add Rule 0 (resume check): `workflow list` before `workflow create`, ask user to continue or start fresh
- [x] 4.3 Add Rule 0.5 (standalone check): when `$WORKFLOW_NAME` unset, ask user if they want tracking
- [x] 4.4 Rewrite Rule 1 (`!WORKFLOW_PLAN`): AI gathers full context, builds task JSON with all files, calls `workflow create --tasks` once — no files created before this
- [x] 4.5 Rewrite Rule 2 (`!TASK` / `!TASK_END`): create declared files → `validate --task` → `done --task`; cover loop scenario and `add-file` escape hatch
- [x] 4.6 Update Rule 3 (`!WORKFLOW_DONE`) to match new command API
- [x] 4.7 Update integration pattern diagram and examples in SKILL.md

## 5. Workflow Files — Update Markers

- [x] 5.1 Update `.agents/skills/designbook-data-model/SKILL.md` `!WORKFLOW_FILE` → `!WORKFLOW_PLAN` + `!TASK`/`!TASK_END`
- [x] 5.2 Update `.agents/workflows/debo-design-shell.md` markers
- [x] 5.3 Update `.agents/workflows/debo-design-tokens.md` markers
- [x] 5.4 Update `.agents/workflows/debo-data-model.md` markers
- [x] 5.5 Update `.agents/workflows/debo-sample-data.md` markers
- [x] 5.6 Update `.agents/workflows/debo-sections.md` markers
- [x] 5.7 Update `.agents/workflows/debo-vision.md` markers
- [x] 5.8 Update remaining `debo-*` workflow files (grep for `!WORKFLOW_FILE`)
