---
name: designbook-stitch
disable-model-invocation: true
user-invocable: false
description: Stitch design tool integration — MCP-based reference resolution and intake screen selection. Loaded via extensions: [stitch] in designbook.config.yml.
---

# Designbook Stitch

Stitch-specific rules for resolving design references via Stitch MCP and enhancing intake with screen selection.

## Rules

- `rules/stitch-reference.md` — Resolves `type: stitch` references via `mcp__stitch__get_screen`
- `rules/stitch-tokens.md` — Imports designTheme as token proposals during tokens intake
- `rules/stitch-guidelines.md` — Analyzes screen HTML/screenshots for guidelines proposals during guidelines intake
