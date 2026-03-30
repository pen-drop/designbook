---
name: designbook-stitch
disable-model-invocation: true
user-invocable: false
description: Stitch design tool integration — MCP-based reference resolution and intake screen selection. Use when design_tool.type is stitch.
---

# Designbook Stitch

Stitch-specific rules for resolving design references via Stitch MCP and enhancing intake with screen selection.

## Rules

- `rules/stitch-reference.md` — Resolves `type: stitch` references via `mcp__stitch__get_screen`
- `rules/stitch-intake.md` — Enhances intake with Stitch screen listing via MCP
