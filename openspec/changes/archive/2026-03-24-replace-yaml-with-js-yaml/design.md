## Context

`storybook-addon-designbook` depends on the `yaml` package (v2, 124M downloads/week) for all YAML parsing and serialization across ~20 TypeScript source files and 2 test files. The `js-yaml` package (191M downloads/week) is the more widely adopted alternative in the Node.js ecosystem. Additionally, `workflow-resolve.ts` implements `parseFrontmatter()` using a hand-rolled regex to strip `---` delimiters before calling `parseYaml()`, which is fragile and duplicates what the dedicated `front-matter` package handles robustly.

## Goals / Non-Goals

**Goals:**
- Replace `yaml` with `js-yaml` across all 22 files in `storybook-addon-designbook`
- Replace the manual regex-based frontmatter parsing with the `front-matter` package in `workflow-resolve.ts`
- Remove `yaml` from `package.json` dependencies entirely

**Non-Goals:**
- Changing YAML parsing behavior or output format in any user-visible way
- Touching any other packages in the monorepo (e.g., `debo`, CLI tools)
- Adding new YAML parsing functionality

## Decisions

### Decision: Use `js-yaml` `load()` / `dump()` instead of `yaml` `parse()` / `stringify()`

`js-yaml` exports `load()` for parsing and `dump()` for serialization. All existing import aliases (`parse as parseYaml`, `stringify as stringifyYaml`) are preserved as local aliases — only the import source and the function names being aliased change. This keeps call-site diffs minimal.

```ts
// Before
import { parse as parseYaml } from 'yaml';
import { stringify as stringifyYaml } from 'yaml';

// After
import { load as parseYaml } from 'js-yaml';
import { dump as stringifyYaml } from 'js-yaml';
```

Alternatives considered: keeping `yaml` — rejected because `js-yaml` is more widely used and this is a straightforward swap.

### Decision: Use `front-matter` package for `parseFrontmatter()` in workflow-resolve.ts

The `front-matter` package handles the `---` delimiter parsing, encoding edge cases, and passes the body through cleanly. The current regex `/^---\n([\s\S]*?)\n---/` is fragile (e.g., trailing whitespace, Windows line endings). Replacing it with `fm(content).attributes` is simpler and more robust.

```ts
// Before
import { parse as parseYaml } from 'yaml';
// ...
const match = content.match(/^---\n([\s\S]*?)\n---/);
if (!match) return null;
return (parseYaml(match[1]) as Record<string, unknown>) ?? {};

// After
import fm from 'front-matter';
// ...
const result = fm<Record<string, unknown>>(content);
if (!result.frontmatter) return null;
return result.attributes ?? {};
```

The function signature and return type (`Record<string, unknown> | null`) stay identical — all call sites remain unchanged.

### Decision: Add `@types/js-yaml` and `@types/front-matter` as devDependencies

Both packages ship with community `@types` packages. TypeScript types are needed for correct type inference on `load()` return values.

## Risks / Trade-offs

- **Behavioral difference in YAML parsing edge cases** → `js-yaml` and `yaml` have slightly different handling of some YAML 1.2 features (e.g., octal literals, merge keys). All existing YAML files in the project use common YAML 1.1/1.2 subset — no edge cases expected. Mitigation: existing test suite validates parsing behavior.
- **`front-matter` uses `js-yaml` internally** → consistent library usage, no risk of conflicting behavior.
- **`dump()` output formatting differs slightly from `stringify()`** → `js-yaml`'s `dump()` may produce marginally different whitespace in serialized YAML files written by `workflow-utils.ts` and `workflow.ts`. No correctness impact; files remain valid YAML.

## Migration Plan

1. Install `js-yaml`, `front-matter`, `@types/js-yaml`, `@types/front-matter` via npm
2. Update all import statements across 22 files (mechanical find-and-replace)
3. Replace `parseFrontmatter()` body in `workflow-resolve.ts`
4. Remove `yaml` from `package.json` dependencies
5. Run full test suite to verify no regressions

No rollback strategy needed — this is a pure dev-time swap with no data migrations or API changes.

## Open Questions

None. The API mapping is unambiguous and all call sites are internal.
