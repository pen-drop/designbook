# story-validation Specification

## Purpose
TBD - created by archiving change addon-vitest-integration. Update Purpose after archive.

## Requirements

### Requirement: Story rendering via Vite SSR

The addon CLI SHALL validate stories by executing them in Node.js using Vite's `ssrLoadModule` API with the project's Storybook Vite plugin chain. No browser or Playwright installation SHALL be required.

The implementation SHALL:
- Dynamically import `.storybook/main.js` from `storybook.configDir` (resolved via `loadConfig()`, with walk-up fallback from `outputs.root`)
- Extract addon configurations and call each addon preset's `viteFinal` to build a Vite server config
- Create a Vite server and call `ssrLoadModule` for each discovered story file
- Call `render(args)` on each named story export (skipping `default`)
- Capture the returned HTML string on success, or capture the thrown error message on failure

#### Scenario: Render a component story to HTML

- **WHEN** user runs `validate story button` and `button.default.story.yml` exists and renders without error
- **THEN** the CLI SHALL output `{ "valid": true, "label": "button.default", "html": "<button>…</button>" }` and exit 0

#### Scenario: Render a scene story to HTML

- **WHEN** user runs `validate story core-scene-rendering` and `core-scene-rendering.section.scenes.yml` exists and all scenes render without error
- **THEN** the CLI SHALL output one JSON line per scene, each with `"valid": true` and the rendered HTML

#### Scenario: Catch a Twig rendering error

- **WHEN** a `.story.yml` references a component whose Twig template contains an undefined variable
- **THEN** the CLI SHALL output `{ "valid": false, "label": "button.default", "error": "button.twig:12: Variable 'label' is not defined" }` and exit 1

#### Scenario: storybook.configDir not configured and not found

- **WHEN** `storybook.configDir` is not in `designbook.config.yml` and no `.storybook/` directory is found by walk-up
- **THEN** the CLI SHALL print `{ "valid": false, "error": "Cannot find .storybook/ directory. Set storybook.configDir in designbook.config.yml." }` and exit 1

### Requirement: scenes.yml support in validate story

`validate story [name]` SHALL discover and validate both `.story.yml` and `.scenes.yml` files. There is no separate `validate scene` command.

#### Scenario: Validate all stories and scenes

- **WHEN** user runs `validate story` without a name argument
- **THEN** the CLI SHALL discover all `.story.yml` and `.scenes.yml` files and output one JSON line per story/scene

#### Scenario: Filter by name

- **WHEN** user runs `validate story button`
- **THEN** the CLI SHALL only process files matching `button` in their path

### Requirement: buildExportName handles special characters

The `buildExportName` function SHALL strip all non-alphanumeric, non-whitespace characters (including em-dashes, en-dashes, slashes) before converting to PascalCase. The dist SHALL be rebuilt to include this fix.

#### Scenario: Scene name with em-dash

- **WHEN** a `.scenes.yml` contains a scene named `"Article Listing — Single Result"`
- **THEN** `buildExportName` SHALL return `"ArticleListingSingleResult"` (not `"ArticleListing—SingleResult"`)

#### Scenario: No duplicate export names

- **WHEN** two scenes differ only in punctuation (e.g., `"Category — Tutorial"` and `"Category — Design Systems"`)
- **THEN** their export names SHALL be distinct: `"CategoryTutorial"` and `"CategoryDesignSystems"`

## REMOVED Requirements

### Requirement: Headless story rendering via Vitest

**Reason**: Replaced by Vite SSR approach. Vitest + Playwright is not required for story rendering because Twig/SDC rendering is server-side (Node.js). The new implementation uses `ssrLoadModule` which is faster, simpler, and requires no browser.

**Migration**: Remove `vitest.config.ts`, `@vitest/browser`, `@vitest/browser-playwright`, and `@storybook/addon-vitest` from integration projects. Run `validate story` via the CLI instead.

### Requirement: CLI validate story command (old)

**Reason**: Replaced by the updated requirement above. The old implementation spawned `npx vitest run --project=storybook` and required `outputs.root` to be set. New implementation uses Vite SSR and reads `storybook.configDir`.

**Migration**: No change to CLI surface (`validate story [name]`). Internal implementation changes.

### Requirement: Integration project Vitest configuration

**Reason**: No longer required for story validation. `vitest.config.ts` in integration projects was only needed to run story validation via vitest.

**Migration**: Delete `vitest.config.ts` (or keep for CI if desired — it no longer breaks anything). Remove `@vitest/browser-playwright` and browser dependencies from integration project `devDependencies`.

### Requirement: Addon dependency management (vitest peer deps)

**Reason**: `@storybook/addon-vitest` and `vitest` are no longer required by the addon for story validation.

**Migration**: Remove from `peerDependencies` and `peerDependenciesMeta` in `storybook-addon-designbook/package.json`.
