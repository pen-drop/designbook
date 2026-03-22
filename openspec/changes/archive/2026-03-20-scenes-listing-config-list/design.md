## Context

The `designbook-scenes` skill guides AI agents in generating `*.scenes.yml` files. Currently `scene-reference.md` is a single monolithic resource covering field tables, all entry types, and full YAML examples. The skill has no rule preventing agents from using `entity + records: []` for listing pages — a pattern that bypasses the `config: list` system entirely.

The `config-list-builder.ts` runtime already fully supports `config: list.*` nodes. The gap is entirely in skill authoring conventions and documentation.

## Goals / Non-Goals

**Goals:**
- Split `scene-reference.md` into focused, loadable resource files
- Establish `config: list.*` as the mandatory pattern for listing scenes
- Make `create-scene.md` generate correct listing scene templates by default
- Document the full `config: list` contract (data-model → sources → JSONata)

**Non-Goals:**
- No runtime code changes (`config-list-builder.ts` is already correct)
- No changes to `*.scenes.yml` file format or schema
- No changes to how existing scenes are rendered

## Decisions

### Split scene-reference.md into three files

`field-reference.md` — YAML field tables only (file-level and scene-level fields)
`entry-types.md` — all entry types (component, entity, records, scene-ref) with examples; explicitly marks `records` as demo-only, not for listing pages
`config-list.md` — full config:list documentation: syntax, data-model mapping, sources, JSONata bindings ($rows, $count, $limit), and when to use vs `entity`

**Why over keeping one file:** AI agents load resources per-task context. Smaller focused files mean the agent gets exactly what it needs. The current file mixes concerns that are relevant at different points.

### Rule file for listing pattern

Add `rules/listing-pattern.md` with `when.stages: [create-scene]`. The rule states: listing scenes SHALL use `config: list.*`, never `entity + records: []`. Records shorthand is only for component demos in isolation.

**Why a rule file over embedding in task:** Rule files are the canonical constraint mechanism. Embedding in the task file works but rules are more visible and composable.

### Move examples into task files

Full YAML examples (shell scene, section scene) move into `tasks/create-shell-scene.md` and `tasks/create-scene.md` respectively. Resources become reference, tasks become prescriptive.

## Risks / Trade-offs

- Splitting files means agents must load the right resource — mitigated by SKILL.md index staying accurate
- Existing `*.scenes.yml` files using `entity + records` for listings are not retroactively fixed — acceptable, this is authoring guidance not a validator
