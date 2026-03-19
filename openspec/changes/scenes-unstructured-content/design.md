## Context

The `entityBuilder` currently always loads a `.jsonata` file to resolve entity nodes. For unstructured bundles (`composition: unstructured`), the full view mode has no field-based mapping — the component tree is statically authored. Requiring a JSONata file for this case adds unnecessary indirection with no benefit.

The key insight: `entityBuilder.build()` already returns `RawNode[]`, which is exactly what an inline `components:` array contains. The `resolveEntityRefs()` call in the registry already handles recursive resolution of nested entity/scene refs. So the inline path is a single early-return that plugs into the existing pipeline with zero structural changes.

## Goals / Non-Goals

**Goals:**
- Entity nodes in scenes.yml can carry `components: RawNode[]` inline — no JSONata file required
- Nested entity refs inside inline `components` slots are resolved recursively (same as today)
- `EntitySceneNode` type is extended with `components?: RawNode[]`
- `designbook-scenes` skill documents the structured vs unstructured authoring patterns as rules
- `bundle-composition` spec updated to reflect that JSONata file is NOT required for unstructured preview

**Non-Goals:**
- No change to how structured bundles work
- No change to how JSONata expressions are evaluated
- No validation that `components` is only used when `composition: unstructured`
- No runtime Drupal integration (scenes.yml is preview-only)

## Decisions

### Decision: Key name is `components`

The inline array key on the entity node is named `components` (not `items`, `tree`, or `nodes`).

**Why**: `ComponentNode[]` is the type the entityBuilder already returns. Using `components` makes the structural match explicit — the inline array IS the builder output, just authored statically.

**Alternative considered**: `items` — already used at scene level (`SceneDef.items`), would be ambiguous.

### Decision: Early return in entityBuilder, not a new builder

The inline path is handled inside the existing `entityBuilder`, not as a separate builder registered in the registry.

**Why**: The node is still an entity node (duck-typed by `entity:` key presence). A separate builder would require a new `appliesTo` that competes with `entityBuilder`, creating ordering ambiguity. An early return keeps the logic co-located and the change minimal (~3 lines).

### Decision: No composition validation at build time

The entityBuilder does NOT check data-model.yml to verify that `composition: unstructured` before accepting inline `components`.

**Why**: Scenes are preview artifacts — strict validation would add I/O per entity node. The skill rules are the authoring-time guardrail. A missing JSONata file already produces a visible placeholder, which is sufficient feedback if someone uses `components:` on a structured bundle by mistake.

### Decision: Skill uses rules/, not separate tasks

Two rule files in `.agents/skills/designbook-scenes/rules/` instead of separate task files per composition type.

**Why**: The scene creation task (`create-scene.md`) is a single entry point. Rules are reference material that the task consults. Splitting into separate tasks would require the agent to choose a task before understanding the data, whereas a single task that reads the data-model and selects a rule is more natural.

## Risks / Trade-offs

- **[Risk] Inline components bypass sample data** → No impact. Unstructured bundles have no field-based content. Sample data is only needed for field bindings.
- **[Risk] Type widening on EntitySceneNode** → `components?: RawNode[]` is optional and additive. Existing code that processes `EntitySceneNode` ignores unknown keys, so no breakage.

## Migration Plan

No migration needed. Change is purely additive — existing scenes.yml files and JSONata expressions are unaffected.
