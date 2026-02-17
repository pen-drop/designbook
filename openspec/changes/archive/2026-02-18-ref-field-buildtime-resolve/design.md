## Context

The designbook Vite plugin + SDC addon render Drupal-style entity components in Storybook. Entity stories use `{type: ref, field: X}` to reference test data loaded from `sections/<sectionId>/data.json`. Two mechanisms are broken:

1. **Entity context is a mutable global** (`globalThis.__designbook_entity_context`). Set in `vite-plugin.ts` when loading a `component.yml`. When a screen composes shell-header + entity + shell-footer, the context gets overwritten — only the last entity survives.
2. **Data from all sections is merged flat** (`store[entityType][bundle][]`). If two sections define the same entity type/bundle, records clobber each other.

### Current code locations

| File | Role |
|------|------|
| `packages/storybook-addon-designbook/src/vite-plugin.ts` | Sets entity context in `load()` hook |
| `packages/integrations/test-integration-drupal/.storybook/designbookStorage.js` | Storage: init, contexts, resolve |
| `packages/integrations/test-integration-drupal/.storybook/refRenderer.js` | SDC addon renderer for `{type: ref}` |

## Goals / Non-Goals

**Goals:**
- Entity `field:` refs resolve correctly when multiple entities are composed in a single screen
- Test data is isolated per section — no cross-section clobbering
- Story authors keep writing `field: title` (DX stays clean)
- `record` is optional; when omitted, a random record is selected at runtime

**Non-Goals:**
- Changing the story YAML syntax (field/path format stays the same)
- Modifying the SDC addon itself (only its renderer plugin)
- Support for cross-section data references (each section is a sealed scope)

## Decisions

### D1: Global section context (from screen), build-time entity expansion

**Choice**: Two-layer resolution — section is a runtime global, entity identity is baked into paths at build time.

**Why**: A screen is the top-level entry point in Storybook; only one screen renders at a time, making a global section safe. Multiple entities can exist within one screen, so entity context cannot be global — it must be per-component. Build-time expansion (`field:` → `path:`) solves this by removing the need for runtime entity context entirely.

**Alternative considered**: Full path everywhere (always `path: blog.node.article.0.title`). Rejected because it's verbose and ties entity stories to a specific section.

**Alternative considered**: Put section on entity `component.yml` too. Rejected because entities are reusable across sections — an `entity-node-article` component should work regardless of which section provides the data.

### D2: resolvePath handles random record selection

**Choice**: When `resolvePath()` encounters an array and the next path segment is not a numeric index, it picks a random element via `Math.floor(Math.random() * array.length)`.

**Why**: Most entity stories don't need a specific record — the random selection ensures visual variety and tests multiple records naturally. Explicit `record: N` in `component.yml` is supported for deterministic rendering when needed.

### D3: Vite plugin rewrites story YAML in the load() hook

**Choice**: The `load()` hook reads `.story.yml` files for entity components, parses YAML, walks the tree to find `{type: ref, field: X}` nodes, reads entity metadata from the sibling `.component.yml`, builds `path: entityType.bundle.[record.]fieldPath`, and returns the rewritten YAML as a virtual module string.

**Why**: The `load()` hook runs before the SDC addon processes the story, so it can transparently transform `field:` to `path:`. The SDC addon never sees `field:` — only `path:`.

**Important**: The Vite plugin must NOT intercept `.story.yml` loading for non-entity components. Only entity components (those with `designbook.entity` in their `component.yml`) get this treatment.

### D4: Section context set when loading screen component.yml

**Choice**: When the Vite plugin `load()` hook processes a `.component.yml` that contains `designbook.section`, it sets `globalThis.__designbook_section = sectionId`. This replaces the previous `__designbook_entity_context` global.

**Why**: Screen components are the entry point. Setting the section at this point ensures all downstream entity rendering uses the correct section for data resolution.

### D5: Storage keyed by section

**Choice**: `initStorage()` reads each `sections/<id>/data.json` and stores it under `store[sectionId]`, yielding `store[sectionId][entityType][bundle][]`.

**Why**: Clean isolation. `resolvePath('node.article.title')` prefixes the path with `__designbook_section` to get `store[blog].node.article[random].title`.

## Risks / Trade-offs

- **Build-time YAML rewriting adds complexity to the Vite plugin** → Mitigated by keeping the transformation minimal (only `{type: ref, field: X}` nodes) and well-isolated in a helper function.
- **Random record is non-deterministic** → Acceptable for design previews. If determinism is needed (e.g., screenshots), authors set an explicit `record: N`.
- **Section global survives across HMR** → Same risk as the old entity context global. Since Storybook renders one story at a time, this is safe. On story switch, the new screen's section overwrites the global.
- **Entity stories viewed standalone (not via screen)** → `__designbook_section` may not be set. `resolvePath()` should fall back gracefully with a warning.

## Open Questions

_(none — all decisions resolved during proposal discussion)_
