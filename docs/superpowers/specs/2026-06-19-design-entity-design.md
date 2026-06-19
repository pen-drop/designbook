# design-entity — Design

**Date:** 2026-06-19
**Status:** Draft

## Problem

Today the only way to see an entity-mapping rendered is to run the full
`design-screen` pipeline (reference → intake → component → sample-data →
entity-mapping → scene) and wrap the entity in a **section** scene. Two things
hard-couple an entity preview to sections:

1. Sample data lives in `sections/<id>/data.yml`.
2. The preview scene needs a `section:` field (or a `sections/<id>/` path) so the
   renderer can find that data (`scene-module-builder.ts:loadSampleData`).

We want a lightweight, **section-free** way to design and preview a single
entity view-mode mapping — mapping-focused, with self-contained dummy content,
rendered standalone in Storybook, and with the mapping itself visible.

## Goals / Non-goals

**Goals**
- New sub-command `/debo design-entity` that builds **one entity view-mode** per
  run: its JSONata mapping + co-located demo data + a standalone Storybook story.
- Demo content lives next to the mapping, shared per bundle.
- The rendered entity is shown **alone** (no shell, no section, no surrounding
  components).
- The JSONata mapping is **visible** (source + field-mapping table) in the
  Storybook Docs tab.
- Switch between demo records live via the Controls addon.

**Non-goals**
- No reference capture, polish, compare, or verify stages (that stays in
  `design-screen`).
- No section/shell scene files.
- No migration of existing artifacts (testing is from scratch — see CLAUDE.md).

## Key findings (grounded from the codebase)

1. **Global data fallback already exists.** `scene-module-builder.ts:105` loads
   `$DESIGNBOOK_DATA/data.yml` when a scene has no `section:` and is not under
   `sections/`. Section-free entity rendering is therefore feasible — but we go
   further and co-locate demo data with the mapping (below).
2. **Entity render flow is record → mapping → ComponentNode[].** `entity-builder.ts`
   locates `entity-mapping/<type>.<bundle>.<view_mode>.jsonata`, pulls record N
   from `ctx.sampleData.content[type][bundle]` (or `config`), evaluates the
   JSONata against that record, and returns nodes.
3. **Stories are produced by an indexer.** `preset.ts:experimental_indexers`
   matches `*.scenes.yml`, derives a `group` title, and emits one story entry per
   scene (`title = group + '/Scenes'`, `tags: ['scene','!autodocs']`). The story
   glob is `{sections,design-system}/**/*.scenes.yml` (`preset.ts:79`).
4. **Field mappings are already extractable.** `jsonata-mapping-analyzer.ts`
   exports `extractFieldMappings(source)` → `FieldMapping[]`
   (`{ field, component, target, type: 'prop'|'slot', conditional? }`). This is
   exactly what a mapping-docs table needs — no new analysis required.
5. **`map-entity` task already produces the JSONata file.** It is currently
   triggered only by `design-screen:map-entity`; the trigger must be extended to
   `design-entity:entity-mapping`.

## Architecture

Three on-disk artifacts per bundle, all under `$DESIGNBOOK_DATA/entity-mapping/`:

```
entity-mapping/
  node.article.full.jsonata     ← mapping: record → ComponentNode[]   (one per view_mode)
  node.article.teaser.jsonata
  node.article.demo.yml         ← demo records, per bundle, shared by all view_modes
```

- **Mapping** (`<type>.<bundle>.<view_mode>.jsonata`) — existing format, pure
  JSONata, no data baked in.
- **Demo data** (`<type>.<bundle>.demo.yml`) — **new**. Same format as
  `sample-data` (`content:`/`config:` namespacing), but scoped to one bundle, ~3
  records. Idempotent across runs (later view-mode runs reuse/extend it).
- **Story** — **not** authored as a `scenes.yml`. The addon synthesizes stories
  from the demo file plus its sibling `.jsonata` files (below).

### Render chain (standalone)

```
indexer finds entity-mapping/node.article.demo.yml
  → globs siblings node.article.*.jsonata   → view_modes [full, teaser]
  → emits one story per view_mode:
      title = "Entities/node/Article", name = "full"
vite transform of demo.yml → CSF:
  for each view_mode: pre-resolve EVERY demo record through its mapping
    → records[] = [ resolve(rec0), resolve(rec1), resolve(rec2) ]
  story arg `record` = select over [0..N-1], default 0
  render(args) → render records[args.record], alone (no shell/section)
  story parameters inject: jsonata source text + extractFieldMappings() table
  story tag: autodocs enabled (Docs tab shows source + field table)
```

