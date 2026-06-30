---
name: audit-criteria
description: Audit criteria for files loaded during a research-mode workflow run. Referenced by research.md to generate audit tables after each iteration.
---

# Audit Criteria

Systematic file-level review applied after a workflow completes. Output is a Markdown table (one row per loaded file) with an `Issues` column that flags violations of the 4-level skill model.

## When applied

- After each `debo-test research` case run within an iteration: reads tasks.yml + dbo.log digest, produces `research-runs/<slug>/iterations/<N>/cases/<case>/audit.md`.
- After a research run terminates: produces `research-runs/<slug>/final-audit.md`.

## Inputs

| Input | Source |
|---|---|
| Resolved file list | `<workspace>/<DATA>/workflows/archive/<workflow>/tasks.yml` — tasks, rules, blueprints, schemas |
| Per-file content | Read each path |
| Friction signals | Output of `digestLog($DATA/dbo.log)` |

## Audit dimensions

For each loaded file, check:

### Type correctness

| File type | Must contain | Must NOT contain |
|---|---|---|
| Task | Output declarations (`result:`, `params:`) | Style guidance, framework-specific logic |
| Rule | Hard constraints, `when:` conditions, optional `extends:`/`provides:`/`constrains:` | Overridable suggestions, examples that vary by integration |
| Blueprint | Overridable starting points, optional `extends:`/`provides:` | `constrains:`, absolute constraints that should be rules |

### Domain responsibility

- Core skill files (`designbook/`) — must be integration-agnostic. Flag if they contain framework-specific logic.
- Integration skill files (`designbook-*/`) — must handle their specific concern. Flag if they duplicate core logic or reach into another integration's domain.

### Loading correctness

- Were all relevant integration rules loaded for this run? Cross-reference `when:` conditions against the active config.
- Were any rules loaded that shouldn't have been? (wrong `when` scope, outdated step names)

### Duplication

- Cross-file: do two files describe the same constraint or mapping?
- Cross-layer: does a task repeat what a rule already enforces?
- Cross-skill: do two integration skills handle the same concern?

### Content coherence

- Does the file reference CLI commands or params that exist?
- Does it describe manual steps that the CLI handles automatically?
- Are `domain:` values current (valid taxonomy, no stale domains)?
- Do `result:` schemas match the actual outputs being produced?

### Friction correlation

For each error/retry/unresolved entry in the friction signal, identify which loaded file is responsible (by matching the `cmd` to the file that triggered the call). Surface in the `Issues` column.

## Output shape

```
| File | Type | Domain | Issues |
|------|------|--------|--------|
| intake--tokens.md | task | core | ⚠ Missing `## Result:` section for data result |
| renderer-hints.md | rule | core | ✓ OK |
| ... | ... | ... | ... |
```

Save to `research-runs/<slug>/iterations/<N>/cases/<case>/audit.md` (one per case run).

The final-audit (post-loop) writes the same shape to `research-runs/<slug>/final-audit.md`.
