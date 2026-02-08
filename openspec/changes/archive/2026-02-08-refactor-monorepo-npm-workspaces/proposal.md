# Proposal: Refactor to NPM Monorepo

## Why
The current repository structure limits the ability to manage and test multiple integrations effectively. Transitioning to an NPM workspace-based monorepo will enable better isolation, dependency management, and the addition of specific integration testing packages (e.g., for Drupal) while keeping the core agnostic.

## What Changes
- **Enable NPM Workspaces**: Configure the root `package.json` to manage packages in `packages/*` using NPM workspaces.
- **Clean Up Repository**: Consolidate code into a structured monorepo format.
- **Add Integration Packages**: Infrastructure to support integration test packages, such as `packages/test-integration-drupal`.

## Capabilities

### New Capabilities
- `npm-workspaces`: Infrastructure for managing multiple packages in the monorepo using standard NPM workspaces.
- `drupal-integration-tests`: Dedicated package structure for testing Drupal integration.

## Impact
- Root `package.json` will be converted to a workspace root.
- Existing `apps` and `packages` will be reorganized.
- Build and test scripts will be updated to support the monorepo structure.
