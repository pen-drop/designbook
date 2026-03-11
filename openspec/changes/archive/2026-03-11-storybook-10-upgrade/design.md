## Context

The project has two Storybook consumers:
1. `packages/storybook-addon-designbook` — the addon itself, uses `storybook: "next"` (Storybook 10 pre-release) and `@storybook/react-vite: "next"`.
2. `packages/integrations/test-integration-drupal` — the integration test environment, pinned to `^9.1.x`.

Storybook 10 is the first stable release on the `next` channel. It introduces breaking changes in the manager/preview API, decorator registration, and the `@storybook/addon-vitest` integration.

## Goals / Non-Goals

**Goals:**
- Pin both packages to Storybook 10 stable (`^10.0.0`)
- Resolve all breaking API changes in addon source and `.storybook/` configs
- Keep `@storybook/addon-vitest` integration functional for story validation
- CI green (build + tests pass)

**Non-Goals:**
- Adding new Storybook 10 features beyond what migration requires
- Changing the addon's public API surface
- Migrating away from Vite as the bundler

## Decisions

### D1: Migrate `next` tags to `^10.0.0`

Replace all `"next"` version strings with `"^10.0.0"` (or the exact latest Storybook 10 release at migration time). Keeping `next` introduces moving targets in CI.

**Alternatives considered:** Pin to exact version — too rigid for patch-level bugfixes.

### D2: Follow official Storybook 10 migration guide

Use `npx storybook@10 migrate` (or manual migration checklist) to identify breaking changes. Common Storybook 9→10 changes include:
- `StoryContext` type imports moved
- `composeStories` API changes
- `@storybook/addon-vitest` config format changes

**Alternatives considered:** Incremental upgrade through minor versions — unnecessary overhead since 9→10 is a single major bump.

### D3: Update integration package independently from addon

The integration's `package.json` is at `packages/integrations/test-integration-drupal/`. It has no shared lockfile with the addon. Upgrade both in the same PR to keep the diff atomic.

## Risks / Trade-offs

- [Storybook 10 may break `storybook-addon-sdc`] → Check `storybook-addon-sdc` compatibility; pin to a compatible version or file an issue upstream.
- [Vitest integration API changes] → Run full test suite after upgrade; check `@storybook/addon-vitest` changelog.
- [Peer dependency conflicts in pnpm workspace] → Use `pnpm why` to trace conflicts; may need `overrides` in root `package.json`.

## Migration Plan

1. Upgrade addon deps (`packages/storybook-addon-designbook/package.json`)
2. Run `pnpm install` — resolve any peer dep conflicts
3. Build addon: `pnpm --filter storybook-addon-designbook build`
4. Upgrade integration deps (`packages/integrations/test-integration-drupal/package.json`)
5. Run `pnpm install` again
6. Start integration Storybook: `pnpm --filter test-integration-drupal storybook`
7. Run story validation tests: `pnpm --filter test-integration-drupal test`
8. Fix any API breakage found in steps 3/6/7
9. Commit and open PR

**Rollback:** Revert `package.json` changes and re-run `pnpm install`.

## Open Questions

- Does `storybook-addon-sdc ^0.15.1` support Storybook 10? (Check upstream)
- Are there `@storybook/types` API changes that affect the addon's TypeScript types?
