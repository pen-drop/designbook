# story-validation Specification

## Purpose
Defines story validation via Vite SSR rendering in Node.js, without browser or Playwright.

## Requirements

### Requirement: Story rendering via Vite SSR
The addon CLI SHALL validate stories using Vite's `ssrLoadModule` API with the project's Storybook Vite plugin chain. No browser required.

Implementation:
- Import `.storybook/main.js` from `storybook.configDir` (via `loadConfig()`, walk-up fallback from `outputs.root`)
- Extract addon configs, call each preset's `viteFinal` to build Vite server config
- Create Vite server, `ssrLoadModule` each story file
- Call `render(args)` on each named export (skip `default`)
- Capture returned HTML on success, error message on failure

- Valid story outputs `{ "valid": true, "label": "button.default", "html": "<button>...</button>" }`, exit 0
- Scene story outputs one JSON line per scene with `"valid": true` and HTML
- Twig error outputs `{ "valid": false, "label": "button.default", "error": "..." }`, exit 1
- Missing `.storybook/` prints error with suggestion to set `storybook.configDir`, exit 1

### Requirement: scenes.yml support in validate story
`validate story [name]` discovers both `.story.yml` and `.scenes.yml` files. No separate `validate scene` command.

- Without name arg: discovers and validates all story/scene files, one JSON line each
- With name arg: filters to files matching the name in their path

### Requirement: buildExportName handles special characters
`buildExportName` SHALL strip all non-alphanumeric, non-whitespace characters (em-dashes, en-dashes, slashes) before PascalCase conversion. Dist must be rebuilt.

- `"Article Listing — Single Result"` becomes `"ArticleListingSingleResult"`
- Names differing only in punctuation produce distinct export names

## REMOVED Requirements

### Requirement: Headless story rendering via Vitest
**Reason**: Replaced by Vite SSR. Twig/SDC rendering is server-side; no browser needed.
**Migration**: Remove `vitest.config.ts`, `@vitest/browser`, `@vitest/browser-playwright`, `@storybook/addon-vitest`.

### Requirement: CLI validate story command (old)
**Reason**: Replaced by Vite SSR implementation. Old version spawned `npx vitest run`.
**Migration**: No CLI surface change. Internal implementation only.

### Requirement: Integration project Vitest configuration
**Reason**: No longer needed for story validation.
**Migration**: Delete `vitest.config.ts`, remove browser dependencies from `devDependencies`.

### Requirement: Addon dependency management (vitest peer deps)
**Reason**: `@storybook/addon-vitest` and `vitest` no longer required.
**Migration**: Remove from `peerDependencies` and `peerDependenciesMeta`.
