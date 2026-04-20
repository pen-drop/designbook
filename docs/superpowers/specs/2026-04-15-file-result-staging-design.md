# File Result Staging & Flush

## Problem

File results with `path:` are currently documented to be written directly by the AI using the Write tool. The auto-detect path in `workflowDone` then reads the file back and validates it. For `.md` files this fails because the validator parses all files as YAML via `js-yaml`.

The direct engine already has a complete staging mechanism (`stashPath`, `writeFile`, `flush`, `onTransition`) that is underused. The `--data` path in `workflowDone` already serializes, writes via engine, and validates schema on raw data — but the AI instructions don't enforce this path.

## Design

### Three modes for file results

| Invocation | Schema validation | Write target | Flush |
|---|---|---|---|
| `--data` | raw data object | staging file (`.debo` suffix) | atomic, on stage transition |
| `--data --flush` | raw data object | final path (no staging) | immediate |
| `external: true` | file on disk at `done` | AI writes directly | n/a |

### Mode 1: `--data` (default)

The AI passes structured data as JSON. The CLI handles serialization, staging, and validation:

1. Schema validation (ajv) runs on the raw data object
2. `serializeForPath()` serializes to the target format (`.md` → `flattenToMarkdown`, `.yml` → `yamlDump`, `.json` → `JSON.stringify`)
3. `engine.writeFile()` writes to the staging path (`<path>.<workflowId>.debo`)
4. Semantic validators (if declared) run on the staging file
5. If validation fails → staging file stays, AI gets error, fixes data, retries via `--data`
6. On stage transition → `engine.flush()` renames all staging files to final paths atomically, then touches all files so Storybook's watcher picks them up in one batch

```bash
_debo workflow done --workflow $WORKFLOW_NAME --task <task-id> \
  --data '{"vision": {"product_name": "Leando", "description": "..."}}' \
  --summary "Created vision"
```

### Mode 2: `--data --flush`

Same as Mode 1, but writes directly to the final path — no staging suffix. Use when the file should be available immediately (e.g., single-task workflows, config files consumed by subsequent tasks).

```bash
_debo workflow done --workflow $WORKFLOW_NAME --task <task-id> \
  --data '{"vision": {...}}' --flush \
  --summary "Created vision"
```

### Mode 3: `external: true`

For files that cannot be written through the CLI (e.g., Playwright screenshots, binary files). The AI writes the file itself, then registers it:

```bash
_debo workflow result --task <task-id> --key <key> --external
```

The result declaration must have `external: true`:

```yaml
result:
  screenshot:
    path: $DESIGNBOOK_DATA/references/screenshot.png
    external: true
    validators: [image]
```

Auto-detect at `done` time reads and validates the file on disk.

## Changes

### 1. `workflow-execution.md` — Rewrite "Writing results" section

Replace the current file results documentation (Step 2b) with:

```markdown
**File results** (result keys with `path:`):
Pass all results — both file and data — as a single JSON object via `--data` on `workflow done`.
The CLI serializes to the target format, writes a staging file (`.debo` suffix), validates the
schema on the raw data, and runs semantic validators on the staging file. On stage transition,
the engine flushes all staging files to their final paths atomically.

To skip staging and write directly to the final path, add `--flush`:

\`\`\`bash
_debo workflow done --workflow $WORKFLOW_NAME --task <task-id> \
  --data '{"vision": {"product_name": "...", "description": "..."}}' --flush
\`\`\`

**External file results** (result declaration has `external: true`):
For files that cannot be written through the CLI (e.g. Playwright screenshots).
The AI writes the file directly, then registers via `workflow result --external`.

**Never** write file results directly with the Write tool — always use `--data` or `--data --flush`.
```

Update Step 2c accordingly — `--data` now carries both file and data results:

```markdown
- `--data '<json>'` — pass all results (file and data) as a single JSON object.
  The engine serializes file results to disk, validates all results against the
  merged schema, and marks the task done.
- `--flush` — write file results directly to the final path instead of staging.
```

Remove the sentence "File results at declared `path:` locations are auto-collected — no explicit registration needed."

### 2. `workflow.ts` — Guard auto-detect path

In the implicit file collection block (line 945), add a guard for non-external results:

```typescript
// ── 1.2: Implicit file collection — auto-detect files at declared paths ──
if (task.result) {
  for (const [key, resultEntry] of Object.entries(task.result)) {
    if (!resultEntry.path) continue;
    if (resultEntry.valid !== undefined) continue; // already processed

    // Only auto-detect external results — all others must go through --data
    if (!resultEntry.external) {
      throw new Error(
        `Cannot auto-detect file result '${key}' — use --data on workflow done to write file results. ` +
        `Only results with external: true support direct file writing.`
      );
    }

    // ... existing auto-detect logic for external results ...
  }
}
```

### 3. No other code changes needed

- `serializeForPath()` already handles `.md` → `flattenToMarkdown`
- `engine.writeFile()` already writes to staging path
- `engine.flush()` already renames atomically + touches files
- `engine.onTransition()` already calls flush at stage boundaries
- `validateResultEntry()` with `mode: 'data'` already validates schema on raw data
- The `--data` path in `workflowDone` already splits schema (on data) vs semantic (on file) validation

## Not in scope

- Changes to `workflowResult` function — it already supports `--flush` and engine staging
- Changes to `serializeForPath` or `flattenToMarkdown` — they work correctly
- Changes to `validateResultEntry` — the existing YAML parsing is correct for `.yml` files and for the `mode: 'data'` path
- Markdown-to-object parser — not needed; `.md` files are written via serialization, not parsed back
