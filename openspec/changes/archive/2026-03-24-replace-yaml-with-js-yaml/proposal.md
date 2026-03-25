## Why

The `yaml` package (124M downloads/week) used throughout `storybook-addon-designbook` is less widely adopted than `js-yaml` (191M downloads/week), which is the de-facto standard for YAML parsing in the Node.js ecosystem. Switching reduces bundle weight concerns and aligns with the broader ecosystem. Additionally, frontmatter parsing in `workflow-resolve.ts` is currently done via hand-rolled regex + manual YAML splitting, which should be replaced with the dedicated `front-matter` package for correctness and maintainability.

## What Changes

- Replace all `import { parse as parseYaml } from 'yaml'` with `import { load as parseYaml } from 'js-yaml'` across 20 source files
- Replace all `import { stringify as stringifyYaml } from 'yaml'` with `import { dump as stringifyYaml } from 'js-yaml'` in files that use stringify (workflow-utils.ts, workflow.ts, and test files)
- Add `front-matter` package import to `workflow-resolve.ts`; replace the manual regex + YAML-split `parseFrontmatter()` implementation with a `fm()` call
- Remove `yaml` from `dependencies` in `packages/storybook-addon-designbook/package.json`
- Add `js-yaml` and `front-matter` to `dependencies` in `packages/storybook-addon-designbook/package.json`
- Add `@types/js-yaml` and `@types/front-matter` to `devDependencies`

## Capabilities

### New Capabilities

None. This is a pure dependency swap with no user-visible behavior changes.

### Modified Capabilities

- `designbook-configuration`: No requirement change — implementation detail only (YAML parsing library swap). Not listed as spec delta.

## Impact

- **Files affected**: 20 TypeScript source files + 2 test files in `packages/storybook-addon-designbook/src/`
- **package.json**: `yaml` removed, `js-yaml` + `front-matter` added as runtime deps; `@types/js-yaml` + `@types/front-matter` added as devDeps
- **API mapping**: `parse()` → `load()`, `stringify()` → `dump()` (js-yaml uses different export names)
- **`parseFrontmatter()` in workflow-resolve.ts**: regex-based implementation replaced with `front-matter` package call; return type and call sites unchanged
- **No breaking changes** to the public API of `storybook-addon-designbook`
