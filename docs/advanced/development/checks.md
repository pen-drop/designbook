# Checks

Run the repository quality gate before every commit.

**You need:** `pnpm install` completed in this worktree.

1. Run the fail-fast sequence from the repo root.

```bash
pnpm check
```

That is `run-s typecheck lint test`:

1. **typecheck** — `pnpm --filter storybook-addon-designbook typecheck` (`tsc --noEmit`)
2. **lint** — `pnpm --filter storybook-addon-designbook lint` (ESLint plus Prettier)
3. **test** — `pnpm -r run test` (addon Vitest plus website `node --test`)

**AI prompt**

```text
Run pnpm check at the repository root and report which step failed, if any.
```

2. Auto-fix addon formatting when lint is the only failure:

```bash
pnpm --filter storybook-addon-designbook lint:fix
```

3. For documentation-only changes also run the site build. Root `pnpm check` includes `website` tests because the website package's `test` script is in the recursive test run, but it does not run VitePress until you ask:

```bash
pnpm --filter website test
pnpm --filter website build
```

`website` `build` is `check-pages` then `vitepress build` then `check-site`.

**Done when:** `pnpm check` exits 0. For site edits, `pnpm --filter website build` also exits 0.

There is no `gaia validate` step for unchanged GAIA configuration. CSS lint for the Drupal integration package is `pnpm lint:css` and is separate from `pnpm check`.
