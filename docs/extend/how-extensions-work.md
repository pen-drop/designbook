# How extensions work

Core Designbook (`debo`) owns workflows, stages, and component creation. Project and integration skills add files that match the current config. The agent still starts every intake with `intake <workflow>`.

## Core versus integration

| Kind | Location | Role |
|---|---|---|
| Core | `.agents/skills/designbook/` | Workflows and shared builder |
| Integration plugin | `.agents/skills/designbook-drupal`, `designbook-css-tailwind`, `designbook-stitch`, `designbook-vue` | Tasks, blueprints, rules filtered by config |
| Capture skill | `.agents/skills/designbook-figma` | Figma observations after extract-reference matches `figma` |
| Test harness | `.agents/skills/designbook-test` | Fixture runs; internal |
| GAIA | `.agents/skills/designbook-gaia` | GAIA workflow-step skills; **not** the four-level model |

Marketplace plugins are listed in `.claude-plugin/marketplace.json`. Figma is absent from that list.

## Tasks, blueprints, rules

- **Task** — WHAT to produce. Never HOW. Shared schemas stay in `schemas.yml` and are referenced, not copied.
- **Blueprint** — overridable starting point (directory layout, naming, markup guidance).
- **Rule** — hard constraint. Integrations must not override it.

Matching uses YAML frontmatter `trigger:` and `filter:` against runtime context and project config (`resolveFiles` in `planning-sources.ts`). A Stitch rule with `filter: extensions: stitch` appears only when `extensions` includes `id: stitch`.

## Installed versus enabled

Copying a skill into `.agents/skills/` makes it discoverable. `extensions`, `backend`, and `frameworks.*` in `designbook.config.yml` decide whether its contributions enter a workflow. Removing `stitch` from `extensions` drops Stitch intake rules even if the skill files remain on disk. The walkthrough is in [configuration](/extend/configuration).