### Storybook sidebar

```
Entities
├── node
│   ├── Article
│   │   ├── full        (Canvas | Docs)
│   │   └── teaser      (Canvas | Docs)
│   └── Event
│       └── full
└── media
    └── Image
        └── default
```

Title derivation from filename `node.article.full.jsonata`:
`title = "Entities/node/Article"` (bundle Title-Cased: `article` → `Article`),
story `name = "full"`.

### Mapping docs (Docs tab)

Per view-mode story, the standard Storybook **autodocs** Docs tab shows:
1. The raw JSONata source for that `<type>.<bundle>.<view_mode>.jsonata`.
2. A field-mapping table from `extractFieldMappings()`:

   | field | component | target | kind | conditional |
   |---|---|---|---|---|
   | title | ui:card | title | prop | — |
   | field_body | ui:card | body | slot | — |
   | field_image | ui:media | src | prop | yes |

3. The live render (with the `record` control).

This intentionally **breaks the `!autodocs` pattern** that scenes use — entity
stories opt into autodocs so the mapping is visible.

## Workflow (skill side)

New sub-command `/debo design-entity`. One view-mode per run.

Stages: `intake → component → entity-mapping → demo-data`

| Stage | Task | New / Reuse |
|---|---|---|
| intake | `intake--design-entity.md` | **new** — pick `entity_type.bundle` + `view_mode` from the data model; plan components. No section/shell/reference logic. |
| component | `create-component` | reuse |
| entity-mapping | `map-entity` | reuse — extend its trigger to include `design-entity:entity-mapping`. Intake outputs a one-element `entity_mappings` array. |
| demo-data | `create-entity-demo.md` | **new** — trimmed `create-sample-data`: generate ~3 records for the single bundle → `entity-mapping/<type>.<bundle>.demo.yml`; idempotent (read existing, append missing). Reuses the field-value generation rules from the `sample-data` concern. |

`design-entity` lives in the `design/` concern (alongside `design-screen.md`,
`design-component.md`, `design-shell.md`).

> **Implementation note:** per CLAUDE.md, `designbook-skill-creator` MUST be
> loaded before authoring `design-entity.md`, `intake--design-entity.md`,
> `create-entity-demo.md`, or editing `map-entity.md`'s trigger.

## Addon changes (TypeScript)

`packages/storybook-addon-designbook/src/`:

1. **`preset.ts`**
   - Extend the story glob to include `entity-mapping/*.demo.yml`.
   - Add an indexer matching `\.demo\.yml$` under `entity-mapping/`: for each
     demo file, glob sibling `<type>.<bundle>.*.jsonata`, emit one story entry
     per view-mode with `title = "Entities/<type>/<Bundle>"`, `name = view_mode`,
     `tags` including `autodocs`.
2. **vite-plugin** — transform `entity-mapping/*.demo.yml` → a CSF module:
   - For each view-mode, pre-resolve **every** demo record through the mapping
     (reuse the entity-builder evaluation path) → `records[]`.
   - Emit a story per view-mode with `argTypes.record` as a `select` over record
     indices (default 0) and `render(args)` returning `records[args.record]`.
   - Inject `parameters.docs` payload: JSONata source text + `extractFieldMappings()`
     result for the docs table.
3. **`entity-builder.ts`** — when an entity node originates from an auto-story,
   source the record from the co-located `entity-mapping/<type>.<bundle>.demo.yml`
   instead of (or in addition to) `ctx.sampleData`.

## Open questions

None outstanding — all resolved during brainstorming.

## Decisions (resolved)

1. Deliverable = mapping + standalone live preview; no section. ✔
2. Demo data co-located: `entity-mapping/<type>.<bundle>.demo.yml`, per bundle, shared. ✔
3. Auto-stories from `demo.yml` + sibling `.jsonata` (addon indexer); no `scenes.yml`. ✔
4. Sidebar `Entities/<type>/<bundle>` › view_mode (story name). ✔
5. `record` exposed as a Controls select over all demo records (default 0); vite
   pre-resolves all records through the mapping. ✔
6. `design-entity` creates missing components. ✔
7. One view-mode per run. ✔
8. Mapping visible via standard autodocs Docs tab: JSONata source + field-mapping
   table (`extractFieldMappings`). ✔
