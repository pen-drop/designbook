# Design: Refactor to NPM Monorepo

## Context
The current project structure mixes application code and packages in a way that is hard to manage. Dependencies are often duplicated or mismanaged. Transitioning to a standard NPM Monorepo structure will align with modern JavaScript development practices and facilitate the addition of specialized integration test packages.

## Goals / Non-Goals

**Goals:**
- Establish a clear `packages/` directory for all shared libraries and addons.
- Configure root `package.json` to use NPM workspaces.
- Create a dedicated `packages/test-integration-drupal` for Drupal integration tests.
- Ensure all packages can be built and tested independently or from the root.

**Non-Goals:**
- Rewriting existing application logic (unless necessary for structure).
- Changing the primary build tool from Vite/tsup (unless required by workspaces).

## Decisions

- **NPM Workspaces**: Chosen over Yarn/PNPM for simplicity and native support, per user request for "npm only".
- **Directory Structure**:
  - `packages/`: All shared packages (e.g., `storybook-addon-designbook`).
  - `packages/integrations/`: Integration tests (e.g., `test-integration-drupal`).
  - *Decision*: Move `storybook-addon-designbook` to `packages/`.
  - *Decision*: Move current root application code (`components`, `source`, `.storybook`, etc.) to `packages/integrations/test-integration-drupal`.
- **Add Integration Packages**: Infrastructure to support integration test packages, such as `packages/integrations/test-integration-drupal`.
- **Minimal Root**: The root directory should only contain workspace configuration (`package.json`, `.npmrc`, etc.).

## Risks / Trade-offs

- **Migration Complexity**: Moving files might break existing imports or CI/CD pipelines.
  - *Mitigation*: Careful update of `package.json` scripts and paths.
- **Tooling Compat**: Ensure Storybook and builds work with symlinked workspace packages.

## Migration Plan

1.  Evaluate current root `package.json` and move dependencies to appropriate packages.
2.  Set `workspaces: ["packages/*"]` in root `package.json`.
3.  Move `storybook-addon-designbook` code if not already in `packages/`. (It is already in `packages/storybook-addon-designbook`).
4.  Create `packages/integrations/test-integration-drupal` scaffold.
5.  Run `npm install` to link workspaces.
6.  Verify builds.
