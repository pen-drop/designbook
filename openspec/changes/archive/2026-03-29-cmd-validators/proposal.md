## Why

Validators today are hardcoded TypeScript functions in `validation-registry.ts`. Adding a new validator requires writing TypeScript code, importing it, and rebuilding the addon. This makes it impossible for skill authors to define validation for their file types without modifying the addon package.

The immediate use case: `.jsonata` files that generate CSS need validation — `jsonata-w transform --dry-run` can verify the transformation succeeds without writing output. But there's no way to plug this in without a TypeScript validator.

## What Changes

- **`cmd:` validator prefix** — validator keys starting with `cmd:` are interpreted as shell commands. The command receives the file path as `{{ file }}`. Exit code 0 = valid, non-zero = invalid, stderr = error message.
- **Example:** `validators: ["cmd:npx jsonata-w transform --dry-run {{ file }}"]`

## Capabilities

### New Capabilities
- `cmd-validators`: Shell-command-based validators triggered via `cmd:` prefix in validator keys

### Modified Capabilities
- None — existing validators continue to work unchanged

## Impact

- `packages/storybook-addon-designbook/src/validation-registry.ts` — handle `cmd:` prefix
- `.agents/skills/designbook/css-generate/tasks/generate-jsonata.md` — use `cmd:` validator for `.jsonata` files
