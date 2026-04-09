## Context

Currently, subagents write output files directly to `DESIGNBOOK_ROOT` as they execute. The file watcher in Storybook observes every write event — including empty placeholder files and files written in dependency-incorrect order — which causes HMR failures and CSS not refreshing.

The `touch-after-done` spec addresses file watcher re-triggering per task, but does not prevent Storybook from seeing intermediate/empty states during task execution.

## Goals / Non-Goals

**Goals:**
- Storybook never observes partial or empty files from an in-progress workflow
- Atomic "commit" of all workflow outputs to `DESIGNBOOK_ROOT` after the entire workflow completes
- No changes required to task files (`reads:` paths, env vars, skill logic)
- AI can reliably reference output files without computing paths

**Non-Goals:**
- Git-based workspace (deferred to v2)
- Per-wave atomicity (full workflow atomicity is sufficient)
- Intra-workflow reads of same-workflow outputs (confirmed not needed)
- Rollback / undo of a failed workflow

## Decisions

### Decision: `/tmp` directory over git worktree

**Chosen:** `/tmp/designbook-[workflow-id]/` plain directory.

**Alternatives considered:**
- *Git worktree*: would give automatic diff tracking and clean isolation. Rejected because `git worktree add ... HEAD` starts from the committed state, missing uncommitted `DESIGNBOOK_OUTPUTS_CONFIG` outputs that `reads:` depends on. A post-creation rsync step would be needed, adding complexity with no benefit — the list of written files is already known from `tasks.yml`.
- *Full workspace copy*: copying all of `DESIGNBOOK_ROOT` to `/tmp` — overkill, slow on large repos.

**Rationale:** `reads:` files are always pre-existing (from previous workflows), so no reads ever target the WORKTREE. Plain `/tmp` + two env vars is the simplest possible design.

---

### Decision: File IDs in `tasks.yml` instead of path transformation in instructions

**Chosen:** Each `files:` entry in `tasks.yml` gets an `id` field. Task instructions reference IDs. CLI owns path resolution.

```yaml
files:
  - id: component_yml
    path: /tmp/designbook-abc123/components/button/button.component.yml
  - id: component_twig
    path: /tmp/designbook-abc123/components/button/button.twig
```

**Alternatives considered:**
- *AI computes path from `write_root` field*: unreliable — AI might follow instruction-level env vars instead of computed paths.
- *CLI transforms paths transparently, AI sees final paths*: AI still needs to know which path maps to which file. Explicit IDs make this unambiguous.

**Rationale:** AI receives a lookup table. It never computes paths. Instructions say "write component definition to `component_yml`" — the ID maps to the WORKTREE path. If `DESIGNBOOK_WORKTREE = DESIGNBOOK_ROOT` (no workflow active), the path is the normal real path. Behavior is identical in both cases.

---

### Decision: Two env vars — `DESIGNBOOK_ROOT` and `DESIGNBOOK_WORKTREE`

**Chosen:** `DESIGNBOOK_ROOT` = always the real filesystem root (for `reads:`). `DESIGNBOOK_WORKTREE` = WORKTREE during workflow, equals `DESIGNBOOK_ROOT` outside of one.

**Rationale:** `reads:` and `files:` already have clearly different semantics. Separating them into two vars makes the distinction explicit and enforced at the CLI level without any AI-side logic.

---

### Decision: Bulk copy+touch after final workflow task, not per-task

**Chosen:** After the last task in the workflow marks `done`, `workflow done` copies all WORKTREE files to `DESIGNBOOK_ROOT` and touches them all at once.

**Replaces:** The existing `touch-after-done` per-task touch behavior.

**Rationale:** Per-task touch is meaningless if files are in WORKTREE (Storybook can't see them). The single bulk operation is both simpler and gives Storybook a fully consistent view.

## Risks / Trade-offs

- **`/tmp` space**: Large workflows writing many binary assets could fill `/tmp`. Mitigation: workflows write primarily YAML/twig/CSS — not a practical concern. Add a pre-flight check on available space if needed.
- **Crash during workflow**: If the process dies mid-workflow, WORKTREE is orphaned in `/tmp`. Mitigation: `workflow plan` registers the WORKTREE path in `tasks.yml`; a `workflow cleanup` command can gc orphaned directories.
- **Task file instruction updates**: All skill task files need instruction text updated to reference IDs. This is mechanical but broad. Mitigation: one-time migration, straightforward search-and-replace pattern.

## Migration Plan

1. CLI: add WORKTREE creation to `workflow plan`, path transformation, `id` field on files entries
2. CLI: add bulk copy+touch to `workflow done` (final task detection)
3. Skill task files: update instructions to reference file IDs (all `*.md` task files under `.agents/skills/`)
4. Docs: update `architecture.md` and `task-format.md`
5. Deploy: no migration needed for existing workflows — in-flight workflows complete with old behavior; new `workflow plan` calls get WORKTREE automatically
