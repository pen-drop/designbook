## Context

The entity-mapping system currently routes through a decision tree: `entity_type == view?` → `compose-entity`, `view_mode == full && composition == unstructured?` → `compose-entity` with an extension-specific rule, otherwise → `map-entity`. This routing is invisible in the data model — it's hidden in AI skill files and driven by two global config concepts (`composition` and `extensions`). Authors have no single place to look and understand how their entity will be mapped.

The AI (skill) layer is the only thing that needs to change. The runtime (`entity-builder.ts`) loads `entity-mapping/{entity_type}.{bundle}.{view_mode}.jsonata` regardless of how it was generated — it is unaffected.

## Goals / Non-Goals

**Goals:**
- Replace `composition` and `extensions` with a per-view-mode `template` key in data-model.yml
- Single `map-entity` stage that reads the template and loads the matching skill file
- Skills register templates by dropping `entity-mapping/{template}.md` into their directory
- Config declares available templates with descriptions (so the AI and authors know what's available)

**Non-Goals:**
- No runtime changes — entity-builder.ts stays as-is
- No changes to the JSONata file format or output structure
- No changes to `view-mode-jsonata` convention (filenames stay `{entity_type}.{bundle}.{view_mode}.jsonata`)
- No migration of existing projects (breaking change, no backwards compat shims)

## Decisions

### Template key per view_mode, not per bundle

`composition` was a bundle-level flag, meaning all view modes shared the same strategy. In practice, `teaser` is always field-mapped even on an "unstructured" bundle. With `template` per view_mode, each mode declares its own strategy explicitly — no more "non-full view modes of unstructured bundles are treated as structured" special-case.

```yaml
content:
  node:
    article:
      fields: { ... }
      view_modes:
        teaser:
          template: field-map
        full:
          template: layout-builder
```

**Why not keep `composition` and add `template` as override?** Two concepts doing the same job is the current problem. One replaces the other cleanly.

### Template instructions via rules with `when: template:` condition

Skills register templates as rule files using the existing rule discovery mechanism — no new directory pattern. The `map-entity` stage reads the template key from data-model, then loads the matching rule:

```
designbook-scenes/rules/field-map.md       → when: stages: [map-entity], template: field-map
designbook-scenes/rules/view-entity.md     → when: stages: [map-entity], template: view-entity
designbook-scenes-drupal/rules/layout-builder.md → when: stages: [map-entity], template: layout-builder
designbook-scenes-drupal/rules/canvas.md   → when: stages: [map-entity], template: canvas
```

`template` is a new `when` condition key that the rule loader evaluates against the current view mode's template value.

**Why rules instead of a new `entity-mapping/` directory?** Rules already have a discovery mechanism, a `when` condition system, and a loading convention. Introducing a second pattern for the same purpose adds unnecessary complexity. Rules are constraints/instructions — that's exactly what template files are.

### Config declares available templates with descriptions

```yaml
entity_mapping:
  templates:
    field-map:
      description: "Structured field mapping — entity fields drive component selection"
    layout-builder:
      description: "Drupal Layout Builder — sections and block references define the layout"
    canvas:
      description: "Drupal Canvas — flat component tree authored in the CMS"
    view-entity:
      description: "View entity — no record input, entity refs declared inline"
```

The config is the authoritative list of what's available in the project. The AI reads this during the data-model dialog to offer valid choices. Without it, the AI would have to scan skills to discover templates.

**Why description in config, not in the template file?** The config is read during the dialog (before any files are generated). Template files are loaded during `map-entity` execution. The description needs to be available early for the AI to explain choices to the author.

### `compose-entity` stage removed, `map-entity` is the only stage

`compose-entity` existed to handle two special cases: view entities and unstructured full view modes. Both are now just templates (`view-entity`, `layout-builder`, `canvas`). No routing needed.

## Risks / Trade-offs

- **Breaking change for existing data-model.yml files** — any project using `composition: unstructured` or `extensions` must update. No migration shim. → Acceptable: no external users yet.
- **Template file must exist in a skill** — if a project configures a template that has no matching `.md` file, `map-entity` silently has no instructions. → Mitigation: `collect-entities` should warn if a template is not registered in any skill.

## Migration Plan

1. Update `data-model.schema.yml` — add `view_modes` to bundle, remove `composition`
2. Update config schema / SKILL.md — add `entity_mapping.templates`, remove `extensions`
3. Update `designbook-scenes` skill — remove `compose-entity` task, update `map-entity`, update `collect-entities`
4. Add template files to `designbook-scenes` and `designbook-scenes-drupal`
5. Update `designbook-data-model` skill — guide authors through `view_modes` + template during dialog
6. Update existing test fixtures in the integration package

No rollback needed — AI-layer-only change, runtime is unaffected.
