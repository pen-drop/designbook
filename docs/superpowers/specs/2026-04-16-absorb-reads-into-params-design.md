# Absorb `reads:` into `params:` with `path:` Extension Field

Follow-up to the Task Schema JSON Schema Compliance change. Makes the task I/O model symmetric: `result:` has outputs with/without `path:`, `params:` now has inputs with/without `path:`.

## Problem

`reads:` is a separate top-level frontmatter array that declares file inputs. It duplicates the concept that `params:` already handles — declaring task inputs. The asymmetry:

- **Outputs:** `result:` properties — with `path:` (file) or without (data)
- **Inputs:** split across `params:` (CLI values) and `reads:` (file inputs)

`reads:` is purely declarative — the runtime never processes it. Only the AI agent reads it to know which files to load.

## Decision

Absorb every `reads:` entry into `params:` as a property with `path:` extension field. Remove `reads:` entirely. Breaking change — all 27 task files are migrated.

## New Format

### File-Input Params (with `path:`)

```yaml
params:
  type: object
  required: [reference_dir, vision]
  properties:
    reference_dir: { type: string }
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      workflow: /debo-vision
      type: object
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
```

Two param classes, distinguished by `path:`:

| | CLI Params | File-Input Params |
|---|---|---|
| `path:` | absent | present |
| Source | `--params` / engine | AI reads from disk |
| Required? | in `required:` array | in `required:` array (= file must exist) |
| Optional? | not in `required:`, has `default:` | not in `required:` (= file may not exist) |

### Extension Fields on Params

| Field | Purpose |
|-------|---------|
| `path:` | File/directory input path (for AI: "read this file") |
| `workflow:` | Inter-workflow dependency tracking |
| `description:` | Semantic description for AI |

Symmetric with `result:` extension fields (`path:`, `validators:`).

### Directory Reads

Directory reads use `type: string` — the path points to a directory, not structured content:

```yaml
sections_dir:
  path: $DESIGNBOOK_DATA/sections/
  type: string
components_dir:
  path: $DESIGNBOOK_DIRS_COMPONENTS
  type: string
  description: Available components — location resolved by the active framework skill
```

### Pattern Paths

Reads with placeholder patterns (e.g. `[section-id]`) stay as-is in `path:`. The AI resolves the concrete path from context:

```yaml
section_scenes:
  path: $DESIGNBOOK_DATA/sections/[section-id]/[section-id].section.scenes.yml
  workflow: debo-shape-section
  type: object
```

### Empty Reads

Files with `reads: []` → remove the field entirely. No params added.

## Param Naming Convention

Each absorbed read gets a descriptive param name derived from the file path:

| reads path | param name |
|------------|-----------|
| `$DESIGNBOOK_DATA/vision.md` | `vision` |
| `$DESIGNBOOK_DATA/design-system/design-tokens.yml` | `design_tokens` |
| `$DESIGNBOOK_DATA/data-model.yml` | `data_model` |
| `$DESIGNBOOK_DATA/sections/` | `sections_dir` |
| `$DESIGNBOOK_DIRS_COMPONENTS` | `components_dir` |
| `$DESIGNBOOK_DATA/design-system/design-system.scenes.yml` | `design_scenes` |
| `$DESIGNBOOK_DATA/sections/[section-id]/...section.scenes.yml` | `section_scenes` |

## Code Changes

### workflow-resolve.ts

**`TaskFileFrontmatter` interface** — remove `reads?` field:

```typescript
interface TaskFileFrontmatter {
  when?: Record<string, unknown>;
  params?: {
    type?: string;
    required?: string[];
    properties?: Record<string, unknown>;
    $ref?: string;
    [key: string]: unknown;
  };
  // reads?: ... — REMOVED
  result?: { ... };
  each?: Record<string, unknown>;
  files?: TaskFileDeclaration[];
}
```

**`validateAndMergeParams()`** — skip file-input params. A param with `path:` is a file input, not a CLI param. Without this, the engine would error "Missing required param 'vision'" because nobody passes `--params vision=...`:

```typescript
for (const [key, value] of Object.entries(properties)) {
  if (merged[key] !== undefined) continue;

  // Skip file-input params — they're read from disk by the AI, not provided via CLI
  if (isJsonSchemaParam(value) && 'path' in value) continue;

  // ... existing validation logic
}
```

**`validateParamFormats()`** — no change needed. File-input params have `type:`, so `isJsonSchemaParam()` already accepts them.

### Tests

- Update the one existing test (line 836) that mentions `reads:` path expansion — reframe as file-input param path expansion
- New test: param with `path:` is skipped by `validateAndMergeParams()` (not treated as missing CLI param)
- New test: required file-input param (with `path:` and in `required:`) doesn't trigger missing-param error

## Migration

### Task Files (27 files)

Every `reads:` entry becomes a param property with `path:`. Grouped by pattern:

**Files with reads but no existing params (5 files)** — create new `params:` block:
- `create-vision.md`, `intake--import.md`, `prepare-fonts.md`, `intake--css-generate.md`, `generate-css.md`

**Files with both reads and params (20 files)** — merge reads into existing `params.properties`:
- `create-tokens.md`, `create-data-model.md`, `create-sample-data.md`, `create-section.md`
- `intake--design-shell.md`, `intake--design-screen.md`, `extract-reference.md`
- `intake--sections.md`, `map-entity--design-screen.md`
- `generate-jsonata.md`
- `capture-reference.md`, `capture-storybook.md`, `setup-compare.md`
- `compare-screenshots.md`, `verify.md`, `polish.md`, `configure-meta.md`
- `create-scene.md`
- `create-component.md` (designbook-drupal)
- `intake--css-generate.md`

**Files with empty reads (2 files)** — remove `reads: []`:
- `intake--design-component.md`, `intake--design-verify.md`

### Skill-Creator Documentation

- `resources/schemas.md` — add "File-Input Params (with `path:`)" section, remove `reads:` references
- `rules/principles.md` — update "Stages Flush After Completion" example from `reads:` to `params:` with `path:`
- `resources/research.md` — update file-type table (tasks declare `result:`, `params:` — no `reads:`)

## Out of Scope

- `extends:`/`provides:`/`constrains:` as separate file type — planned as follow-up change
- `each:` format change — stays flat
- Structured-data-only I/O (vision.yml, eliminate directory reads) — planned as follow-up change
