## Context

Task files are loaded by the AI during workflow execution. The AI currently has to infer what context files to read from the task body prose. There's no machine-readable declaration of dependencies.

The `files:` field is used by `workflow create --tasks` to register which output files a task produces. Bare paths like `data-model.yml` are currently interpreted as relative to `$DESIGNBOOK_DIST` by convention — but that convention is implicit and not visible to the AI or human reading the file.

## Goals / Non-Goals

**Goals:**
- Task files self-document both inputs (`reads:`) and outputs (`files:`) with unambiguous paths
- Missing input file → immediate, actionable error with workflow name
- No behavior change when files exist — just richer context for the AI

**Non-Goals:**
- Not adding runtime file-checking to the CLI (`workflow create` doesn't change)
- Not enforcing dependency ordering at the CLI level — that's the AI's job
- Not handling cross-section references or glob patterns in `reads:`

## Decisions

**`reads:` as structured list, not plain paths**: Each entry needs both `path` and `workflow` to produce the actionable error message. A plain path list would require a separate lookup table. Inline structure is self-contained.

**env var in `path`, not resolved path**: `$DESIGNBOOK_DIST/data-model.yml` is more readable and portable than an absolute path. The AI resolves it via `eval "$(node ... config)"` which is already the established pattern.

**`workflow` field is the `/debo-*` name without slash**: Consistent with how workflow names appear in frontmatter elsewhere. The AI formats it as `/debo-data-model` in the error message.

**`files:` prefix is required, not optional**: Bare paths are banned. Either `$DESIGNBOOK_DIST/` or `$DESIGNBOOK_DRUPAL_THEME/` must appear. This makes the root unambiguous for both the AI and `workflow create`.

## Risks / Trade-offs

- [Verbosity] `reads:` adds lines to task files. Mitigated — tasks with no dependencies simply omit the field entirely.
- [Stale reads:] If a workflow is renamed, `workflow:` references go stale. Low risk — workflow renames are rare and the field is just a hint, not enforced by CLI.
