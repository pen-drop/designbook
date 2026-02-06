## Why

The data model is the next logical workflow after product vision and roadmap. Once you know what you're building and what the development sections are, you need to define the core data entities and their relationships. In Design OS, `/data-model` captures entities, their fields, and how they relate to each other. In Designbook, this should appear as its own Storybook page ("Data Model") — separate from Product because it represents a different domain (data architecture vs. product strategy).

## What Changes

- **New MDX page**: Create `.storybook/onboarding/data-model.mdx` with `<Meta title="Data Model" />`, using `DeboSection` for data loading and a new `DataModelCard` component for display
- **New AI command**: Create `/data-model` command in `.cursor/commands/` that reads the existing product vision and roadmap for context, guides the user through defining entities and relationships, and saves to `designbook/data-model/data-model.md`
- **New display component**: Create `DataModelCard` in `.storybook/source/components/` that renders entities with their fields and relationships using `DeboCard` and `DeboCollapsible` base components
- **Reuse existing infrastructure**: Same Vite plugin middleware (`/__designbook/load`), same `debo:` CSS prefix, same `DeboSection` pattern, same architectural principle (AI writes, Storybook reads)

## Capabilities

### New Capabilities
- `data-model-workflow`: AI command-driven workflow that reads the product vision and roadmap for context, guides the user through defining core entities (name, description, fields with types) and relationships between entities, and saves to `designbook/data-model/data-model.md`. Displayed as a read-only page in Storybook using shared Debo components.
- `data-model-react-components`: Display component `DataModelCard` that renders a list of entities with their fields, types, and relationships. Composed from `DeboCard` and `DeboCollapsible` shared components.

### Modified Capabilities
- `designbook-shared-components`: Export `DataModelCard` from the component index (additive only)

## Impact

- **New files**:
  - `.storybook/onboarding/data-model.mdx` — Storybook page
  - `.cursor/commands/data-model.md` — AI command
  - `.storybook/source/components/DataModelCard.jsx` — Display component
  - `designbook/data-model/data-model.md` — Saved data (created by AI command)
- **Modified files**:
  - `.storybook/source/components/index.js` — Add `DataModelCard` export
- **Dependencies**: None new — reuses existing Vite plugin middleware, React/Tailwind setup, and `Debo*` shared components
