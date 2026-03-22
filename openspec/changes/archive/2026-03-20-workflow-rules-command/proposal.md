ma## Why

Rule loading in AI workflows currently depends on the AI proactively scanning `.agents/skills/*/rules/*.md` — a prose-based instruction that is easy to skip. Skills cannot reliably enforce their rules at dialog time, which breaks the plugin model where skills hook into workflows without explicit registration.

## What Changes

- New CLI subcommand `workflow rules --stage <stage>` that discovers, filters, and outputs rule content ready for AI consumption
- Rule discovery is recursive across all installed skills
- Matching uses `when.stages` (array-contains) + `when.<config-key>` against resolved config values
- All `${VARIABLE}` references in output are resolved recursively
- Config-level rules from `designbook.config.yml → workflow.rules[<stage>]` are appended
- Rule 2 in `workflow-execution.md` is replaced with a single CLI command invocation

## Capabilities

### New Capabilities
- `workflow-rules-command`: CLI command that scans, filters, resolves, and outputs rule content for a given workflow stage

### Modified Capabilities
- `workflow-execution`: Rule 2 (Dialog Bootstrap) changes from prose-based scanning to a single `workflow rules` CLI invocation

## Impact

- `packages/storybook-addon-designbook/src/cli.ts` — new `workflow rules` subcommand
- `.agents/skills/designbook-workflow/rules/workflow-execution.md` — Rule 2 rewritten
- `.agents/skills/designbook-workflow/resources/cli-reference.md` — new command documented
