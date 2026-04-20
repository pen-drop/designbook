# Convert vision.md to vision.yml

Part of the Task Schema JSON Schema Compliance series. Makes the I/O model consistent: all file-input params declared as `type: object` must point to structured YAML files, not Markdown.

## Problem

`vision.md` is the only structured data file stored as Markdown. Its result schema declares `type: object` with typed properties (`product_name`, `description`, `problems`, etc.), but the actual file is Markdown that the AI parses informally. Every other structured data file (`data-model.yml`, `design-tokens.yml`, `*.scenes.yml`) is YAML.

## Decision

Rename `vision.md` to `vision.yml`. The AI writes YAML matching the existing result schema. Breaking change — all references, fixtures, and runtime code are migrated.

## YAML Format

The result schema from `create-vision.md` already defines the structure. No new schema needed.

```yaml
product_name: LEANDO
description: "The portal for vocational training practice..."
problems:
  - title: Scattered Information
    solution: "Training personnel cannot find relevant materials..."
  - title: Lack of Professional Networking
    solution: "Networking and exchange among practitioners is lacking..."
features:
  - Topic and profession-based content navigation
  - Event management with registration
  - Learning packages with interactive content
design_reference:
  type: url
  url: https://leando.de/
  label: LEANDO Portal
references: []
```

Fields match the existing result schema 1:1:

| Field | Type | Required |
|-------|------|----------|
| `product_name` | string | yes |
| `description` | string | yes |
| `problems` | array of `{ title, solution }` | no (default: `[]`) |
| `features` | array of string | no (default: `[]`) |
| `design_reference` | `{ type, url, label }` or null | no (default: `null`) |
| `references` | array of `{ type, url, label }` | no (default: `[]`) |

## Code Changes

### vite-plugin.ts

Three hardcoded `vision.md` references:

| Line | Current | New |
|------|---------|-----|
| ~142 | `vision: 'vision.md'` | `vision: 'vision.yml'` |
| ~157 | `server.watcher.add(resolve(designbookDir, 'vision.md'))` | `'vision.yml'` |
| ~233 | `existsSync(resolve(designbookDir, 'vision.md'))` | `'vision.yml'` |

### Task Files

All params with `path: $DESIGNBOOK_DATA/vision.md` → `path: $DESIGNBOOK_DATA/vision.yml`.

Files affected (9 task files):
- `vision/tasks/create-vision.md` — result path + param path + task body (YAML output instructions)
- `tokens/tasks/create-tokens.md` — param path
- `data-model/tasks/create-data-model.md` — param path (if present via domain)
- `sections/tasks/intake--sections.md` — param path
- `sections/tasks/create-section.md` — param path
- `design/tasks/intake--design-shell.md` — param path
- `design/tasks/intake--design-screen.md` — param path
- `design/tasks/extract-reference.md` — param path
- `import/tasks/intake--import.md` — param path

### vision-context Rule

`vision/rules/vision-context.md` — update path reference from `vision.md` to `vision.yml`, update error message, update "read it" instruction to "read YAML".

### Fixtures

~86 `vision.md` files across `fixtures/` and `promptfoo/workspaces/` directories. Each converted from Markdown to YAML format matching the schema above.

### Tests

Update path references in:
- `workflow-resolve.test.ts` — vision.md path strings
- `workflow-result.test.ts` — vision.md path strings

## Out of Scope

- Schema definition file (schemas.yml) for vision — the result schema in create-vision.md is sufficient
- Directory reads — already handled as `type: string` params in Change 2
- Other Markdown-to-YAML conversions — vision.md is the only inconsistency
