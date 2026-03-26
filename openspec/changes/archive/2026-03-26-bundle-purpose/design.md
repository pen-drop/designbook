## Context

Rules in the designbook-drupal skill currently identify "special" bundles via field-level markers (`sample_template.template: canvas`, `sample_template.template: layout_builder`). This is indirect — the rule must inspect a field to understand what the bundle is. With `purpose` on the bundle itself, all stages can read intent directly.

The `when:` frontmatter mechanism filters rule files at stage/extension level (global per run). Purpose is bundle-specific — it varies per bundle within the same run. Therefore purpose logic belongs **inside rule content**, not in `when:` frontmatter.

## Goals / Non-Goals

**Goals:**
- `purpose` is a first-class optional property on bundles in data-model.yml
- Rules read bundle.purpose inline and apply conditional logic
- layout-builder and canvas sample rules migrate from field `sample_template` trigger to bundle `purpose` trigger
- Intake explicitly asks for purpose when creating a bundle

**Non-Goals:**
- New workflow stages (no `fulfill-purpose` stage)
- Frontmatter filtering by purpose (not possible — purpose is per-bundle, not per-run)
- Replacing `sample_template` on simple fields (formatted-text, link, image stay as-is)
- Enforcing a fixed set of purpose values (open string — rules document what they respond to)

## Decisions

### 1. `purpose` is stored in data-model.yml on the bundle

```yaml
content:
  node:
    landing_page:
      purpose: landing-page
      title: Landing Page
      fields: ...
      view_modes:
        full:
          template: layout-builder
```

Purpose is visible to any stage that reads data-model.yml — sample-data, entity-mapping, validation.

### 2. Purpose logic is inline in rule content, not frontmatter

Rules are loaded per stage + extension (as today). Inside the rule, conditional sections handle different purposes:

```markdown
## If bundle has `purpose: landing-page`
Set `view_modes.full.template: layout-builder`.
All other view modes: `template: field-map`.

## If bundle has no purpose or other purpose
Apply standard field-map template to all view modes.
```

### 3. Sample rules migrate from field-trigger to bundle-trigger

`sample-layout-builder.md` currently says "apply when `sample_template.template: layout_builder`". With this change it says "apply when bundle has `purpose: landing-page` and `layout_builder` extension is active". The `layout_builder__layout` field no longer needs `sample_template` — the bundle purpose is sufficient.

Same for `sample-canvas.md` → triggered by `purpose: landing-page` + canvas extension.

### 4. Simple field sample_templates unchanged

`sample_template` on individual fields (formatted-text, link, image, etc.) is NOT replaced by purpose. Purpose is a bundle-level concept; field-level sample templates remain the mechanism for per-field data generation.

## Risks / Trade-offs

- **Existing data-model.yml files without purpose**: rules must handle the no-purpose case gracefully — fall back to current behavior
- **Open string values**: no enum enforcement on purpose — rules document what they respond to. Typos won't error, just won't match any rule.
