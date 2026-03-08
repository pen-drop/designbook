## Context

Designbook's configuration file (`designbook.config.yml`) contains project settings like `dist` (output directory), `technology`, and `css.framework`. Currently, config resolution is implemented in two separate places with different behavior:

1. **Agent-side** (`load-config.cjs`): Walks up the directory tree from `cwd()` to find the config — correct behavior.
2. **Addon-side** (`preset.ts`): Hardcodes `resolve(process.cwd(), 'designbook.config.yml')` — only finds config in `cwd()`.

This divergence prevents workspace-based testing (promptfoo) where each test workspace needs its own config, and creates inconsistency in monorepo setups.

## Goals / Non-Goals

**Goals:**
- Single shared `resolveConfig()` implementation in the addon package
- "Walk up" directory traversal: start from `cwd()`, check each parent until config found
- Both `preset.ts` and agent tooling (`set-env.sh`) use the same resolver
- Enable workspace-local `designbook.config.yml` overrides (for testing and nested projects)

**Non-Goals:**
- Changing the config file format or adding new config keys
- Supporting multiple config files or config merging
- Adding environment variable overrides for config values

## Decisions

### 1. Shared module location: `packages/storybook-addon-designbook/src/config.ts`

**Rationale:** The addon package is already a dependency of all integrations. Placing the resolver here makes it importable by both the Storybook addon (runtime) and agent tooling (via Node.js). Alternative: a standalone `@designbook/config` package — rejected as over-engineering for a single function.

### 2. ESM + CJS dual export

**Rationale:** `preset.ts` uses ESM (`import`), but `set-env.sh` calls `load-config.cjs` via `node`. The addon's build already produces both formats. The shared module will be available in both. `load-config.cjs` becomes a thin wrapper: `const { loadConfig } = require('@designbook/storybook-addon-designbook/config')`.

### 3. Resolution algorithm: Walk up from cwd()

```
findConfig(startDir = process.cwd()):
  currentDir = startDir
  while currentDir != filesystem root:
    if exists(currentDir/designbook.config.yml) → return it
    if exists(currentDir/designbook.config.yaml) → return it  
    currentDir = parent(currentDir)
  return null (use defaults)
```

**Rationale:** Matches the existing `load-config.cjs` logic. Supports both `.yml` and `.yaml` extensions. Stops at filesystem root to prevent infinite traversal.

### 4. Resolve `dist` paths relative to the config file location

**Rationale:** When config says `dist: packages/.../designbook`, this path must be relative to where the config file sits, not to `cwd()`. This is critical for workspace isolation — a workspace config with `dist: ./designbook` should resolve relative to the workspace directory.

## Risks / Trade-offs

- **[CJS compatibility]** → `load-config.cjs` may need to use `require()` on the built output rather than importing source TS. Mitigation: test the CJS import path explicitly.
- **[Breaking change if walk-up finds unexpected config]** → A `designbook.config.yml` in a parent directory that wasn't found before might now be picked up. Mitigation: Walk-up was already the behavior in `load-config.cjs`, so this only changes behavior for `preset.ts` users — and in the correct direction.
