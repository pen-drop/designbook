## Why

YAML is better for AI-generated content: ~30% fewer tokens, no trailing-comma errors, supports comments, more readable for deeply nested structures. Currently `data-model.json` and `data.json` are JSON while all other Designbook files (screen.yml, component.yml, story.yml, config.yml) are YAML. Standardizing on YAML creates consistency and improves AI workflow efficiency.

## What Changes

- Rename `data-model.json` → `data-model.yml` (data model definition files)
- Rename `data.json` → `data.yml` (sample data files per section)
- Convert JSON Schema (`schema/data-model.json`) → YAML (`schema/data-model.schema.yml`)
- Update addon code (`vite-plugin.ts`) to parse YAML instead of JSON
- Update all skill documentation and validation commands

## Capabilities

### New Capabilities

_(none — this is a format migration, not a new capability)_

### Modified Capabilities

- `data-model-workflow`: File format changes from JSON to YAML, validation uses YAML schema
- `screen-renderer`: Data file references change from `.json` to `.yml`

## Impact

- **Addon code**: `vite-plugin.ts` (JSON.parse → parseYaml), comment updates in `resolver.ts`, `types.ts`
- **Skills**: `designbook-data-model`, `designbook-screen`, `designbook-drupal-data-model`
- **Test data**: `test-integration-drupal/designbook/data-model.json` and `sections/blog/data.json`
- **Schema**: `designbook-data-model/schema/data-model.json`
- **Not affected**: W3C Design Tokens (JSON required by standard), OpenSpec archives (historical)
