# Spec: Unified Loader

## Purpose

Single loader in `vite-plugin.ts` that routes all `*.scenes.yml` files through the handler registry.

## Loader Logic

```
load(id) →
  1. matchHandler(basename(id), handlers)
  2. if no match → return undefined
  3. Parse YAML
  4. if spec.* prefix → prepend Overview story (plain HTML)
  5. Build scene stories via ModuleBuilder
  6. Return combined CSF module
```

### Overview Story Generation (for spec.* files)

Reads section metadata from the YAML and generates a plain HTML story:

```javascript
export const Overview = {
  render: () => `
    <div class="debo-section-overview">
      <h1>{title}</h1>
      <p>{description}</p>
      <!-- sample data summary, etc. -->
    </div>
  `,
  parameters: { layout: 'fullscreen' },
};
```

No React, no docs.page — just HTML.

### Scene Story Generation

Unchanged — delegates to `buildSceneModule()` via ModuleBuilder.

## Unified Indexer

Merge section indexer into scenes indexer in `preset.ts`:

- Scan `*.scenes.yml` only (covers all types)
- If `spec.*` prefix → emit Overview entry + scene entries
- If no prefix → scene entries only

## Files

| File | Change |
|------|--------|
| `src/vite-plugin.ts` | Unified loader with handler registry |
| `src/preset.ts` | Merged indexer |
| `src/onboarding/04-shell.mdx` | Delete |
