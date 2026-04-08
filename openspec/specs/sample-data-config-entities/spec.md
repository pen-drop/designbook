# sample-data-config-entities Specification

## Requirements

### Requirement: content: and config: are generation buckets
`data.yml` has two optional top-level keys — `content:` and `config:`. Both use identical structure `entity_type → bundle → [records]` with the same generation logic. Differences come from field types and `sample_template` declarations.

- Config entities use the same generation loop as content — no special-case branching
- Missing `config:` or `content:` section is not an error; generation completes normally

### Requirement: two-pass generation order
`create-sample-data` generates `content:` in pass 1, `config:` in pass 2. Config may depend on content record indices.

- Config `rows` with `sample_template: template: views` generates entries with `record: N` indices into content (within bounds)
- All content records complete before any config generation starts

### Requirement: _meta is never written
`create-sample-data` SHALL NOT write `_meta` to `data.yml`. Valid top-level keys are `content:` and/or `config:` only.

### Requirement: intake reads data-model.yml directly
`intake` enumerates entities by reading `data-model.yml` directly, not from scenes files. All declared bundles are candidates, even those without scene coverage.
