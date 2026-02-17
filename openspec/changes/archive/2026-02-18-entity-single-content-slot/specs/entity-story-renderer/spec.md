## ADDED Requirements

### Requirement: Ref resolver function
The `refRenderer.js` file SHALL export a `resolveRef(data, fieldPath)` function that traverses a data object using dot-notation and returns the plain value (string, number, object, or array). It SHALL NOT generate HTML or perform component rendering.

#### Scenario: Simple field lookup
- **WHEN** `resolveRef(record, 'title')` is called with a record containing `{ title: 'Hello' }`
- **THEN** it SHALL return `'Hello'`

#### Scenario: Nested field lookup with dot-notation
- **WHEN** `resolveRef(record, 'field_media.url')` is called with `{ field_media: { url: '/img.jpg' } }`
- **THEN** it SHALL return `'/img.jpg'`

#### Scenario: Array index in path
- **WHEN** `resolveRef(data, 'block_content.contact_person.0.field_name')` is called
- **THEN** it SHALL traverse into the array at index 0 and return the `field_name` value

#### Scenario: Missing field returns undefined
- **WHEN** `resolveRef(record, 'nonexistent_field')` is called
- **THEN** it SHALL return `undefined`

### Requirement: $ref prefix in prop values
Story YAML prop values prefixed with `$ref:` SHALL be resolved at build time using the `resolveRef` function. Prop values without the prefix SHALL be passed through as literal values.

#### Scenario: Ref prop resolved from data
- **WHEN** a component node has `props: { text: '$ref:title' }`
- **AND** the data record has `{ title: 'My Article' }`
- **THEN** the resolved prop SHALL be `{ text: 'My Article' }`

#### Scenario: Literal prop passed through
- **WHEN** a component node has `props: { level: 'h1', variant: 'ocean' }`
- **THEN** the props SHALL be passed through unchanged

#### Scenario: Mixed ref and literal props
- **WHEN** a component node has `props: { text: '$ref:title', level: 'h1' }`
- **THEN** `text` SHALL be resolved from data and `level` SHALL remain `'h1'`

### Requirement: Designbook metadata block
Story YAML files for entity components SHALL contain a `designbook:` block declaring the data source.

#### Scenario: Valid metadata
- **WHEN** a story YAML contains `designbook: { testdata: 'designbook/sections/blog/data.json', entity_type: 'node', bundle: 'article' }`
- **THEN** the vite-plugin SHALL load the data file and select the first record from `data[entity_type][bundle][0]`

#### Scenario: Custom record index
- **WHEN** `designbook.record` is set to `1`
- **THEN** the renderer SHALL use the record at index 1

### Requirement: Ref renderer file location
The ref resolver SHALL be implemented in `.storybook/refRenderer.js` as a separate file from the existing `.storybook/renderer.js`.

#### Scenario: Separate file exists
- **WHEN** the ref rendering system is implemented
- **THEN** `.storybook/refRenderer.js` SHALL exist as a standalone file
- **AND** `.storybook/renderer.js` SHALL remain unchanged
