## Context

Currently, the Designbook addon provides CLI validators for YAML structure (`validate component`, `validate scene`, `validate data`, `validate tokens`, `validate data-model`). These catch structural errors but cannot detect rendering failures — broken Twig templates, missing slot content, invalid prop values, or composition errors in scenes.

The rendering pipeline uses Vite plugins (`storybook-addon-sdc`, `vite-plugin-twing-drupal`, designbook's own Vite plugin) to transform `.component.yml` + `.twig` + `.story.yml` into executable story modules. These plugins are only available within a running Storybook/Vite process.

`@storybook/addon-vitest` (formerly `@storybook/experimental-addon-test`) solves exactly this problem: it reuses Storybook's Vite config to render stories headlessly via Vitest.

## Goals / Non-Goals

**Goals:**
- Render any `.story.yml` or `.scenes.yml` story to HTML without a running Storybook server
- Expose a `validate story` CLI command for quick single-story validation
- Enable CI pipelines to validate all stories via `vitest`
- Reuse the existing Vite plugin pipeline — no duplicate rendering logic

**Non-Goals:**
- Visual regression testing (screenshot comparison)
- Interaction testing (play functions)
- Accessibility testing (can be added later on top of this foundation)
- Supporting renderers other than the current SDC/Twig pipeline (future concern)

## Decisions

### 1. Use `@storybook/addon-vitest` over custom rendering

**Decision**: Integrate `@storybook/addon-vitest` rather than building a custom headless renderer.

**Rationale**: The addon already handles Vite config sharing, story discovery, and the portable stories API. Building a custom renderer would duplicate Storybook's transform pipeline and require ongoing maintenance as Storybook evolves.

**Alternative considered**: Custom `validate story` command that calls Vite's `createServer()` directly and runs the transform pipeline. Rejected because it would need to replicate Storybook's plugin ordering, preview configuration, and CSF handling.

### 2. Add as dependency of `storybook-addon-designbook`

**Decision**: `@storybook/addon-vitest` is a peer/optional dependency of the addon, not of each integration project.

**Rationale**: The addon already owns the rendering pipeline. Integration projects should only need to add a Vitest config that references the Storybook project — no manual addon-vitest setup.

### 3. CLI `validate story` wraps Vitest programmatic API

**Decision**: The `validate story` CLI command uses Vitest's Node API (`startVitest()`) to run a single test file filtered by story name.

**Rationale**: This keeps one tool (Vitest) for both CLI validation and CI runs. No separate rendering code path to maintain.

### 4. Integration projects configure via `vitest.workspace.ts`

**Decision**: Each integration project adds a Vitest workspace entry that points to their `.storybook` config.

**Rationale**: This is the standard `@storybook/addon-vitest` setup pattern. It automatically picks up all Vite plugins from the Storybook config.

## Risks / Trade-offs

- **Dependency weight**: `@storybook/addon-vitest` pulls in Vitest as a dependency → Mitigation: mark as optional peer dependency, only needed when running validation
- **Storybook version coupling**: `@storybook/addon-vitest` requires Storybook 8.x+ → Mitigation: the addon already targets Storybook 8
- **SDC renderer compatibility**: `composeStories` expects a framework renderer; SDC stories return HTML strings from `render()` → Mitigation: verify with `@storybook/html` renderer which handles raw HTML returns
- **Virtual module resolution**: `.scenes.yml` files are virtual modules in the Vite plugin; Vitest needs to resolve them → Mitigation: the same Vite config is shared, so virtual modules should resolve identically
