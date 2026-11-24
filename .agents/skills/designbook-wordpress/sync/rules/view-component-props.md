---
trigger:
  domain: data-mapping
filter:
  backend: wordpress
---

# Rule: View Component Props

A generated view (`views/single-<bundle>.twig`) presents post data through components: its
visible markup comes from `{% include … with { … } only %}` of the component that presents the
bundle. The included component's `<name>.schema.yml` is the interface that include must satisfy.

| ID | Constraint |
|---|---|
| VIEW-01 | The view's `content` block consists of component includes; the component is the one the entity mapping of `<et>.<bundle>.full` names, otherwise the component whose schema props carry the bundle's fields. |
| VIEW-02 | Before writing an include, read the target component's `components/<name>/<name>.schema.yml`; each key passed is a prop or slot name declared there, spelled exactly as declared. |
| VIEW-03 | Every prop in the schema's `required` list is bound to a post value. |
| VIEW-04 | Every other declared prop whose meaning a bundle field (or a combination of fields) carries is bound to it, so the rendered component shows the same parts as its default story. |
| VIEW-05 | Field bindings come from the entity mapping of `<et>.<bundle>.full` when it exists; otherwise each prop binds to the bundle field of the same meaning. |
