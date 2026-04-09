## MODIFIED Requirements

### compare-markup

References: `openspec/specs/ai-driven-extraction/spec.md`

All requirements from the main spec apply. Three-phase extraction model, extraction spec format, JSON output format, severity classification, check + issues via CLI, storage layout.

### compare-screenshots

Creates check via `story check` (status: open), adds issues via `story issues --add` with `source: screenshots`. Same issue format as extraction issues.

### polish

Reads open issues via `story issues --open`. Receives individual issue as iteration item (`each: issues`). Updates resolved issues via `story issues --update`.

### verify

Re-evaluates after recapture. Updates issues via `story issues --update` with `result: pass|fail`. Closes check via `story check` with `status: done`.

### design-verify workflow

Polish stage changes from `each: checks` to `each: issues`. Test stage keeps `each: checks`. `story issues --open` provides iteration items.

### CLI: story check

Gains `status` field (open/done) and `result` field (pass/fail/null). `--checks-open` filters on `status != done`.

### CLI: story issues (NEW)

New command for managing issues on checks:
- `--add --json '[...]'` — add issues to a check
- `--check <key>` — filter by check
- `--open` — filter to open issues only
- `--update <index> --json '{...}'` — update a single issue

### meta.yml schema

`reference.checks` entries gain: structured `issues` array (via `story issues`), `status` field (open/done), `result` field (pass/fail/null). New path convention: `stories/{storyId}/extractions/{bp}--{name}`.
