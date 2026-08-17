---
trigger:
  domain: [data-model]
---

# Rule: Presenter-Template vs Declarative Template

A view mode or form mode's `template` selects how the entity is presented. Every template is one
of two kinds, and which kind a mode needs is **decidable** — never a per-case judgement:

- A **declarative template** renders the mode through display **config** the backend interprets:
  the presentation is expressed as data — component bindings, props, slots — that a declarative
  display layer resolves. This is the normal case.
- A **presenter-template** (`template: presenter`) renders the mode through generated
  **backend-native presentation markup** (a backend-native template) for a presentation the config
  layer cannot express. It stands **beside** the declarative templates — a peer kind, not a replacement.

## The decision (deterministic)

For each view mode / form mode, ask one question: **can this mode's presentation be expressed as
declarative display config?**

- **Yes → a declarative template** (config only). The mode carries a declarative template value
  and generates no presenter-template.
- **No — the presentation binds only through backend-native markup → `template: presenter`.** The
  mode carries `presenter`; a presenter-template is generated for it.

Which surfaces are declaratively bindable and which are markup-only is the concrete criterion of
the active backend integration — its rules name the bindable surfaces and the markup-only ones.
The two-kinds split and the one-question decision above hold regardless of backend, so for every
bundle and every mode the answer is determined, not guessed.

## Where the presenter-template is generated

The data model only **declares** `template: presenter`. The presenter-template artifact itself is
produced when the model is synced to the backend — the sync writes it alongside the mode's display
config — and its concrete form and location are the backend integration's concern. Declaring
`presenter` is authoring-time; generating the markup is sync-time.
