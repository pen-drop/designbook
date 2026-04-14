# rule-schema-composition Specification

## Purpose

Rules and blueprints extend task result schemas through two channels: declarative frontmatter (engine-merged, static) for structure, defaults, and constraints; and prose instructions (AI-executed, dynamic) for runtime suggestions, MCP tool calls, and context-dependent logic. The engine merges all declarative extensions into a single schema at resolution time. The AI reads the merged schema plus rule prose to fill results.

---

## ADDED Requirements

### Requirement: Rules declare schema extensions via extends field

A rule or blueprint MAY declare an `extends:` field in its frontmatter. The value is a map keyed by result key, containing JSON Schema property additions to merge into the task's result schema.

```yaml
---
when:
  steps: [create-tokens]
  frameworks.css: tailwind
extends:
  design-tokens:
    properties:
      semantic:
        properties:
          color:
            required: [primary, secondary, accent, neutral]
            properties:
              primary: { $ref: "tokens/schemas.yml#/W3cToken" }
              secondary: { $ref: "tokens/schemas.yml#/W3cToken" }
```

The engine SHALL deep-merge `extends:` additions into the base result schema at resolution time. Duplicate property names across multiple `extends:` sources SHALL cause a resolution error.

#### Scenario: Blueprint extends result schema with framework roles
- **WHEN** a Tailwind css-naming blueprint declares `extends: { design-tokens: { properties: { semantic: { properties: { color: { required: [primary] } } } } } }`
- **AND** the base task schema declares `result: { design-tokens: { type: object, properties: { semantic: { type: object } } } }`
- **THEN** the merged schema includes `semantic.color.primary` as required
- **AND** the AI is informed that `primary` must be provided

#### Scenario: Duplicate extends property causes error
- **WHEN** two rules both extend the same result key with the same property name
- **THEN** `workflow create` fails with an error identifying the conflicting rules

#### Scenario: Extends with $ref resolved at merge time
- **WHEN** an `extends:` field contains `$ref` references
- **THEN** the engine resolves them at merge time using the same resolution logic as task-level `$ref`

---

### Requirement: Rules declare default values via provides field with object value

A rule or blueprint MAY declare a `provides:` field with an object value in its frontmatter. The value is a map keyed by result key, containing JSON Schema `default:` additions to merge into the task's result schema.

```yaml
---
when:
  steps: [create-tokens]
provides:
  design-tokens:
    properties:
      component:
        properties:
          container:
            default:
              max-width:
                sm: { $value: "640px", $type: dimension }
                md: { $value: "768px", $type: dimension }
```

The engine SHALL merge `provides:` defaults into the schema. When multiple rules provide defaults for the same property, the last rule (by file order) wins.

#### Scenario: Component blueprint provides token defaults
- **WHEN** a container blueprint declares `provides: { design-tokens: { properties: { component: { properties: { container: { default: {...} } } } } } }`
- **THEN** the merged schema includes the container defaults
- **AND** the AI does not need to ask for container token values (defaults are pre-filled)

#### Scenario: Multiple provides for same property — last wins
- **WHEN** rule A provides `default: { sm: "640px" }` and rule B provides `default: { sm: "600px" }` for the same property
- **THEN** the merged schema uses rule B's default (last writer wins)

---

### Requirement: Rules declare value constraints via constrains field

A rule MAY declare a `constrains:` field in its frontmatter. The value is a map keyed by result key, containing JSON Schema constraint additions (`enum`, `pattern`, `minimum`, `maximum`, `minItems`, `maxItems`) to merge into the task's result schema.

```yaml
---
when:
  steps: [design-verify:intake]
constrains:
  reference:
    items:
      properties:
        type:
          enum: [stitch, url, image]
---
```

When multiple rules constrain the same property with `enum`, the engine SHALL intersect the enum values (narrowest wins).

