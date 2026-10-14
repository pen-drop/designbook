---
trigger:
  steps: [sync-to:transform]
filter:
  backend: wordpress
---

# Rule: View Component Props

A generated view hands post data to components through `{% include … with { … } only %}`.
The included component's `<name>.schema.yml` is the interface that include must satisfy.

| ID | Constraint |
|---|---|
| VIEW-01 | Before writing an include, read the target component's `components/<name>/<name>.schema.yml`; each key passed is a prop or slot name declared there, spelled exactly as declared. |
| VIEW-02 | Every prop in the schema's `required` list is bound to a post value. |
| VIEW-03 | Every other declared prop whose meaning a bundle field (or a combination of fields) carries is bound to it, so the rendered component shows the same parts as its default story. |
| VIEW-04 | Field bindings come from the entity mapping of `<et>.<bundle>.full` when it exists; otherwise each prop binds to the bundle field of the same meaning. |
