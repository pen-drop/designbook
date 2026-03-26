---
when:
  backend: drupal
  stages: [designbook-data-model:intake, create-data-model]
---

# Drupal Data Model Rules


## Entity Types

Available entity types, their base fields, and section placement (`content` vs `config`) are defined in `entity-types/*.yml`. These schemas are loaded during intake and drive which entity types are available and which fields they require.

**Do NOT suggest `block_content` by default.** It is only appropriate when the `layout_builder` extension is active. Extension-specific entity types are introduced by their schema files (loaded via `when.extensions`).

## Extension-Aware Rules

Extension-specific entity types, fields, and `view_modes` templates are defined in dedicated rule files that load automatically when an extension is active. This rule file defines the base (no-extension) behavior only.

**How extension rules are loaded:**

- Rule files with `when: extensions: <id>` load automatically when that extension ID is in `DESIGNBOOK_EXTENSIONS`
- Extensions with a `skill:` field in `designbook.config.yml` inject a full skill as a `config_instruction` — appropriate for complex extensions like Paragraphs

**Known extension rule files in this skill:**
- `rules/layout-builder.md` — active when `extensions` contains `layout_builder`
- `rules/canvas.md` — active when `extensions` contains `canvas`

**Paragraphs** is an example of a skill-based extension — configure it with `skill: designbook-data-model-paragraphs` in `designbook.config.yml`. No rule file needed here.

## Field Naming Conventions

Base fields (defined in `entity-types/*.yml`) do **not** use a prefix. All custom fields **must** be prefixed with `field_`:

- `field_tags`, `field_media`, `field_subtitle` ✅
