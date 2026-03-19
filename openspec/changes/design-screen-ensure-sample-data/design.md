## Context

`debo-design-screen` currently relies on `debo-sample-data` having been run separately before design begins. Sample data is marked `optional: true` in the workflow reads, meaning design proceeds silently with empty data. The root problem: sample data requirements are only knowable from the design intent — specifically from the components being built and the view configs they render.

The key dependency chain that was missing:

```
View config (config.view.*) → items_per_page → content record count
```

Without this link, the AI generating sample data uses a fixed heuristic (3 records) rather than the actual number needed for the design.

## Goals / Non-Goals

**Goals:**
- `debo-design-screen` is self-sufficient: it generates whatever sample data is missing
- View config entities are generated with meaningful fields (`items_per_page`, `sort_field`, etc.)
- Content record count derives from `items_per_page` in view config
- Existing sample data is preserved and only extended, never overwritten

**Non-Goals:**
- Replacing `debo-sample-data` as a standalone workflow (still useful for manual/incremental updates)
- Cross-section reference validation
- Generating sample data for sections without a scenes file

## Decisions

### Decision: New `ensure-sample-data` stage in `debo-design-screen`

Position: after `collect-entities`, before `map-entity`.

**Why here:** `collect-entities` already determines which entity types and view modes are needed. At that point all information is available to compute data requirements. Running before `map-entity` ensures data exists when entity mapping starts.

**Alternative considered:** Keep as a separate prerequisite with a hard `reads:` block. Rejected because the section ID isn't known until the dialog runs, making pre-dialog reads checks impossible for section-scoped data.

### Decision: View config drives content record count

When a view entity (e.g. `view.docs_list`) is part of the scene:
1. Read or generate `config.view.<bundle>` with `items_per_page`
2. Count existing content records for the entity type the view targets
3. If count < `items_per_page`: generate the difference

**Why:** The view's `items_per_page` is the only authoritative source for "how many records are needed". Everything else is a guess.

### Decision: Task file in `designbook-sample-data` skill, not a new skill

The `ensure-sample-data` stage reuses the `designbook-sample-data` skill. A new task file `tasks/ensure-sample-data.md` handles the "check first, generate only missing" logic, distinct from `tasks/create-sample-data.md` which generates from scratch.

**Why:** Same domain (sample data), same output format, same validator. Splitting into a new skill would duplicate the format rules.

## Risks / Trade-offs

- **View target entity not in data model** → `collect-entities` should already validate this; the stage can emit a warning and skip generation for unknown targets
- **items_per_page not deterministic** → default to 6 if not yet set in view config; the AI can adjust based on design context (grid columns, layout)
- **Existing data conflicts** → stage only appends records, never replaces; may result in duplicate-style records if run multiple times

## Open Questions

- Should view config (`items_per_page`) be surfaced to the user for confirmation, or auto-generated silently?
