# Unified Sample Data — One Entity Pool, Section as a Tag

**Date:** 2026-06-21
**Status:** Design approved, ready for plan

## Problem

Sample data is currently stored **per section**: `$DESIGNBOOK_DATA/sections/{section_id}/data.yml`.
Each section directory holds its own mixed pool of records (canvas pages, nodes, taxonomy
terms, media). Records are selected by a fragile positional index (`record: N`) into a
bundle array.

This couples data to a single section and prevents reuse. The same entity record cannot
serve both a **section display** (a record rendered as part of a section/landing page) and
an **entity view display** (a single entity rendered in a view mode). It also makes the
positional `record: N` index brittle as records are added or reordered.

## Goal

One generalized pool of entity records, split per bundle, where each record carries a
generic `section` tag. A scene selects records from the pool with a JSONata predicate at
build time. The same record list serves section displays **and** entity view displays.

This is **not** canvas-specific — `canvas_page` is just one entity type in the pool.

## Decisions

| # | Decision |
|---|----------|
| Storage | One central `data/` directory, one file per `entity_type.bundle`. No per-section `data.yml`. |
| Record tag | Each record carries a stable `id` and a `__designbook.section` tag (string or array). |
| Section meaning | Generic scope tag. Untagged = global/shared. Serves section display and entity view display alike. |
| Selection | Pure JSONata predicate in `scenes.yml` (`select:`), evaluated at build time against the bundle array (`$`). Replaces positional `record: N`. |
| Multiplicity | No framework enforcement. JSONata result passed through as-is. Convention: append `[0]` for single (entity view display); omit for lists/views. |
| Tag predicates | Use the JSONata `in` operator so a string and a list match uniformly. |
| Migration | None. Existing on-disk artifacts are disposable (CLAUDE.md rule). Fixtures regenerated from scratch. |

## Architecture

### 1. Data storage — one pool, split per bundle

```
$DESIGNBOOK_DATA/data/
  node.doc.yml
  node.article.yml
  taxonomy_term.topic.yml
  media.image.yml
  canvas_page.landing_page.yml
  view.recent_articles.yml
```

- Each file contains **only the record array** for that bundle — no `content:`/`config:`
  wrapper.
- The loader determines the `content` vs `config` namespace by looking the bundle up in
  `data-model.yml` (which already declares both). If the bundle is not found in the data
  model → warn and skip.
- The loader merges all `data/*.yml` files into a single in-memory `SampleData` object of
  the existing shape (`{ content: { type: { bundle: [...] } }, config: { ... } }`), so the
  downstream `SampleData` contract is unchanged.

### 2. Record form — section as a generic tag

```yaml
# data/node.doc.yml
- id: "3"
  __designbook:
    section: section_a          # string, or [section_a, section_b] for shared records
  field_body: "<h2>Design Token Integration</h2><p>…</p>"
  field_topic: "1"
```

- `id` is the stable identifier (already present today).
- `__designbook` is a reserved metadata block on the record; `section` is its only field
  for now. The namespace avoids clashing with real entity fields.
- `section` may be a **string** (the common case, written by the default generator) or a
  **list** (shared records belonging to multiple sections).
- A record with no `__designbook.section` is global/shared — visible to any selector that
  does not filter on section.

### 3. Selection — pure JSONata at build time

The scene item references the bundle via `entity:` + `view_mode:` (unchanged) and selects
the record with a JSONata `select:` predicate. `record: N` is removed.

```yaml
# *.section.scenes.yml
scenes:
  - name: Docs
    items:
      # Single record (entity view display) — [0] guarantees one object
      - entity: node.doc
        view_mode: full
        select: "$['section_a' in __designbook.section and id='3'][0]"

      # List/view — no [0], mapping iterates the sequence
      - entity: view.recent_articles
        view_mode: default
        select: "$['section_a' in __designbook.section]"
```

- `$` is bound to the bundle's record array (the array under
  `content[entity_type][bundle]` or `config[entity_type][bundle]`).
- The predicate uses `in` so it works whether `__designbook.section` is a string or a list
  (JSONata treats a singleton as a one-element sequence).
- Evaluation happens in `entity-builder.ts` at **build time** (Node, via the Vite plugin
  transform) — the full pool and the `jsonata` dependency are both available there. The
  browser receives a fully resolved component tree; no data or JSONata at render time.
- The result of `select` flows into the existing `view_mode` mapping JSONata exactly as the
  positionally-picked record does today. Field mapping is unchanged.

## Affected components

### `scene-module-builder.ts` — `loadSampleData`

Replace section-path resolution (`sections/{sectionId}/data.yml` + global fallback) with:
read every `data/*.yml`, look each bundle up in the data model to place it under `content`
or `config`, and merge into one `SampleData`. The `firstSceneSection` parameter and the
`sections/(...)` id-regex are removed.

### `entity-builder.ts` — record selection

Replace the positional pick (`const recordData = entityData?.[record] ?? {}`) with JSONata
evaluation of the `select:` expression against the bundle array. The `record` field on the
node is removed; a `select` field (JSONata string) takes its place. The evaluated result is
passed to the `view_mode` mapping as before. If `select` is absent or resolves to empty,
emit the existing missing/empty placeholder.

### Sample-data skill (`designbook/sample-data`)

- `tasks/create-sample-data.md`: the `sample-data` result no longer writes
  `sections/{section_id}/data.yml`. It writes per-bundle files under `$DESIGNBOOK_DATA/data/`.
  The `section_id` param becomes the value written into each generated record's
  `__designbook.section`.
- `workflows/sample-data.md`: idempotency reads the existing per-bundle files in `data/`
  (not a per-section `data.yml`). Append-only semantics and record-count rules are unchanged,
  scoped per bundle file. The "Output Format" section is rewritten for the per-bundle layout
  and the `__designbook.section` tag.
- The Drupal integration rules (`designbook-drupal/sample-data/rules/*`) are largely
  unaffected — they still describe field-value shapes and the canvas `components` tree. Only
  the storage location and the added `__designbook` block change.

### Data validator

- Validate the `__designbook.section` shape (string or array of strings) where present.
- Validate that a scene's `select:` resolves against the pool (non-empty result); warn on
  empty. No "exactly one" rule — multiplicity is intentional.
- Existing hard errors (unknown entity type / bundle) and warnings (unknown field, missing
  required, broken reference) carry over, now evaluated against the merged pool.

### Fixtures

All fixtures under `fixtures/**/sections/*/data.yml` and the addon test fixtures are
regenerated into the new `data/` layout with `__designbook.section` tags and `select:`-based
scenes. No migration code.

## Out of scope

- Drupal export of the `__designbook.section` tag to an actual `entity_view_display` config
  entity. The tag is designed to make that possible later, but exporting it is a separate
  effort.
- Any change to the `view_mode` → JSONata mapping mechanism itself.
- A declarative (non-JSONata) selector sugar. Selection is pure JSONata by decision.

## Open questions

None. All design decisions resolved.
