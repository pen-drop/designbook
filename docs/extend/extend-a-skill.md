# Extend a skill

Change one overridable starting point. Leave hard rules intact. Load [designbook-skill-creator](/advanced/development/skill-creator) before creating or editing any task, rule, blueprint, workflow, or `schemas.yml` under `.agents/skills/designbook/` or `.agents/skills/designbook-*/`.

**You need:** skill-creator loaded, a legal blueprint to copy, and a project config that already selects the parent integration.

1. Pick a blueprint, not a rule. Drupal's field-map starting point is `.agents/skills/designbook-drupal/data-mapping/blueprints/field-map.md` (`template: field-map`). Cardinality and image-field files under `data-mapping/rules/` are hard constraints.

**AI prompt**

```text
Load designbook-skill-creator. I want a project-local blueprint that overrides
the Drupal field-map starting point. Do not edit any rules. Follow
blueprint-files.md and common-rules.md. Show me the new file path and the
unchanged rule paths.
```

2. Author the replacement as a blueprint in the project or integration skills tree. Tasks stay WHAT. Shared types stay `$ref` to `schemas.yml`. Do not inline a second copy of a schema. Do not put HOW in a task file.

3. Keep the matching `trigger` / `filter` so the file still attaches to `map-entity` when `backend: drupal`. A more specific project file wins by declared-key specificity in `resolveFiles`; a rule with the same name in core is not yours to weaken.

4. Prove the hard rule still applies: `data-mapping/rules/field-cardinality.md` and `image-fields.md` must remain the cardinality and image constraints. If your blueprint contradicts them, rewrite the blueprint.

**Done when:** one blueprint file is added or replaced, skill-creator file-type rules were loaded first, and every `rules/` file you considered is unchanged.

For a new integration contribution, add files beside the existing plugin (for example Tailwind's `install/rules/tailwind-storybook.md`) rather than editing core rules.
