# schema-driven-serialization Specification

## Purpose

The engine serializes task result objects to files based on the declared `path:` extension and the result's JSON Schema. For markdown files, schema `title` fields become section headings via convention-based flattening. An optional `template:` field overrides the convention when custom formatting is needed.

---

## ADDED Requirements

### Requirement: Engine serializes result data based on path extension

When `workflow done` processes a result that has a `path:` field and result data (from `--data` or implicit collection), the engine SHALL serialize the data to the file based on the path's file extension.

| Extension | Serialization |
|-----------|--------------|
| `.yml` / `.yaml` | YAML dump — 1:1 mapping of the result object |
| `.json` | JSON stringify with 2-space indentation |
| `.md` | Convention-based markdown flattening (see below) |

The engine MUST NOT serialize data for results that were written as file content via stdin (the `workflow result --key X` flow). Serialization only applies when the engine receives structured data and a path.

#### Scenario: YAML result serialized from data
- **WHEN** a task declares `result: { design-tokens: { path: "...tokens.yml", type: object } }`
- **AND** `workflow done --data '{"design-tokens": { "primitive": {...}, "semantic": {...} }}'` is called
- **THEN** the engine writes the design-tokens object as YAML to the declared path

#### Scenario: JSON result serialized from data
- **WHEN** a task declares `result: { config: { path: "...config.json", type: object } }`
- **AND** `workflow done --data '{"config": {...}}'` is called
- **THEN** the engine writes the config object as JSON with 2-space indentation to the declared path

#### Scenario: Markdown result serialized from data
- **WHEN** a task declares `result: { vision: { path: "...vision.md", type: object, properties: {...} } }`
- **AND** `workflow done --data '{"vision": {"product_name": "PetShop", "description": "..."}}'` is called
- **THEN** the engine flattens the vision object to markdown using the schema's `title` fields as headings

---

### Requirement: Convention-based markdown flattening uses schema title fields

When a result with a `.md` path is serialized from structured data, the engine SHALL walk the schema's `properties` in declaration order and generate markdown sections using the `title` field of each property as the heading.

Flattening rules:

1. The first required string property becomes the h1 heading (`# {value}`)
2. All other string properties become h2 sections (`## {title}\n{value}`)
3. Array of strings becomes an h2 section with a bullet list (`## {title}\n- item1\n- item2`)
4. Array of objects becomes an h2 section with h3 sub-sections. The first string property of each object becomes the h3 heading; remaining properties become body text.
5. Nested objects become h2 sections with recursive flattening one level deeper (h3, h4)
6. Properties with value `null`, `undefined`, or matching their `default` when `default` is `null` SHALL be omitted entirely (no empty sections)
7. Properties without a `title` field SHALL use the property key formatted as title case

#### Scenario: Simple vision object flattened to markdown
- **WHEN** a vision result has schema properties: `product_name` (string, title: "Product Name"), `description` (string, title: "Description"), `features` (array of strings, title: "Key Features")
- **AND** the data is `{ "product_name": "PetShop", "description": "An online pet store", "features": ["Search", "Wishlist"] }`
- **THEN** the engine produces:
  ```
  # PetShop
  
  ## Description
  An online pet store
  
  ## Key Features
  - Search
  - Wishlist
  ```

#### Scenario: Array of objects flattened with sub-headings
- **WHEN** a property `problems` has type `array`, title "Problems & Solutions", and items with properties `title` (string) and `solution` (string)
- **AND** the data contains `[{ "title": "Finding pets", "solution": "AI-powered matching" }]`
- **THEN** the engine produces:
  ```
  ## Problems & Solutions
  ### Finding pets
  AI-powered matching
  ```

#### Scenario: Null-valued optional property omitted
- **WHEN** a property `design_reference` has `default: null` and the data value is `null`
- **THEN** the property is omitted from the markdown output entirely

#### Scenario: Property without title uses key as title
- **WHEN** a property key is `design_reference` and no `title` field is declared
- **THEN** the heading uses "Design Reference" (key converted to title case)

---

### Requirement: Optional template overrides convention-based flattening

A result entry MAY declare a `template:` field containing an inline template string. When present, the engine SHALL use the template instead of convention-based flattening to serialize the result to markdown.

```yaml
result:
  vision:
    path: $DESIGNBOOK_DATA/vision.md
    template: |
      # {{ product_name }}
      
      ## Description
      {{ description }}
      
      {{#if problems}}
      ## Problems & Solutions
      {{#each problems}}
      ### {{ title }}
      {{ solution }}
      {{/each}}
      {{/if}}
```

Template syntax:
- `{{ property }}` — interpolate a property value
- `{{#each array}} ... {{/each}}` — iterate over an array
- `{{#if property}} ... {{/if}}` — conditional section (omit if null/undefined/empty)
- `{{ . }}` — current item in an `{{#each}}` block (for string arrays)

The template engine MUST be simple — no expressions, no filters, no helpers beyond `each` and `if`.

#### Scenario: Template used for markdown serialization
- **WHEN** a result declares `template:` and `path:` ending in `.md`
- **AND** `workflow done --data` provides the result data
- **THEN** the engine renders the template with the data and writes to the path
- **AND** convention-based flattening is NOT used

#### Scenario: Template with conditional section
- **WHEN** a template contains `{{#if design_reference}} ... {{/if}}`
- **AND** the data has `design_reference: null`
- **THEN** the conditional section is omitted from the output

#### Scenario: No template falls back to convention
- **WHEN** a result declares `path:` ending in `.md` but no `template:`
- **THEN** the engine uses convention-based flattening with schema `title` fields
