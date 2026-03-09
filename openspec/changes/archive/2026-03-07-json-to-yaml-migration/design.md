## Context

Designbook uses YAML for all component/story/screen/config files but JSON for data files (`data-model.json`, `data.json`). The `yaml` package is already a dependency — JSON.parse is the only parser used for data files.

## Goals / Non-Goals

**Goals:**
- Standardize all Designbook data files on YAML format
- Convert schema validation to use YAML schema
- Update addon code to parse YAML instead of JSON
- Update skill documentation

**Non-Goals:**
- W3C Design Token files remain JSON (standard requirement)
- OpenSpec archive files are not modified (historical)
- No functional changes to data model structure or validation rules

## Decisions

### 1. File naming: `.yml` extension
Use `.yml` (not `.yaml`) to match existing conventions (`*.screen.yml`, `*.component.yml`, `*.story.yml`).

### 2. Schema format: YAML with `.schema.yml` suffix
JSON Schema can be written as YAML. ajv-cli supports YAML schemas. Rename from `data-model.json` → `data-model.schema.yml` to distinguish schema from data.

### 3. Parsing: reuse existing `yaml` package
`parseYaml` from the `yaml` package is already imported in `vite-plugin.ts`. Simply replace `JSON.parse` calls with `parseYaml`.

## Risks / Trade-offs

- [Risk: ajv-cli YAML support] → Verify ajv-cli can validate YAML data against YAML schema. If not, convert at validation time.
- [Risk: Skills/workflows referencing old filenames] → Grep-verified, updating all active references. Archives stay as-is.
