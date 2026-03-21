## MODIFIED Requirements

### Requirement: Consistent output format

All validate subcommands SHALL output **newline-delimited JSON** to stdout. Each validation item is one JSON object per line.

Single-item validators output one line:
```json
{ "valid": true, "label": "button", "warnings": [] }
{ "valid": false, "label": "button", "errors": ["/ missing required property 'name'"] }
```

Multi-item validators (`validate story`, `validate data`) output one line per item:
```json
{ "valid": true, "label": "button.default", "html": "<button>Click</button>" }
{ "valid": false, "label": "button.outline", "error": "button.twig:5: Variable 'label' not defined" }
```

Exit code is 0 if all items are valid, 1 if any item is invalid.

#### Scenario: output format — valid result

- **WHEN** validation succeeds with no warnings
- **THEN** the CLI SHALL print `{ "valid": true, "label": "<name>" }` and exit 0

#### Scenario: output format — validation errors

- **WHEN** validation produces errors
- **THEN** the CLI SHALL print `{ "valid": false, "label": "<name>", "errors": [...] }` and exit 1

#### Scenario: output format — story render result

- **WHEN** `validate story` renders a story successfully
- **THEN** the CLI SHALL include `"html"` in the JSON output containing the rendered HTML string

## ADDED Requirements

### Requirement: Validate view-mode mappings

The `designbook validate view-mode <name>` command SHALL validate a `.jsonata` view-mode mapping file by executing it against sample entity data and verifying the output is a valid `ComponentNode[]`.

The validator SHALL:
- Resolve the file at `<dist>/view-modes/<name>.jsonata`
- Load matching sample data from `<dist>/sections/**/data.yml` (or `<dist>/data.yml`)
- Execute the JSONata expression against the sample data using the `jsonata` package
- Validate the output shape is an array of `ComponentNode` objects (each has `component: string`, optional `props: object`, optional `slots: object`)
- Print one JSON result line per entity record tested

#### Scenario: Valid view-mode mapping

- **WHEN** user runs `validate view-mode node.article.teaser` and the JSONata expression produces valid `ComponentNode[]` for all sample article records
- **THEN** the CLI SHALL output `{ "valid": true, "label": "node.article.teaser", "recordCount": 3 }` and exit 0

#### Scenario: Invalid ComponentNode output

- **WHEN** the JSONata expression output is missing the required `component` field
- **THEN** the CLI SHALL output `{ "valid": false, "label": "node.article.teaser", "error": "Output[0].component is required" }` and exit 1

#### Scenario: JSONata syntax error

- **WHEN** the `.jsonata` file contains a syntax error
- **THEN** the CLI SHALL output `{ "valid": false, "label": "node.article.teaser", "error": "JSONata parse error: ..." }` and exit 1

#### Scenario: Missing view-mode file

- **WHEN** the specified `.jsonata` file does not exist
- **THEN** the CLI SHALL output `{ "valid": false, "label": "node.article.teaser", "error": "File not found: ..." }` and exit 1
