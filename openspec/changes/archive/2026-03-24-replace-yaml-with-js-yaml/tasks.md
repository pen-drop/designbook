## 1. Install Dependencies

- [x] 1.1 Run `pnpm --filter storybook-addon-designbook add js-yaml front-matter`
- [x] 1.2 Run `pnpm --filter storybook-addon-designbook add -D @types/js-yaml @types/front-matter`
- [x] 1.3 Run `pnpm --filter storybook-addon-designbook remove yaml`

## 2. Replace yaml Imports with js-yaml

- [x] 2.1 Update `src/vite-plugin.ts`: replace `import { parse as parseYaml } from 'yaml'` with `import { load as parseYaml } from 'js-yaml'`
- [x] 2.2 Update `src/screenshot.ts`: same import replacement
- [x] 2.3 Update `src/workflow-utils.ts`: replace `import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'` with `import { load as parseYaml, dump as stringifyYaml } from 'js-yaml'`
- [x] 2.4 Update `src/config.ts`: replace parse import
- [x] 2.5 Update `src/preset.ts`: replace parse import
- [x] 2.6 Update `src/cli.ts`: replace parse import
- [x] 2.7 Update `src/workflow.ts`: replace `import { stringify as stringifyYaml, parse as parseYaml } from 'yaml'` with `import { dump as stringifyYaml, load as parseYaml } from 'js-yaml'`
- [x] 2.8 Update `src/validation-registry.ts`: replace parse import (if present)
- [x] 2.9 Update `src/validators/data.ts`: replace parse import
- [x] 2.10 Update `src/validators/data-model.ts`: replace parse import
- [x] 2.11 Update `src/validators/tokens.ts`: replace parse import
- [x] 2.12 Update `src/validators/scene.ts`: replace parse import
- [x] 2.13 Update `src/validators/component.ts`: replace parse import
- [x] 2.14 Update `src/validators/entity-mapping.ts`: replace parse import
- [x] 2.15 Update `src/renderer/scene-module-builder.ts`: replace parse import
- [x] 2.16 Update `src/renderer/builders/scene-builder.ts`: replace parse import
- [x] 2.17 Update `src/renderer/builders/__tests__/scene-builder.test.ts`: replace parse import
- [x] 2.18 Update `src/renderer/__tests__/scene-module-builder.test.ts`: replace parse import
- [x] 2.19 Update `src/validators/__tests__/workflow-files.test.ts`: replace parse + stringify imports
- [x] 2.20 Update `src/validators/__tests__/workflow.test.ts`: replace parse + stringify imports

## 3. Replace parseFrontmatter Implementation

- [x] 3.1 In `src/workflow-resolve.ts`, replace `import { parse as parseYaml } from 'yaml'` with `import fm from 'front-matter'`
- [x] 3.2 Rewrite `parseFrontmatter()` body to use `fm(content)`: call `fm<Record<string, unknown>>(content)`, return `result.attributes ?? {}` if `result.frontmatter` is truthy, else `null`
- [x] 3.3 Verify all call sites of `parseFrontmatter()` still compile (signature is unchanged)

## 4. Verify

- [x] 4.1 Run `tsc --noEmit` in `packages/storybook-addon-designbook` — no type errors
- [x] 4.2 Run the full test suite for `storybook-addon-designbook` — all tests pass
- [x] 4.3 Confirm `yaml` does not appear anywhere in `packages/storybook-addon-designbook/src/` imports
