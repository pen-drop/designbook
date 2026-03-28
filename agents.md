# Project Rules

## Code Quality Checks

Run all checks before committing:

```bash
pnpm check
```

This runs sequentially (fail-fast):

1. **typecheck** — `tsc --noEmit` (static type analysis)
2. **lint** — `eslint` (code quality + Prettier formatting)
3. **test** — `vitest` (unit tests)

To auto-fix formatting and lint issues:

```bash
pnpm --filter storybook-addon-designbook lint:fix
```
