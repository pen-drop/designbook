# task-result-schema Delta Specification

## Purpose

Extends the result schema declaration from `task-output-schema` with `title` fields for questioning and markdown serialization, and an optional `template:` field for custom markdown formatting.

---

## MODIFIED Requirements

### Requirement: Unified result declaration replaces `files:` and `--params`

A task file MAY declare a `result:` field in its frontmatter. `result:` replaces both the current `files:` declaration (for file results) and `--params` on `workflow done` (for data results). The distinction is the `path:` field.

Each result property MAY include a `title` field (string) that serves two purposes:
1. **Questioning** — when the AI needs to ask the user for a missing required property, `title` guides the question phrasing
2. **Serialization** — for markdown file results, `title` becomes the section heading during convention-based flattening

Each result entry with `path:` ending in `.md` MAY include a `template:` field (string) that overrides convention-based markdown flattening with an inline template.

**Data result** (no `path:`) — value stored in the task's result in tasks.yml, flows into workflow scope at stage completion:

```yaml
result:
  scene:
    type: string
    title: Scene
  reference:
    type: array
    title: Design Reference
    default: []
    items:
      $ref: ../schemas.yml#/Reference
```

**File result** (`path:` present) — content serialized to disk from structured data or written via stdin:

```yaml
result:
  vision:
    path: $DESIGNBOOK_DATA/vision.md
    type: object
    required: [product_name, description]
    properties:
      product_name:
        type: string
        title: Product Name
      description:
        type: string
        title: Description
      features:
        type: array
        title: Key Features
        default: []
        items: { type: string }
```

Rules:

- All existing `result:` rules from the base spec remain in effect
- `title` is optional — when absent, the property key formatted as title case is used
- `title` MUST be a non-empty string when present
- `template:` is optional — when absent, convention-based flattening is used for `.md` results
- `template:` is only meaningful for results with `path:` ending in `.md`
- The engine SHALL propagate `title` fields through schema resolution and persist them in the merged schema

#### Scenario: Result property with title used for questioning
- **WHEN** a task declares `result: { vision: { properties: { product_name: { type: string, title: "Product Name" } } } }`
- **AND** the AI does not have a value for `product_name`
- **THEN** the AI uses "Product Name" as guidance for asking the user

#### Scenario: Result property with title used for markdown heading
- **WHEN** a task declares `result: { vision: { path: "...md", properties: { description: { type: string, title: "Description" } } } }`
- **AND** the engine serializes the result to markdown
- **THEN** the `description` property becomes a `## Description` section

#### Scenario: Title propagated through schema merge
- **WHEN** a blueprint extends a result schema with `extends: { design-tokens: { properties: { semantic: { title: "Semantic Tokens" } } } }`
- **THEN** the merged schema preserves the `title` on the `semantic` property
- **AND** both the AI and engine see the title

#### Scenario: Template overrides convention for markdown result
- **WHEN** a result declares both `path: "...md"` and `template: "# {{ product_name }}\n..."`
- **THEN** the engine uses the template instead of convention-based flattening
