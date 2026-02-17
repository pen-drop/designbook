## Why

Two problems with the current `{type: ref}` resolution:

1. **Broken global entity context**: `{type: ref, field: X}` relies on a global `__designbook_entity_context` set by the Vite plugin during component loading. When a screen composes multiple entity components (e.g., shell-header + entity-node-article + shell-footer), the context gets overwritten. Only the last entity's context survives, breaking field resolution.

2. **No section scoping**: `initStorage()` merges all `data.json` files from all sections into one flat store. If "blog" and "news" both define `node.article` records, they clobber each other. Test data should be isolated per section.

## What Changes

- **Remove global entity context**: Eliminate `setContext()`, `getContext()`, and `globalThis.__designbook_entity_context` from `designbookStorage.js`.
- **Section-scoped storage**: Change the store structure from `store[entityType][bundle][record]` to `store[sectionId][entityType][bundle][record]`. Each section's `data.json` is loaded under its section key.
- **Global section context** (replaces entity context): Screen `component.yml` files carry `designbook.section: <sectionId>`. When the Vite plugin loads a screen component, it sets `globalThis.__designbook_section = sectionId`. This is safe because only one screen renders at a time in Storybook.
- **Build-time field-to-path expansion**: In the Vite plugin, when loading an entity component's `.story.yml`, read `designbook.entity` from the entity's `component.yml` and rewrite all `{type: ref, field: X}` to `{type: ref, path: <entityType>.<bundle>.<record>.X}`. The path does NOT include the section — that's resolved at runtime.
- **Runtime section scoping in refRenderer**: `resolvePath(path)` reads the global `__designbook_section` and resolves the path against `store[section]`. So `path: node.article.0.title` resolves to `store[blog].node.article[0].title` when the active section is "blog".
- **Simplify refRenderer**: Only handles `path:` — no `field:` branch, no entity context.

### Metadata placement

```yaml
# Screen component.yml — carries the section
designbook:
  section: blog

# Entity component.yml — carries the entity identity (NO record by default)
designbook:
  entity:
    type: node
    bundle: article
    # record: 0  ← optional, omit for random selection
```

### Resolution flow

**With record (explicit):**
```
field: title  →  path: node.article.0.title  →  store['blog'].node.article[0].title
```

**Without record (random):**
```
field: title  →  path: node.article.title  →  store['blog'].node.article[randomIndex].title
```

When `resolvePath()` encounters an array (e.g., `store['blog'].node.article` is an array) and the next path segment is NOT a numeric index, it picks a random element from the array and continues resolving from there.

## Capabilities

### New Capabilities
- `ref-buildtime-resolve`: Build-time expansion of `{type: ref, field: X}` to `{type: ref, path: entityType.bundle.[record.]X}` in the Vite plugin. Record index is optional — when omitted, `resolvePath()` picks a random record at runtime. Combined with runtime section scoping. Enables correct multi-entity rendering and per-section test data isolation.

### Modified Capabilities
_(none — no existing spec-level requirements change)_

## Impact

- **`packages/storybook-addon-designbook/src/vite-plugin.ts`**: (1) Set `globalThis.__designbook_section` when loading screen `component.yml` with `designbook.section`. (2) When loading entity `.story.yml`, read `designbook.entity` from sibling `component.yml` and rewrite `field:` refs to `path:` refs.
- **`packages/integrations/test-integration-drupal/.storybook/designbookStorage.js`**: Restructure store to `store[section][entityType][bundle][]`. Remove `setContext()`, `getContext()`, `resolveField()`. `resolvePath()` reads `__designbook_section` and navigates the section-keyed store.
- **`packages/integrations/test-integration-drupal/.storybook/refRenderer.js`**: Simplify to only handle `path:` — no `field:` branch.
- **Screen `component.yml` files**: Add `designbook.section: <sectionId>`.
- **`.agent/skills/designbook-entity/SKILL.md`**: Document that `field:` is build-time sugar.
- **`.agent/skills/designbook-screen/SKILL.md`**: Document `designbook.section` on screen components.
- **No breaking change for story authors**: `field:` syntax in `.story.yml` remains valid — transparently expanded.

