---
name: research
description: Post-workflow review using Superpowers — audit loaded skill files, then fix via brainstorming and planning
---

# Research Flag

## What It Does

`--research` switches a `_debo` command into **research mode**. The workflow runs normally first. Afterwards, a structured audit reviews all loaded skill files against the 4-level model, then fixes are planned and implemented via Superpowers.

## Process

### Step 1 — Execute the workflow normally

The workflow runs as usual — all stages, tasks, rules, blueprints apply. The output is produced.

### Step 2 — Discover what was loaded

Read the archived workflow from `workflows/archive/<workflow-name>/tasks.yml`. The resolved entries contain the task files, rules, blueprints, and config instructions involved in this run.

### Step 2b — Collect tagged CLI log entries

Read `designbook/dbo.log` (JSONL, one entry per line) and keep only entries where `tagged: true`. When `--research` was set at skill invocation, every `_debo workflow …` CLI call during the workflow was invoked with `--log`, so every entry that belongs to this run is tagged.

Group the tagged entries by `cmd` and surface:

- **Errors** — any entry with an `error` field (YAML parse failures, schema violations, missing params, CLI bugs)
- **Retries** — the same `cmd` + same key args appearing multiple times in sequence (indicates the AI had to correct something)
- **Unresolved params** — `workflow create` responses with an `unresolved` field
- **Long-running calls** — entries with unusually high `duration_ms`

These observations feed into Step 3's audit table as the `Issues` column for the files that were loaded when the error occurred.

### Step 3 — Audit every loaded file

Read every file that was loaded during the run and verify each one against the skill model principles. This is a systematic audit — do not skip files.

For **each file**, check:

#### 3a. Type correctness

| File type | Must contain | Must NOT contain |
|-----------|-------------|-----------------|
| **Task** | Output declarations (`result:`, `params:`) | Style guidance, implementation details, framework-specific logic |
| **Rule** | Hard constraints, `when:` conditions, optional `extends:`/`provides:`/`constrains:` | Overridable suggestions, examples that could vary by integration |
| **Blueprint** | Overridable starting points, optional `extends:`/`provides:` | `constrains:`, absolute constraints that should be rules |

#### 3b. Domain responsibility

- **Core skill files** (`designbook/`) — Must be integration-agnostic. Flag if they contain framework-specific logic.
- **Integration skill files** — Must handle their specific concern. Flag if they duplicate core logic or reach into another integration's domain.
- **Cross-cutting references** — If a core task references external data, verify that the responsible integration skill has a matching rule loaded.

#### 3c. Loading correctness

- Were all relevant integration rules loaded? Cross-reference `when:` conditions against the active config.
- Were rules that **should** have been loaded actually loaded?
- Were rules loaded that **shouldn't** have been? (wrong `when` scope, outdated step names)

#### 3d. Duplication

- **Cross-file** — Do two files describe the same constraint or mapping?
- **Cross-layer** — Does a task repeat what a rule already enforces?
- **Cross-skill** — Do two integration skills handle the same concern?

#### 3e. Content coherence

- Does the file reference CLI commands or params that exist?
- Does it describe manual steps that the CLI handles automatically?
- Are `domain:` values current? (valid domain from taxonomy, no stale domains)
- Do `result:` schemas match the actual outputs being produced?

Output the audit as a table:

```
| File | Type | Domain | Issues |
|------|------|--------|--------|
| intake--tokens.md | task | core | ⚠ Missing `## Result:` section for data result |
| renderer-hints.md | rule | core | ✓ OK |
```

### Step 4 — Review with user

Present the audit table, then ask:

```
→ Was the output correct?
→ Was something missing or wrong?
→ Do the audit findings match your experience?
```

### Step 5 — Fix via Superpowers

Based on feedback:

1. **Analyze** — Use `superpowers:brainstorming` to work through what needs to change and design the fix
2. **Plan** — Use `superpowers:writing-plans` to create an implementation plan for the skill changes
3. **Implement** — Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to apply the changes

### Step 6 — Verify

After implementing fixes, verify via test workspace:

1. **Set up workspace** — `./scripts/setup-workspace.sh <name>` (creates or rebuilds from scratch)
2. **Re-run the workflow** — `/designbook <workflow> --research`
3. **Confirm zero friction** — the research pass should report no issues
4. **Use** `superpowers:verification-before-completion` before committing

Skill files are symlinked from the repo root — fixes are available immediately without rebuilding the workspace. Re-run `setup-workspace.sh` only to reset generated pipeline data.
