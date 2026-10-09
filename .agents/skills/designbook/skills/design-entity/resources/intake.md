---
name: design-entity-intake
description: Domain decisions for creating or changing the selected entity artifacts.
---

# Entity intake

For a supplied design reference, first follow [reference intake](../../../design/resources/reference-intake.md): load the effective extraction instructions and complete analysis before selecting the structure below. Text-only requests use their concrete acceptance criteria and retained artifacts.

Select entity type, bundle and exactly one view-mode or form-mode identity. Inspect its current mapping, data model, selected mode's template/display settings, sample pool, component inventory and standalone preview. Include neighboring view/form modes and bundles in the preservation baseline.

Record the requested field-output delta, concrete acceptance criteria and preserved content. A clear text request is sufficient; a visual reference is optional. Reuse a component that already satisfies the mapping. Reuse a sufficient sample pool; declare only necessary record/field changes, retaining existing IDs and section tags. Limit mapping/model/display edits to the selected mode and preserve unrelated configuration and data. Use the existing standalone preview convention, with its exact story URL and mapped-field observations. Declare every affected consumer and required prerequisite before planning.

Use the request, existing artifacts, and the saved intake context as input. For reference handling, preserved inputs, fixed dependencies and build/browser evidence, follow the [write planning contract](../../../design/resources/write-planning.md).

Completion: all identities, requested deltas, preserved content, acceptance criteria, consumer targets, outputs, dependencies and applicable rules are fixed in the plan's task parameters. Clarify unresolved identity or scope before saving a runnable plan.

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes (caller override wins):

- **create / rebuild** → default `ask`
- **change** of an existing named target → may `ephemeral`; blockade when the work would add undeclared targets/tasks or widen scope

When the plan depends on a published revision, complete the [reference intake](../../../design/resources/reference-intake.md) suitability confirmation and approval gate (`reference approval-check`) before `plan build`. A missing or unapproved revision is a `ReferenceNeed` blockade — stop; start `extract-reference` separately when capture is required.

When this entity work requires typography tokens the project does not yet have,
emit a named prerequisite blockade and stop; start `tokens` separately. Shape:

```yaml
kind: PrerequisiteNeed
workflow: design-entity
need:
  workflow: tokens
  reason: missing typography tokens
```

When a required font family has no `@font-face` coverage in project CSS, emit a
named prerequisite blockade and stop; start `css-generate` separately. A
typography token name is not coverage. Shape:

```yaml
kind: PrerequisiteNeed
workflow: design-entity
need:
  workflow: css-generate
  reason: missing font face
```

When a required image style is missing (`config.image_style` has no bundle the
mapping's ImageNode can name), emit a named prerequisite blockade and stop; start
`data-model` separately. Shape:

```yaml
kind: PrerequisiteNeed
workflow: design-entity
need:
  workflow: data-model
  reason: missing config.image_style bundle required by image-fields
```
