# Skill Authoring Reference

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

Keep SKILL.md as an index. Detail lives in task/rule files and resource docs.

## When to Use `tasks/`

When a skill covers multiple stage types, create one task file per stage. Stages are canonical — the filename must match the stage name exactly.

A skill might have multiple task files for different frameworks (same stage name, differentiated by `when`):

```
designbook-components-sdc/tasks/create-component.md    ← when: { frameworks.component: sdc }
designbook-components-react/tasks/create-component.md  ← when: { frameworks.component: react }
```

Only the matching one is loaded. No workflow changes needed to support new frameworks.

## Schema Validation

Validation runs automatically via the workflow CLI — do **not** invoke `ajv` or any schema validator directly.

```bash
workflow validate $WORKFLOW_NAME
```

One JSON line per registered file; `"valid": false` means fix and re-run. See `@designbook-workflow/SKILL.md` for the full fix loop.

Schemas must be **bundled within the skill directory**, not downloaded at runtime:

```
.agents/skills/designbook-components-sdc/
├── SKILL.md
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

Place `.jsonata` files under `$DESIGNBOOK_DIST/[skill-name]/` — not in the skill directory.

## Referencing Skill Resources

Use the **`@skillname/`** shorthand:

```
@designbook-components-sdc/resources/shell-generation.md
```

Resolves to `.agents/skills/designbook-components-sdc/resources/shell-generation.md`.

## Configuration

Load `designbook-configuration` skill — it resolves all `DESIGNBOOK_*` env vars from `designbook.config.yml`. Must be loaded before any skill that references config values.
