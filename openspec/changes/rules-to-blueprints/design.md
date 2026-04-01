## Context

The blueprint system (`matchBlueprintFiles`) globs `skills/**/blueprints/*.md`, filters by `when` conditions, and deduplicates by `type:name` with priority. Currently only `type: component` exists. Extending to new types requires no code changes — only new blueprint files and updated task instructions.

14 rule files across 3 skills define overridable structure that should use blueprint dedup:

| Current location | Count | New type |
|---|---|---|
| `designbook-drupal/data-model/entity-types/rules/` | 6 | `entity-type` |
| `designbook-drupal/data-mapping/rules/` | 4 | `data-mapping` |
| `designbook-css-tailwind/rules/` | 2 | `css-mapping`, `css-naming` |
| `designbook-css-daisyui/rules/` | 2 | `css-mapping`, `css-naming` |

## Goals / Non-Goals

**Goals:**
- All 14 rule files become blueprints with priority-based override
- Consuming tasks read structure from `task.blueprints[]` instead of implicitly loaded rules
- Project skills can override any of these via `priority: 20`

**Non-Goals:**
- Changing blueprint resolution code
- Converting rules that are pure conventions/guidelines (SDC conventions, renderer hints, etc.)
- Changing the content of any structure definition

## Decisions

### 1. Blueprint type names

| Type | Name examples | Rationale |
|---|---|---|
| `entity-type` | `node`, `media`, `view` | Maps 1:1 to Drupal entity type identifier |
| `data-mapping` | `field-map`, `canvas`, `layout-builder`, `views` | Maps 1:1 to template name in `designbook.config.yml` |
| `css-mapping` | `tailwind`, `daisyui` | Maps 1:1 to `frameworks.css` value |
| `css-naming` | `tailwind`, `daisyui` | Same — naming conventions per CSS framework |

### 2. File location: flat in each skill's `blueprints/`

All blueprints go flat into their skill's `blueprints/` directory. The `type` field distinguishes them. `matchBlueprintFiles` globs `skills/**/blueprints/*.md` (not recursive), so subdirectories won't work.

File naming convention: `{name}.md` for entity-types and data-mappings, `css-mapping.md` and `css-naming.md` for CSS (since `name` is the framework).

Conflict: `designbook-drupal/blueprints/` will have both component and entity-type blueprints. No problem — `type` field differentiates.

### 3. Priority: 10 for all integration skills

All 14 files get `priority: 10` (integration level), matching existing component blueprints.

### 4. `when` conditions

| Type | `when` fields |
|---|---|
| `entity-type` | `backend: drupal`, `steps: [create-data-model]`, optional `extensions` |
| `data-mapping` | `steps: [map-entity]`, `template: <name>` (kept from current rules) |
| `css-mapping` | `frameworks.css: <fw>`, `steps: [generate-jsonata, generate-css]` |
| `css-naming` | `frameworks.css: <fw>`, `steps: [create-tokens]` |

Note: data-mapping rules currently use `template:` in `when` — this works because blueprint `when` matching uses the same logic as rule `when` matching.

### 5. Task updates: minimal

Each consuming task adds one instruction line: "Read blueprints from `task.blueprints[]` filtered by `type: <type>`." The task body content stays the same.

## Risks / Trade-offs

- **[Intake access lost]** Entity-type rules currently match `designbook-data-model:intake` — as blueprints they won't. → Mitigation: intake is a user interview that doesn't need structured entity-type data. Similarly, `css-naming` currently matches `designbook-tokens:intake` — intake asks about colors/fonts, not naming conventions.
- **[Flat directory]** `designbook-drupal/blueprints/` will have ~13 files (3 component + 6 entity-type + 4 data-mapping). → Acceptable, all distinguishable by filename.
- **[`template:` in when]** Data-mapping blueprints use `template: field-map` etc. in their `when` condition. This requires the template value to be in the resolution context at plan time. → Already works: `matchBlueprintFiles` receives the full stage config.
