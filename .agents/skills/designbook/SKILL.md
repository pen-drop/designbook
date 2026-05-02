---
name: debo
argument-hint: "[vision|tokens|data-model|design-component|design-screen|design-shell|design-verify|sections|shape-section|sample-data|css-generate|import|sb] [--optimize]"
description: >
  Designbook design system. Use ALWAYS when creating, modifying, or
  deleting components, screens, scenes, design tokens, CSS, or any
  design system artifact — whether the user asks directly or the need
  arises during other work. Never create component files without this
  skill. Sub-commands: vision, tokens, data-model, design-component,
  design-screen, design-shell, sections,
  shape-section, sample-data, css-generate, import.
---

## Rules

> ⛔ **Read `resources/workflow-execution.md` immediately upon loading this skill.** It contains the binding execution rules (Rules 0–7) for all `debo` workflows. No stage may start before these rules are loaded.

> ⛔ **Never load or apply this skill for `opsx-*` or `openspec-*` workflows.** Those workflows manage their own artifact lifecycle (changes, specs, archives) and must not be wrapped in a designbook workflow.

> ⛔ **OpenSpec spec files are forbidden inputs.** Never read change files, delta specs, or main specs (`.agents/changes/`, OpenSpec paths) inside a `debo` workflow. Task context comes only from `.agents/skills/*/tasks/`, `.agents/skills/*/rules/`, and `.agents/skills/*/blueprints/`.

## Global Flags

| Flag | Visibility | Effect |
|---|---|---|
| `--optimize` | User-facing | After the workflow completes, review all created/modified artifacts and suggest concrete optimizations (performance, maintainability, accessibility, design-system consistency). Output as a numbered list. Do not apply changes — only suggest. |

Parse flags from `$ARGUMENTS` before dispatch. Flags are not sub-commands and do not affect workflow selection. Multiple flags can be combined as needed.

## Dispatch

Sub-command: **$ARGUMENTS[0]**

**If `$ARGUMENTS[0]` is a known sub-command**, directly load and execute `<concern>/workflows/$0.md` — no scanning, no matching.

**If the user mentions a designbook-managed file or artifact** (without an explicit sub-command), resolve the workflow from the file-to-workflow mapping below and start it automatically. This applies to all artifacts **except components** — component references still require explicit `/debo design-component`.

### File-to-Workflow Mapping

When the user references one of these files or topics in conversation, start the corresponding workflow:

| File / Artifact | Workflow | Path Pattern |
|---|---|---|
| vision | `vision` | `$DESIGNBOOK_DATA/vision.yml` |
| data-model | `data-model` | `$DESIGNBOOK_DATA/data-model.yml` |
| tokens | `tokens` | `$DESIGNBOOK_DATA/design-system/design-tokens.yml` |
| sections | `sections` | `$DESIGNBOOK_DATA/sections/**/*.section.scenes.yml` |
| sample-data | `sample-data` | `$DESIGNBOOK_DATA/sections/**/data.yml` |
| css, css-generate | `css-generate` | `$DESIGNBOOK_DIRS_CSS/*.src.css` + `$DESIGNBOOK_DATA/designbook-css-*/*.jsonata` |
| shell, design-shell | `design-shell` | design-system.scenes.yml + shell components |
| screen, design-screen | `design-screen` | section scenes + screen components |
| verify, design-verify | `design-verify` | visual testing of existing scenes against references |
| import | `import` | full design system import from a design reference |

**Detection rules:**
- Match by keyword in user message (e.g. "in der vision", "data-model anpassen", "tokens ändern")
- Match by file path if the user references a specific file under `$DESIGNBOOK_DATA/`
- If ambiguous, prefer the more specific workflow
- **Never auto-dispatch for components** — always require explicit `design-component` or `design-screen` sub-command

**If `$ARGUMENTS[0]` is an unknown or fuzzy argument**, or when user intent matches the design system domain:

1. Scan `**/workflows/*.md` within this skill for all `description` fields
2. Match `$ARGUMENTS` against each `description`
3. Dispatch to the closest matching workflow

**If `$ARGUMENTS[0]` is empty** (no argument given):

1. Scan `**/workflows/*.md` within this skill for all `title` and `description` fields
2. **Immediately output** a numbered list — do not ask first:
   ```
   Available workflows:
   1. <title> — <description>
   2. …
   ```
3. Invite the user to pick a number or type a sub-command

## Resources

- [workflow-execution.md](resources/workflow-execution.md) — Execution guide
- [cli-reference.md](resources/cli-reference.md) — CLI command index
