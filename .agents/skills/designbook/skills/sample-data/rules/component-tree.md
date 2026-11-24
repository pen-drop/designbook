---
trigger:
  domain: sample-data
---

# Rule: Component-Tree Sample Fields

A data-model field of type `component_tree` carries its bundle's composition. The field type alone selects this contract; the field name, entity type and view-mode template play no part. A bundle declares at most one such field.

Every planned record carries that field under its machine name as a `ComponentNode[]`; an empty array is valid. At every depth of the tree:

- each array member is a component node (`component`, optional `props`, optional `slots`); entity, scene and image nodes belong to scenes;
- each slot value is a text string or a `ComponentNode[]`;
- each `component` id is a planned component write or a frozen baseline contract, and each prop exists on that contract.

`plan build` validates every record, including records no scene selects, and `plan tree` shows each record's tree under its entity.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| CT-01 | error | Each planned record carries the bundle's single `component_tree` field as a `ComponentNode[]` | records.values |
| CT-02 | error | Every `component` id in the tree is a planned write or a frozen baseline contract, and every prop exists on that contract | records.values |
| CT-03 | error | Every slot value is a string or a `ComponentNode[]`, and every array member at any depth is a component node | records.values |
