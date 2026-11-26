---
trigger:
  domain: [data-model]
---

# Rule: Theme Builder vs Declarative Builder

A view mode or form mode's `builder` selects how the entity is presented. Every builder is one of
two kinds, and which kind a mode needs is **decidable** — never a per-case judgement:

- A **declarative builder** renders the mode through display **config** the backend interprets:
  the presentation is expressed as data — component bindings, props, slots — that a declarative
  display layer resolves. This is the normal case.
- The **theme builder** (`builder: theme`) renders the mode through generated
  **backend-native presentation markup** (a theme template) for a presentation the config layer
  cannot express. It stands **beside** the declarative builders — a peer kind, not a replacement.

## The decision (deterministic)

For each view mode / form mode, ask one question: **can this mode's presentation be expressed as
declarative display config?**

- **Yes → a declarative builder** (config only). The mode carries a declarative builder value
  and generates no theme template.
- **No — the presentation binds only through backend-native markup → `builder: theme`.** A
  theme template is generated for the mode.

Which surfaces are declaratively bindable and which are markup-only is the concrete criterion of
the active backend integration — its rules name the bindable surfaces and the markup-only ones.
The two-kinds split and the one-question decision above hold regardless of backend, so for every
bundle and every mode the answer is determined, not guessed.

## Where the theme template is generated

The data model only **declares** `builder: theme`. The theme template artifact itself is
produced when the model is synced to the backend — the sync writes it alongside the mode's display
config — and its concrete form and location are the backend integration's concern. Declaring
`theme` is authoring-time; generating the markup is sync-time.
