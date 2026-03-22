## Why

The `designbook-scenes` and `designbook-scenes-drupal` skills are too procedural — they explain HOW to build scenes step-by-step rather than teaching WHAT scenes are. The AI should understand the concept (Shell = frame, Section = page, Entity-Mapping = data → components) and build the structure itself. The skills also need to reflect the new duck-typed `scene:` key format (from `scene-node-duck-typing` change).

## What Changes

- **Rewrite `designbook-scenes` SKILL.md** — concept-first explanation: Shell, Section, Entity-Mapping as three core ideas, with the unifying principle that everything resolves to `ComponentNode[]`
- **Add JSON Schema as reference** — replace scattered prose docs (entry-types.md, field-reference.md) with a single schema that precisely defines the `*.scenes.yml` format and JSONata output format
- **Rewrite `designbook-scenes-drupal` SKILL.md** — focused on what Drupal-specific rules add to the base scenes concept
- **Simplify resources** — consolidate entry-types.md, field-reference.md, and scenes-constraints.md into schema + one concise reference
- **Update tasks** — make tasks output-focused (input → output + constraints) rather than step-by-step procedural
- **Use `scene:` key format** — all examples and references use the new duck-typed format (`scene: "source:name"` instead of `type: scene` + `ref:`)

## Capabilities

### New Capabilities
- `scenes-skill-structure`: Defines the new structure, content, and organization of the rewritten designbook-scenes and designbook-scenes-drupal skills

### Modified Capabilities

_(no spec-level behavior changes — this is a skill documentation rewrite, not an addon code change)_

## Impact

- `.agents/skills/designbook-scenes/` — all files rewritten or reorganized
- `.agents/skills/designbook-scenes-drupal/` — SKILL.md and resources rewritten
- No addon code changes (that's `scene-node-duck-typing`)
- Workflows `debo-design-shell` and `debo-design-screen` call these tasks — task interfaces (params, files, reads) must stay compatible
