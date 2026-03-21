---
stage: map-entity
params:
  entity_type: ~
  bundle: ~
  view_mode: ~
reads:
  - path: $DESIGNBOOK_DIST/data-model.yml
    workflow: debo-data-model
files:
  - $DESIGNBOOK_DIST/entity-mapping/{{ entity_type }}.{{ bundle }}.{{ view_mode }}.jsonata
---

# Map Entity

Creates a JSONata expression file for an entity view mode. The template declared in `data-model.yml` determines what to generate.

## Process

1. **Read the template** — look up `data-model.yml` → `content.{entity_type}.{bundle}.view_modes.{view_mode}.template`
2. **Read the settings** (optional) — `view_modes.{view_mode}.settings` — pass as context to the template rule
3. **Load the matching rule** — scan `skills/*/rules/*.md` for a rule with `when: stages: [map-entity], template: {template}`. If no match found, stop and report: `❌ No rule found for template: {template}`
4. **Generate the JSONata file** — follow the rule's instructions, using the settings as additional context

## Output

```
$DESIGNBOOK_DIST/entity-mapping/{{ entity_type }}.{{ bundle }}.{{ view_mode }}.jsonata
```

## Key Rules

- One file per `entity_type.bundle.view_mode` combination
- Provider prefix must be resolved at generation time (never leave as placeholder)
- Reference fields that point to other entities emit `type: entity` nodes — `map-entity` is called again for the referenced entity + view_mode
