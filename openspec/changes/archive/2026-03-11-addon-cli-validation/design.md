## Context

Validation is currently handled in three different ways:
1. **CJS scripts** in skill directories (`validate-sample-data.cjs`) with fragile `require('yaml')` fallbacks
2. **Inline `npx ajv-cli`** calls in skill docs, requiring specific version pinning (`ajv-cli@3` for draft-04)
3. **No validation** — some skills just trust the output

The addon (`storybook-addon-designbook`) already owns config loading, has a `commander`-based CLI, and bundles `yaml` as a dependency. Validation is a natural extension.

## Goals / Non-Goals

**Goals:**
- Single `designbook validate <type>` CLI entry point for all validation
- Bundle schemas inside the addon package
- Unit tests for each validator
- Skills reference one command instead of inline scripts

**Non-Goals:**
- Runtime validation in Storybook (this is CLI/build-time only)
- Custom schema authoring by end users
- Validating Figma input data

## Decisions

### 1. Use `ajv` directly instead of `ajv-cli`

**Rationale**: The addon already bundles dependencies. Adding `ajv` as a direct dependency eliminates version pinning issues (`ajv-cli@3` vs `@5`) and the draft-04 meta-schema problem. We use `ajv-draft-04` for the Drupal SDC schema and `ajv` (v8) for draft-07 schemas.

**Alternative considered**: Keep `npx ajv-cli@3` — rejected because it's fragile across environments and adds npx download overhead.

### 2. Validator module structure: `src/validators/<type>.ts`

Each validator is a standalone module exporting a `validate(paths)` function that returns `{ valid: boolean, errors: string[], warnings: string[] }`. The CLI wires them together.

**Alternative considered**: Single monolithic validator — rejected for testability.

### 3. Schema bundling: copy schemas into `src/validators/schemas/`

Schemas live next to the validators in source, get bundled by tsup. Skills no longer own schema files.

**Alternative considered**: Resolve schemas at runtime from `.agent/skills/` — rejected because it couples the addon to the agent directory structure.

### 4. Reuse existing `loadConfig()` for path resolution

The `designbook validate` commands use `loadConfig()` to resolve `dist`, `drupal.theme`, etc. — no need to pass full paths manually.

## Risks / Trade-offs

- **[Schema drift]** → Drupal SDC schema updates won't auto-propagate. Mitigation: pin schema version, document update process.
- **[Build step required]** → Validators need addon to be built before use. Mitigation: skill docs already assume addon is built; `load-config.cjs` has the same requirement.
