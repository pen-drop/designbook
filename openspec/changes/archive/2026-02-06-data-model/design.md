## Context

The product-vision and product-roadmap workflows established the Designbook architecture pattern: read-only Storybook display, AI command input, `debo:` CSS isolation, Vite plugin middleware, file-based storage in `designbook/`, and shared `Debo*` components (`DeboSection`, `DeboCard`, `DeboCollapsible`, etc.).

In Design OS, `/data-model` is the third planning step after product vision and roadmap. It defines the "nouns" of the system — core entities, their descriptions, and relationships. The Design OS implementation uses a simple `DataModel` structure: `{ entities: [{ name, description }], relationships: string[] }`. The data model is intentionally minimal and conceptual — no field types, no schemas, just what each entity represents and how they connect.

## Goals / Non-Goals

**Goals:**
- Create a "Data Model" Storybook page following the established Designbook pattern
- Create `/data-model` AI command that reads product vision and roadmap for context
- Create `DataModelCard` display component composed from `DeboCard` and `DeboCollapsible`
- Follow the Design OS markdown format exactly for parser compatibility
- Store data at `designbook/data-model/data-model.md`

**Non-Goals:**
- Changing the established architecture (Storybook reads, AI writes)
- Defining field types, schemas, or validation rules (keep it conceptual per Design OS philosophy)
- Creating new shared components (reuse existing `Debo*` library)
- Building entity relationship diagrams or visual graph representations

## Decisions

### Decision 1: Separate Storybook Page (Not a Section on Product Page)

**Choice:** Data Model gets its own page at `.storybook/onboarding/data-model.mdx` with `<Meta title="Data Model" />`, separate from the Product page.

**Rationale:**
- Product vision and roadmap are closely related (roadmap builds on vision) — they belong together
- Data model is a different domain: data architecture vs. product strategy
- In Design OS, data model is its own page/phase
- Keeps Storybook navigation clean and semantically meaningful

### Decision 2: Data Storage Path Mirrors Design OS

**Choice:** Store at `designbook/data-model/data-model.md` (mirroring Design OS's `product/data-model/data-model.md`).

**Rationale:**
- Consistent with Design OS file structure
- Dedicated directory allows for future extensions (e.g., per-section data models)
- Separates data model files from product files

### Decision 3: DataModelCard with Entities Grid + Relationships List

**Choice:** `DataModelCard` displays entities in a 2-column grid of cards (name + description) and relationships as a bulleted list, both inside `DeboCollapsible` sections. Mirrors Design OS's `DataModelPage.tsx` layout.

**Rationale:**
- Grid layout gives a quick visual overview of all entities
- Each entity gets a small card with name and description (like Design OS)
- Relationships are simple strings displayed as a list (matching the minimal data model philosophy)
- Composed from `DeboCard` + `DeboCollapsible` for consistency with `ProductOverviewCard`

### Decision 4: Parser Follows Design OS Format Exactly

**Choice:** The parser expects the exact same markdown format as Design OS:
```
# Data Model
## Entities
### EntityName
Description text
## Relationships
- Entity has many OtherEntity
```

**Rationale:**
- Direct compatibility with Design OS output
- Simple, well-defined format that's easy to parse
- Consistent with how product-vision and product-roadmap parsers work

### Decision 5: AI Command Reads Vision + Roadmap for Context

**Choice:** The `/data-model` command reads both `designbook/product/product-overview.md` and `designbook/product/product-roadmap.md` before proposing entities. If neither exists, it redirects to `/product-vision`.

**Rationale:**
- Mirrors Design OS behavior (checks prerequisites)
- Entities should be informed by the product's problems, features, and sections
- Better AI proposals when context is available

## Risks / Trade-offs

### Trade-off: Minimal Data Model (No Field Types)
**Acceptance:** Following Design OS philosophy — the data model captures what entities represent conceptually, not their database schema. This is intentional: detailed schemas come during implementation.

### Risk: Grid Layout on Small Screens
**Mitigation:** Use responsive grid (`sm:grid-cols-2`) that falls back to single column on mobile, same as Design OS.
