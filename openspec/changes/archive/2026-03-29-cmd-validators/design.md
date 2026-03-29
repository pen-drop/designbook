## Context

The validation registry (`validation-registry.ts`) maps string keys to `ValidatorFn` functions. The `write-file` CLI command calls `validateByKeys()` after writing, passing the declared validator keys from the task frontmatter. Currently all validators are TypeScript functions registered at build time.

## Goals / Non-Goals

**Goals:**
- Allow shell commands as validators via `cmd:` prefix
- No rebuild required to add new validators
- Same UX: valid/invalid + error message

**Non-Goals:**
- Replacing existing TypeScript validators
- Async/streaming command output
- Timeout configuration (use system defaults)

## Decisions

### Decision 1: `cmd:` prefix convention

Validator keys starting with `cmd:` are treated as shell commands. The remainder after `cmd:` is the command template. `{{ file }}` is replaced with the absolute file path.

```yaml
validators:
  - "cmd:npx jsonata-w transform --dry-run {{ file }}"
```

**Why prefix over separate field:** Keeps the existing `validators: string[]` type. No schema change needed. Existing validators (`component`, `tokens`, etc.) continue to work.

### Decision 2: Execution semantics

- Command is executed via `child_process.execSync` with a timeout of 30 seconds
- Exit code 0 → valid
- Non-zero exit code → invalid, stderr captured as error message
- If stderr is empty on failure, use a generic "command failed with exit code N" message

### Decision 3: Implementation in validateByKeys

The `cmd:` check happens in `validateByKeys` before the registry lookup. If a key starts with `cmd:`, it runs the command directly instead of looking up a registered function. This keeps the registry clean — no "fake" entries needed.
