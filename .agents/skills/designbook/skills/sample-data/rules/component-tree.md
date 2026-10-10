---
trigger:
  domain: sample-data
---

# Rule: Component-Tree Sample Fields

A data-model field of type `component_tree` stores the composition as a `ComponentNode[]` on each sample record, under that field's machine name. Every `component` id is a planned write or a frozen baseline contract. Slot values are strings or nested `ComponentNode` arrays.

`plan tree` / `plan done` walk this field. Canvas and any other integration that declares `type: component_tree` use this contract.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| CT-01 | error | Each planned record's `component_tree` field is a `ComponentNode[]` whose `component` ids exist as planned writes or frozen baseline contracts | records.values |
| CT-02 | error | Nested slot values are strings or `ComponentNode` arrays | records.values |
