## Context

The `designbook-scenes` skill currently has 5 tasks, 2 rules, and 4 resources spread across files that mix concept explanation with step-by-step instructions. The AI often gets confused about what scenes *are* vs. the procedures for building them. The `scene-node-duck-typing` change introduces `scene:` key format, requiring all examples to be updated anyway — a natural time to rewrite.

## Goals / Non-Goals

**Goals:**
- AI understands the three core concepts: Shell (frame), Section (page), Entity-Mapping (data → components)
- AI understands that all SceneNodes resolve to `ComponentNode[]`
- JSON Schema as the authoritative reference for `*.scenes.yml` format
- Tasks are output-focused: input + output + constraints, not step-by-step procedures
- Clean separation: `designbook-scenes` = concepts + format, `designbook-scenes-drupal` = Drupal field mapping rules

**Non-Goals:**
- Changing addon code (that's `scene-node-duck-typing`)
- Changing task interfaces (params, files, reads frontmatter) — workflows depend on these
- Adding new tasks or removing existing ones

## Decisions

### 1. JSON Schema replaces scattered prose references

**Decision:** Create `resources/scenes-schema.md` containing a YAML-formatted JSON Schema for the `*.scenes.yml` format, and `resources/jsonata-output-schema.md` for the JSONata output format.

**Rationale:** A schema is unambiguous — the AI can validate its own output against it. Prose descriptions (entry-types.md, field-reference.md) are redundant with a good schema + one example. The schema also serves as the single source of truth for the duck-typed node format.

**Alternatives considered:**
- Actual `.json` schema file — rejected because the AI reads markdown better, and we don't need programmatic validation here
- Single combined schema — rejected because scenes.yml and JSONata output are different formats consumed differently

### 2. SKILL.md is concept-only, tasks are output-only

**Decision:** SKILL.md explains Shell/Section/Entity-Mapping conceptually with one complete example each. Tasks define input → output → constraints without prescribing steps.

**Rationale:** The AI is better at building structure when it understands the *goal* than when following a script. Step-by-step instructions lead to rigid output. The AI should compose scenes based on the available components and data, not follow a recipe.

### 3. Consolidate resources from 4 files to 3

**Decision:**
- `resources/scenes-schema.md` — JSON Schema for `*.scenes.yml` (replaces entry-types.md + field-reference.md)
- `resources/jsonata-reference.md` — JSONata output format + syntax (kept, updated)
- `resources/scenes-constraints.md` — examples for each constraint (kept, updated with `scene:` format)

**Rationale:** entry-types.md and field-reference.md overlap heavily — both describe the YAML structure. A schema captures both precisely. The JSONata reference stays separate because it's a different format. Constraints with examples stay because they prevent common mistakes.

### 4. Rules stay as-is (content updated)

**Decision:** Keep `rules/scenes-constraints.md` and `rules/listing-pattern.md`. Update examples to use `scene:` format.

**Rationale:** Rules are loaded by stage via frontmatter — changing their structure would require workflow changes. The content just needs `scene:` format updates.

## Risks / Trade-offs

- **Schema might be too rigid** → Mitigate by keeping it descriptive (documenting what the addon accepts) rather than prescriptive. Include `additionalProperties: true` where the addon is lenient.
- **Less guidance might confuse the AI** → Mitigate by having one complete Shell example and one complete Section example in SKILL.md. The AI learns by example better than by instruction.
- **Task interface compatibility** → Mitigate by preserving all frontmatter (params, files, reads) exactly. Only the task body changes.
