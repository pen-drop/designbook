# CLI: validate

Schema validation for Designbook artifacts. All commands output JSON and set exit code 0 (valid) or 1 (invalid).

**Common response format:**
```json
{ "valid": true, "label": "<name>" }
{ "valid": false, "label": "<name>", "errors": ["..."], "warnings": ["..."] }
```

## `validate data`

Validate a section's `data.yml` against `data-model.yml`.

```bash
 validate data <section-id>
```

Resolves paths: `$DESIGNBOOK_DATA/data-model.yml` and `$DESIGNBOOK_DATA/sections/<section-id>/data.yml`.

## `validate tokens`

Validate design tokens against the W3C schema.

```bash
 validate tokens
```

Resolves path: `$DESIGNBOOK_DATA/design-system/design-tokens.yml`.

## `validate component`

Validate a component YAML against the Drupal SDC schema.

```bash
 validate component <name>
```

Resolves path: `$DESIGNBOOK_HOME/components/<name>/<name>.component.yml`.

Requires `designbook.home` in config.

## `validate data-model`

Validate `data-model.yml` against its schema.

```bash
 validate data-model
```

Resolves path: `$DESIGNBOOK_DATA/data-model.yml`.

## `validate entity-mapping`

Validate a `.jsonata` entity mapping file against sample data.

```bash
 validate entity-mapping <name>
```

Resolves path: `$DESIGNBOOK_DATA/entity-mapping/<name>.jsonata`.
