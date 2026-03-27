# Skill Authoring Reference

## SKILL.md Contract

`SKILL.md` is the **always-loaded entry point** — it loads before the AI knows which stage to execute. Per the [skill-creator progressive disclosure model](https://github.com/anthropics/claude-code), designbook-* skills follow a stricter sub-convention:

**Allowed in SKILL.md:**
- Frontmatter (`name`, `description`)
- One-paragraph skill overview
- Links to `tasks/`, `rules/`, `resources/` files
- Small reference material: schema diagrams, valid value tables, format specs

**Not allowed in SKILL.md:**
- Execution instructions (step-by-step procedures, CLI commands to run)
- AI rules with if/then branching (Rule 0, Rule 1, etc.)
- "Load X skill" directives
- Config-loading or env-var setup instructions

**The test:** if removing a section would prevent execution → it belongs in a task or rule file. If it's pure reference → it may stay.

**Target size:** ~40 lines for designbook-* SKILL.md files.

| Content type | Destination |
|---|---|
| AI execution rules | `rules/<name>.md` (omit `when.stages` for global rules) |
| CLI reference, YAML format specs | `resources/<topic>.md` |
| Output structure, architecture docs | `resources/<topic>.md` |
| Schema reference | `resources/schema-reference.md` |
| Config reference | `resources/config-reference.md` |

## SKILL.md Structure

Every `SKILL.md` follows this template:

```markdown
---
name: [skill-name]
description: [one-line description]
---

# [Skill Title]

[Brief overview — what this skill creates/validates.]

## Task Files

- [create-[stage].md](tasks/create-[stage].md) — [what it creates]

## Rules

- [rule-name.md](rules/rule-name.md) — [when it applies]

## Resources

- [topic.md](resources/topic.md) — [what it contains]
```

## When to Use `tasks/`

When a skill covers multiple stage types, create one task file per stage. Stages are canonical — the filename must match the stage name exactly.

A skill might have multiple task files for different frameworks (same stage name, differentiated by `when`):

```
designbook-drupal/components/tasks/create-component.md    ← when: { frameworks.component: sdc }
designbook-components-react/tasks/create-component.md  ← when: { frameworks.component: react }
```

Only the matching one is loaded. No workflow changes needed to support new frameworks.

## Schema Validation

Validation runs automatically via the workflow CLI — do **not** invoke `ajv` or any schema validator directly.

```bash
workflow validate $WORKFLOW_NAME
```

One JSON line per registered file; `"valid": false` means fix and re-run. See `@designbook/resources/workflow-execution.md` for the full fix loop.

Schemas must be **bundled within the skill directory**, not downloaded at runtime:

```
.agents/skills/designbook-drupal/components/
├── SKILL.md (at root: .agents/skills/designbook-drupal/SKILL.md)
└── metadata.schema.json    # ✅ Bundled
```

> ⛔ **NEVER** download schemas at runtime via `curl` or similar.

## Data Transformation

When a skill transforms YAML/JSON into another format, use [`jsonata-w`](https://github.com/christianwiedemann/jsonata-w):

```bash
npx jsonata-w transform <expression-file.jsonata>
```

Each `.jsonata` file is self-contained with an embedded config block:

```jsonata
/**
 * @config {
 *   "input": "./path/to/input.yml",
 *   "output": "./path/to/output.css"
 * }
 */
( /* Your JSONata expression */ )
```

Place `.jsonata` files under `$DESIGNBOOK_OUTPUTS_CONFIG/[skill-name]/` — not in the skill directory.

## Referencing Skill Resources

Use the **`@skillname/`** shorthand:

```
@designbook-drupal/components/resources/shell-generation.md
```

Resolves to `.agents/skills/designbook-drupal/components/resources/shell-generation.md`.

## Configuration

The `designbook` skill Phase 0 bootstrap (from `resources/workflow-execution.md`) bootstraps `$DESIGNBOOK_CMD` and all `DESIGNBOOK_*` env vars from `designbook.config.yml`. This runs before any workflow command.
