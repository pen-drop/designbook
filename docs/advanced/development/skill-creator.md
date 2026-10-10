# Skill creator

`designbook-skill-creator` is the authoritative spec for authoring tasks, rules, blueprints, workflows, and `schemas.yml` under `.agents/skills/designbook/`, `.agents/skills/designbook-*/`, and the creator's own `rules/` and `resources/`. Skipping it produces files that mix HOW into WHAT, give rules their own params, or inline-duplicate schemas.

**You need:** the skill loaded (internal; `INSTALL_INTERNAL_SKILLS=1` for the skills CLI) and `writing-for-agents` available as documented in the skill.

1. Load skill-creator **before** creating or editing a guarded file.

**AI prompt**

```text
Load designbook-skill-creator. I will edit a task file. Load common-rules.md
and task-files.md first. Do not write HOW into the task.
```

2. Load the matching file-type rule plus `rules/common-rules.md` always:

| Creating or editing | Also load |
|---|---|
| `tasks/*.md` | `rules/task-files.md` |
| `blueprints/*.md` | `rules/blueprint-files.md` |
| `rules/*.md` | `rules/rule-files.md` |
| `schemas.yml` | `rules/schema-files.md` |
| `workflows/*.md` | `rules/workflow-files.md` |

3. Keep the template content model: workflow → stage → task (WHAT) / blueprint (overridable) / rule (hard). Shared types live in `schemas.yml` and are referenced. Validate with `resources/validate.md`.

**Done when:** every changed guarded file was written under the matching rule, and `designbook-gaia` was left alone if you only needed GAIA step prose (that plugin is outside this guardrail).

Part 2 (the TypeScript addon) uses `designbook-addon-skills`, not skill-creator. A worked blueprint override: [extend a skill](/extend/extend-a-skill).
