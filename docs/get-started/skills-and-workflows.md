# Skills and workflows

A **skill** is a loadable unit of work for the agent. A **workflow** is a named sequence the skill owns. You invoke the workflow; the agent loads the matching skill and starts with `intake <workflow>`.

The core skill is `debo` (plugin `designbook`). Its index lists workflows such as `install`, `vision`, `tokens`, `data-model`, `sections`, `shape-section`, `sample-data`, `css-generate`, `extract-reference`, `design-component`, `design-screen`, `design-entity`, `design-shell`, `design-verify`, `sync-verify`, `import`, `sync-to`, and `sb`.

## Four-level vocabulary

Core Designbook work uses four levels:

| Level | Role |
|---|---|
| Workflow | Named plan of stages (`skills/<workflow>/workflows/`) |
| Stage | Group of tasks (the task filename) |
| Task | WHAT to produce, never HOW |
| Blueprint or rule | Blueprint = overridable starting point. Rule = hard constraint |

Integrations add tasks, blueprints, and rules that match `trigger` and `filter` frontmatter against the project config. Installing skill files is not the same as enabling their contributions. Configuration selects them. See [How extensions work](/extend/how-extensions-work).

## Two exceptions to keep straight

- **GAIA** (`designbook-gaia`) ships workflow-step prose for GAIA tickets. It sits outside the four-level model. See [GAIA](/integrations/gaia).
- **Figma** is a capture skill at `.agents/skills/designbook-figma`. It is not a marketplace plugin.

`--optimize` on the core skill asks for optimization suggestions after completion. Apply those changes only when you separately request them.

Authoring new files under `.agents/skills/designbook/` or `designbook-*` requires [designbook-skill-creator](/advanced/development/skill-creator) first.
