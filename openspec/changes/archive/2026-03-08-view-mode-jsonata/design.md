## Context

The `storybook-addon-designbook` Vite plugin currently resolves entity view-mode mappings using a custom `$field_name` micro-syntax embedded in `data-model.yml`. The rendering is handled by a monolithic `renderNode()` closure inside `loadScreenYml()` in `vite-plugin.ts` (~400 lines). This makes the mapping logic untestable in isolation, limited in expressiveness, and tightly coupled to the SDC/Twig rendering approach.

The project already uses JSONata for CSS token generation via `jsonata-w`. The `jsonata` npm library provides the same expression evaluation capability that can replace the custom interpreter.

**Current pipeline:**
```
screen.yml → parser → resolver (data-model.yml + $field_name) → renderNode() (hardcoded SDC) → CSF module
```

**Proposed pipeline:**
```
screen.yml → parser → RendererRegistry → entityRenderer (.jsonata + jsonata lib) → CSF module
                                       → sdcRenderer (component nodes)
                                       → integrationRenderers (custom node types)
```

## Goals / Non-Goals

**Goals:**
- Extract view-mode mappings from `data-model.yml` into separate `.jsonata` files
- Evaluate expressions in-memory via `jsonata` npm library (no file generation)
- Extract `renderNode()` into a pluggable `ScreenNodeRenderer` registry
- Allow integrations to register custom renderers via addon options
- Make mapping logic independently testable (Vitest + jsonata-w CLI)
- Maintain full backward compatibility for `.screen.yml` format

**Non-Goals:**
- React/Vue adapters (future scope — registry makes this possible but not implemented now)
- `jsonata-w` CLI integration at runtime (dev-only tool for testing expressions)
- Auto-migration tool from `$field_name` syntax to JSONata (manual migration)
- Changes to the `.screen.yml` file format itself

## Decisions

### D1: JSONata for mapping expressions (over Handlebars, Nunjucks, custom DSL)

**Choice:** JSONata

**Rationale:**
- Already in the ecosystem via `jsonata-w` (tooling exists)
- Purpose-built for data querying/transformation (not string templating)
- Supports conditionals, fallbacks, array operations, string transforms out of the box
- Expressions return structured data (objects/arrays), not strings — fits `ComponentNode[]` output
- ~130KB runtime, no DOM dependency

**Alternatives considered:**
- Handlebars/Nunjucks: String template engines — wrong abstraction for producing data structures
- Custom DSL: Would require implementing features JSONata already has
- Keeping `$field_name`: Too limited for real-world mapping needs

### D2: Separate `.jsonata` files (over inline expressions in YAML)

**Choice:** Separate files in `view-modes/` directory

**Rationale:**
- Each expression is independently testable via `jsonata-w inspect`
- Clean separation of concerns: data-model = schema, view-modes = display logic
- AI agents can generate/validate expressions without touching schema
- File naming convention (`{entity_type}.{bundle}.{view_mode}.jsonata`) is self-documenting

**Alternatives considered:**
- Inline JSONata in YAML strings: Escaping issues, harder to test, mixes concerns
- JSONata embedded in `data-model.yml`: Same mixing problem as current `$field_name`

### D3: In-memory evaluation via `jsonata` library (over `jsonata-w` CLI)

**Choice:** Use `jsonata` npm library directly at runtime

**Rationale:**
- `jsonata-w` is a CLI tool that reads/writes files — wrong for in-memory transforms
- `jsonata` library provides `jsonata(expr).evaluate(data)` API — exactly what we need
- Same library that `jsonata-w` uses internally — identical expression semantics
- Compiled expressions can be cached (compile once, evaluate many times per record)

### D4: Renderer registry with priority (over hardcoded if/else chain)

**Choice:** `ScreenNodeRenderer[]` with `appliesTo()` + priority-based dispatch

**Rationale:**
- Follows same pattern as `sdc-addon`'s `storyNodesRenderer` — familiar to integration authors
- Built-in renderers at priority -10, integration renderers at 0+ — easy to override
- Registry service is a simple ~30 line class — low complexity
- Enables future React/Vue adapters without core changes

### D5: `RenderContext` carries all metadata (over global state or dependency injection)

**Choice:** Explicit context object passed to every renderer

**Rationale:**
- Makes renderer functions pure (input → output) — easy to test with mock context
- All metadata (dataModel, sampleData, provider, expressionCache) in one place
- No global state, no singletons, no framework-specific IoC
- Context is created per `loadScreenYml()` call — no stale state

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| JSONata adds ~130KB to addon bundle | Minor bundle size increase | Tree-shakeable, only loaded for screen rendering. Acceptable for dev tooling |
| Breaking change for existing data-model.yml files | All integrations must migrate view_modes | Clear migration guide in spec. Manual migration is straightforward (move mapping logic to .jsonata files) |
| JSONata learning curve for skill authors | AI agents need to generate valid JSONata | `jsonata-w inspect` provides immediate feedback loop. JSONata syntax is simpler than the custom `$field_name` syntax for complex cases |
| Expression caching memory usage | Compiled expressions cached in memory | Bounded by number of unique view-mode files (typically <20). Invalidated on HMR |
| Existing tests break | `resolver.test.ts` uses `$field_name` fixtures | Tests must be rewritten to use `.jsonata` fixture files. Same assertion structure |

## Migration Plan

1. Add `jsonata` dependency to addon `package.json`
2. Create `ScreenNodeRenderService` with built-in renderers
3. Refactor `loadScreenYml()` to use registry instead of inline `renderNode()`
4. Create `.jsonata` fixture files for tests, rewrite `resolver.test.ts`
5. Migrate `test-integration-drupal` data-model.yml (remove `view_modes`, create `view-modes/*.jsonata`)
6. Update skills (`designbook-data-model`, `designbook-screen`)
7. Verify with `pnpm test` + Storybook build
8. Publish new addon version

**Rollback:** Revert commits. No database/infrastructure changes involved.

## Open Questions

- Should the field-to-component mapping guide become a new `designbook-view-modes` skill, or stay integrated in `designbook-screen`?
