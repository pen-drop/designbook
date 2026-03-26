## Context

`designbook.config.yml` already has a simple `extensions: [layout_builder]` string-array (spec: `extensions-config`). This is exposed as `DESIGNBOOK_EXTENSIONS` env var. However:

- The format carries no metadata (no URL, no skill reference)
- No workflow asks the user which extensions they use
- The data model intake proposes entities without knowing active extensions
- Extension-specific rules live in one monolithic Drupal rule file with comments, not as loadable skill files

## Goals / Non-Goals

**Goals:**
- Upgrade `extensions` format to objects with optional `url` and `skill` fields
- Introduce a `debo-setup` workflow that captures extensions early
- Data model intake reads extensions and uses `url` (fetch) + `skill` (load) to inform suggestions
- Each extension can optionally declare a skill — loaded automatically when that extension is active

**Non-Goals:**
- Auto-discovering installed modules from a live Drupal/WP instance
- Validating that declared extensions are actually installed
- Writing extension-specific skills for every known module (that's follow-up work)

## Decisions

### 1. Extension object format

```yaml
extensions:
  - id: canvas
    url: https://www.drupal.org/project/experience_builder   # optional: AI fetches for context
    skill: designbook-data-model-canvas                       # optional: auto-loaded in data-model stages
  - id: layout_builder
    skill: designbook-data-model-layout-builder
  - id: address
    url: https://www.drupal.org/project/address
    # no skill needed: AI uses url + general knowledge
  - id: paragraphs
    url: https://www.drupal.org/project/paragraphs
    skill: designbook-data-model-paragraphs
```

Backward-compatible: plain strings (`extensions: [layout_builder]`) still accepted, treated as `{id: layout_builder}`.

**Why object over string:** URL and skill are metadata that can't fit in a plain string. Objects are the only path to extensibility.

**Why optional skill:** Not every extension needs a dedicated rule file. For minor modules (address, pathauto) the AI's general knowledge + URL is sufficient. Skills are for extensions that significantly change entity/field structure.

### 2. Skill auto-loading mechanism

When a workflow stage loads, the CLI checks `extensions` in config. For each extension with a `skill` declared, that skill is added to the `config_instructions` of the current stage — same mechanism as other config-driven skills.

This means: no changes to the rule loading pipeline. Extensions piggyback on the existing `config_instructions` system.

### 3. `debo-setup` workflow

A new lightweight workflow that runs before `debo-data-model`. It:
1. Asks: "Which modules/extensions does your project use? Provide a URL to their docs if helpful."
2. For each extension mentioned: stores `{id, url}` in `designbook.config.yml`
3. User can also add a `skill` reference if they know a dedicated skill exists

The intake task file lives at `.agents/skills/designbook-setup/tasks/intake.md`.

### 4. Data model intake becomes extension-aware

The intake task reads `extensions` from config (via `designbook.config.yml` which is always available). For each extension:
- If `skill` is set → skill is auto-loaded via config_instructions (see Decision 2)
- If `url` is set → AI fetches and reads the page for context before proposing entities
- If only `id` is set → AI uses built-in knowledge about the extension

The existing `drupal-data-model.md` rule drops its static layout-system comments and instead documents the dynamic resolution pattern.

## Risks / Trade-offs

- **URL fetching reliability**: If a module's docs URL is down or changes, the AI falls back to built-in knowledge. [Risk: stale URLs] → No validation needed; fetching is best-effort.
- **Skill naming collisions**: Extension `skill` field references skill by ID. If the skill doesn't exist, it's silently ignored. [Risk: silent misconfiguration] → Document in config schema that skill must match a real skill ID.
- **Backward compatibility**: Plain string extensions must still work. [Risk: regression] → Config loader handles both formats; tested via existing `extensions-config` scenarios.

## Migration Plan

1. Config loader updated to accept both string and object format
2. `debo-setup` workflow added — optional, not required before existing workflows
3. Existing `DESIGNBOOK_EXTENSIONS` env var behavior preserved (uses `id` values)
4. New `DESIGNBOOK_EXTENSION_SKILLS` env var exposes comma-separated skill IDs for active extensions with skills declared