#### Scenario: Rule constrains reference type to enum
- **WHEN** a rule declares `constrains: { reference: { items: { properties: { type: { enum: [stitch, url, image] } } } } }`
- **THEN** the merged schema restricts `reference[].type` to those values
- **AND** validation rejects any other type value

#### Scenario: Multiple enum constraints intersect
- **WHEN** rule A constrains `type: { enum: [stitch, url, image] }` and rule B constrains `type: { enum: [stitch, url] }`
- **THEN** the merged schema uses `enum: [stitch, url]` (intersection)

---

### Requirement: Provides field with string value signals dynamic resolution

A rule MAY declare `provides:` with a string value (dot-path notation) instead of an object. This signals to the AI that the rule helps fill the named property via dynamic logic described in the rule's prose body. The engine SHALL NOT merge string-valued `provides:` into the schema.

```yaml
---
provides: reference.url
when:
  steps: [design-verify:intake]
  extensions: stitch
---

# Resolve Stitch URL
When a reference has origin: stitch, call mcp__stitch__get_screen...
```

The AI MUST read rules with string-valued `provides:` before asking the user for that property. The rule's prose describes the dynamic resolution steps (MCP calls, file reads, etc.).

#### Scenario: AI reads dynamic provider rule before asking
- **WHEN** a rule declares `provides: reference.url` (string, not object)
- **AND** the task's result schema includes a `reference` property
- **THEN** the AI reads the rule's prose and executes its instructions before asking the user for `reference`

#### Scenario: Engine ignores string-valued provides for schema merge
- **WHEN** a rule declares `provides: reference.url` (string value)
- **THEN** the engine does NOT merge anything into the schema
- **AND** the merged schema is unaffected by this declaration

---

### Requirement: Engine merges schema extensions at resolution time

The engine SHALL merge all `extends:`, `provides:`, and `constrains:` declarations from matched rules and blueprints into the task's result schema during `workflow create` or `workflow instructions`. The merge order is:

1. Base task schema (from task frontmatter `result:`)
2. `extends:` from each matched blueprint (in file order)
3. `extends:` from each matched rule (in file order)
4. `provides:` (object values only) from each matched blueprint (in file order)
5. `provides:` (object values only) from each matched rule (in file order)
6. `constrains:` from each matched rule (in file order)

The resulting merged schema SHALL be persisted in `tasks.yml` and returned by `workflow instructions`.

Blueprints merge before rules — they define the structural skeleton. Rules then constrain or fill the structure.

#### Scenario: Merged schema persisted in tasks.yml
- **WHEN** `workflow create` resolves a task with base schema, one blueprint extending it, and one rule constraining it
- **THEN** the merged schema is stored in the task's entry in `tasks.yml`
- **AND** subsequent `workflow instructions` calls return the same merged schema

#### Scenario: Merged schema returned by workflow instructions
- **WHEN** `workflow instructions --stage create-tokens` is called
- **THEN** the response includes a `merged_schema` field with the fully merged result schema
- **AND** the AI uses this schema as the single source of truth for what to fill

---

### Requirement: Schema consistency between AI and engine validation

The merged schema computed at resolution time SHALL be the same schema used for validation at `workflow done` time. There MUST NOT be a scenario where the AI sees different schema requirements than the engine validates against.

- If a blueprint adds `semantic.color.primary` as required, the AI sees it as required AND the engine rejects results without it
- If a blueprint provides `container.max-width` defaults, the AI knows it does not need to ask AND the engine accepts those defaults
- If a rule constrains `reference.type` to `enum: [stitch, url, image]`, the AI presents those options AND the engine rejects anything else

#### Scenario: AI and engine use same merged schema
- **WHEN** a Tailwind blueprint extends the token schema with `required: [primary]`
- **AND** the AI fills the result without `primary`
- **THEN** `workflow done` validation fails with a missing-required error

#### Scenario: Blueprint defaults accepted by engine
- **WHEN** a container blueprint provides `default: { max-width: { sm: "640px" } }`
- **AND** the AI does not override the container property
- **THEN** `workflow done` validation accepts the default value
