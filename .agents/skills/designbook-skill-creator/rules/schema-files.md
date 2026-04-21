---
name: schema-files
description: Authoring + validation rules for schemas.yml. Load before creating or editing any schemas.yml; load alongside common-rules.md.
applies-to:
  - schemas.yml
  - "**/schemas.yml"
---

# Schema File Rules

Load together with [common-rules.md](common-rules.md).

## `schemas.yml` — Schema Definitions

Each concern directory (core) or skill root (integration) can contain a `schemas.yml` file with reusable JSON Schema definitions. Tasks, rules, and blueprints reference these via `$ref`.

See [`resources/schemas.md`](../resources/schemas.md) for format conventions and `$ref` syntax.

## Schemas Must Teach the AI

`schemas.yml` is the authoritative spec for what tasks produce. The AI uses these schemas to drive intake dialogues and generation — so every type must contain enough metadata to be self-explanatory:

- **Top-level types** declare `title:` or `description:`.
- **Each property** has either `description:`, `enum:`, `pattern:`, or `examples:` — anything that gives the AI a signal beyond the bare type.
- **`additionalProperties: true`** is documented (what kind of arbitrary keys belong here).
- **Required fields** are listed explicitly in `required:`.

A reader (human or AI) must be able to look at a schema and know what to ask for and what to generate. A schema with only `{ type: string }` properties teaches nothing.

```yaml
# ❌ Teaches nothing — AI has no signal what to put in product_name
Vision:
  type: object
  properties:
    product_name: { type: string }
    description: { type: string }

# ✅ Teaches the AI what to ask for and what to generate
Vision:
  type: object
  title: Product Vision
  description: High-level intent for the product — drives all downstream generation.
  required: [product_name, description]
  properties:
    product_name:
      type: string
      description: Short brand-facing name. Used in titles, story labels, and intake prompts.
      examples: [Acme Portal, Citizen Hub]
    description:
      type: string
      description: One-paragraph product mission — answers "what is this for, for whom".
```

## Checks

<!--
  SCHEMA-02 shares its predicate with TASK-09. If the definition of "teaching signal"
  (description / enum / pattern / examples) changes, update both checks together.
-->

| ID | Severity | What to verify | Where |
|---|---|---|---|
| SCHEMA-01 | error | Every `$ref` in schemas.yml resolves to an existing key in the same file or in another concern's `schemas.yml` | body |
| SCHEMA-02 | warning | Every top-level-type property with `type: string`/`number`/`object` carries at least one teaching signal (`description`, `enum`, `pattern`, or `examples`); properties with `path:` or `$ref:` are exempt | body |
| SCHEMA-03 | warning | Every top-level type declares a `title:` or `description:` | body |
| SCHEMA-04 | warning | Types that set `additionalProperties: true` document (in a `description:` field) what kind of keys belong there | body |
