# Screen Renderer — Addon Internals

Technical documentation for the `*.screen.yml` rendering pipeline in `storybook-addon-designbook`.

## Architecture

```
*.screen.yml  →  Screen Parser  →  Screen Resolver  →  SDC Rendering
                 (parse YAML)      (resolve entities)   (import component.yml → Twig)
```

### Modules

| Module | Path | Responsibility |
|--------|------|----------------|
| Types | `src/screen/types.ts` | `ScreenDef`, `ScreenEntityEntry`, `ScreenComponentEntry`, type guards |
| Parser | `src/screen/parser.ts` | YAML → `ScreenDef`, expands `records: [0,1,2]` shorthand |
| Resolver | `src/screen/resolver.ts` | Resolves entity entries to `ComponentNode[]` via `entity/resolver.ts` |
| Indexer | `src/preset.ts` (`screenIndexer`) | Discovers `*.screen.yml` for Storybook sidebar |
| Loader | `src/vite-plugin.ts` (`loadScreenYml`) | Generates CSF module with component imports + Twig render calls |

### Entity Resolution Chain

1. Parser reads YAML and expands `records` shorthand
2. Resolver reads `data-model.yml` → `content.[entity_type].[bundle].view_modes.[mode].mapping[]`
3. Resolver loads sample data from `sections/{section}/data.yml`
4. `$field_name` references in mapping props/slots are resolved against sample record
5. Returns `ComponentNode[]` ready for rendering
6. Nested entity refs in slot values are resolved recursively

### SDC Rendering (Loader)

The Vite `load` hook generates a CSF module for each `*.screen.yml`:

1. Collects all unique component names from resolved screen
2. Generates `import * as <kebabName> from '<path>/component.yml'` for each
3. Generates render function calling `<kebabName>.default.component({...resolvedArgs})`
4. SDC's Twig plugin handles the actual `.twig` → HTML rendering

### Globs

- **Preset**: `sections/*/screens/*.screen.yml`
- **Storybook config**: `../designbook/sections/*/screens/*.screen.yml`

### Tests

- `src/screen/__tests__/parser.test.ts` — 10 tests
- `src/screen/__tests__/resolver.test.ts` — 12 tests

```bash
pnpm test  # runs vitest
```

### Shared Dependencies

- `entity/types.ts` — `DataModel`, `SampleData`, `ComponentNode`, `EntityRef`
- `entity/resolver.ts` — `resolveEntity()` (pure function, reused by screen resolver)
