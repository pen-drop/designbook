## Context

When the AI agent creates component files via the Write tool, Storybook's file watcher (`awaitWriteFinish` in `.storybook/main.js`) picks up the initial create event. Due to a race condition, the watcher sometimes reads incomplete content, causing broken renders. A manual `touch` on the files triggers a second watcher event with complete content, fixing the issue.

Currently this must be done manually by the AI agent after writing files. The `workflow done` command already has access to the task's `files[]` list and knows when a task is complete — it's the natural place to trigger a file touch.

## Goals / Non-Goals

**Goals:**
- Automatically touch all task files after `workflow done` succeeds
- Eliminate the need for manual `touch` commands in AI workflows

**Non-Goals:**
- Changing the file watcher configuration in Storybook
- Touching files after `workflow validate` (validation is read-only, files may still change)
- Adding new CLI flags or options

## Decisions

**Touch in `workflowDone()` after status update, before archive check.**

In `workflow.ts`, after the task status is set to `done` and before the all-tasks-complete check, iterate `task.files` and call `utimesSync()` on each file that exists on disk. This uses the existing `task.files[]` array — no new data structures needed.

Using `utimesSync()` (update access/modification time) rather than writing to the file, since we only need to trigger the watcher, not modify content.

**Why not in validate?** Validate is a read-only operation. Files may still be edited between validate and done. Touching after done is the right moment — the task is confirmed complete.

## Risks / Trade-offs

- **Minimal performance cost** → `utimesSync` is a single syscall per file, negligible even for many files
- **Files deleted between validate and done** → Already handled: `workflowDone()` checks file existence and throws if files are missing. Touch only runs after that check passes, so all files are guaranteed to exist.
