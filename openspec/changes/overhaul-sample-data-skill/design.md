## Context

The `designbook-sample-data` skill generates `data.yml` files from `data-model.yml`. Currently `create-sample-data.md` has a hard split: a regular loop for content entities and a special `view_configs` branch for config (view) entities. `format.md` documents entity references incorrectly for content fields (shows object form; actual format is string ID). Generated files include a `_meta` block that matches no schema.

The `view-entity` spec defines a separate lightweight convention (JSONata-based, no data-model entry, no sample data) — this change does not affect that convention. This change only concerns entities explicitly declared in `data-model.yml` under `content:` or `config:`.

## Goals / Non-Goals

**Goals:**
- Single uniform generation loop — same logic regardless of `content:` or `config:` bucket
- Two-pass ordering: content entities generated first, config entities second (config templates may reference content record indices)
- `views` template rule handles `rows[]` generation, removing all special-case code from the task
- `format.md` accurately documents both entity reference styles
- Intake reads `data-model.yml` directly — no inference via scenes files
- No `_meta` generated

**Non-Goals:**
- Runtime changes — skill documentation only, no TypeScript changes
- JSONata-based `view-entity` convention — unaffected
- New config entity types beyond `view` — designed for, not implemented now

## Decisions

### Decision: Two-pass loop, not merged

Content and config passes run sequentially rather than in one merged pass.

**Why:** Config templates (specifically `views`) need to reference `record: N` indices into already-generated content bundles. A merged single pass would require forward-reference resolution. Two explicit passes are simpler and match the mental model.

**Alternative considered:** Single topologically-sorted pass. Rejected — adds ordering complexity for no practical benefit, since config entities always depend on content entities by definition.

### Decision: `views` template rule, not task-level logic

The `rows[]` generation for view entities becomes a `sample_template: template: views` rule, identical in mechanism to the existing `canvas` template.

**Why:** Makes config entity generation extensible without touching the task. Adding `block` support later means adding a template rule, not modifying `create-sample-data.md`. Consistent with how `canvas` works today.

**Alternative considered:** Keep `view_configs` param and special logic. Rejected — every new config type would require new task-level branching.

### Decision: Content entity references = string IDs only

Content entity reference fields store the target record's `id` string directly (`field_shelter: shelter-1`). The `{type: entity, entity_type, bundle, view_mode, record: N}` object form is ONLY used inside template-generated structures (view `rows[]`, canvas slots).

**Why:** This is what the validator (`data.ts`) actually checks — it compares reference field values against target record `id` strings via `String(rv)`. The object form in `format.md` was aspirational/wrong and would cause validation warnings if followed.

### Decision: Intake drives from data-model.yml, not scenes

The intake stage reads `data-model.yml` to enumerate which entities need sample data, rather than inferring needs from scenes files.

**Why:** The data-model is the authoritative contract. Every entity/bundle defined there needs sample data regardless of which scenes currently use it. Scenes-based inference under-generates when new scenes are added later.

## Risks / Trade-offs

- **`view` entries in data-model.yml are optional** — projects using the JSONata `view-entity` convention don't need `config.view` at all. The skill must not error when `config:` is absent from data-model.yml. → Mitigation: treat missing `content:` or `config:` sections as empty, same as today.

- **Two-pass ordering is implicit** — if a future config entity type has no content dependencies, the two-pass order is harmless but slightly wasteful. → Acceptable trade-off for clarity.

## Open Questions

- Should the `views` template rule live in `designbook-sample-data` or `designbook-drupal/sample-data/` (since Drupal Views is a Drupal concept)? Current lean: in `designbook-sample-data` as a built-in, since the `config.view` pattern is used across projects.
