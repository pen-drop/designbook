## 1. CLI Entry Point

- [x] 1.1 Add `commander` as a dependency to `storybook-addon-designbook`
- [x] 1.2 Create `src/cli.ts` using Commander with a `config` subcommand that imports `loadConfig` from `./config`
- [x] 1.3 Add `"bin": { "storybook-addon-designbook": "./dist/cli.js" }` to `package.json`
- [x] 1.4 Add CLI entry to tsup config as a separate node-platform ESM build with `#!/usr/bin/env node` shebang banner

## 2. Config Subcommand

- [x] 2.1 Implement env variable name conversion (prefix `DESIGNBOOK_`, dots → underscores, `frameworks` → `FRAMEWORK`, uppercase)
- [x] 2.2 Implement `DESIGNBOOK_SDC_PROVIDER` derivation (basename of `drupal.theme`, hyphens → underscores)
- [x] 2.3 Output `export KEY='value'` lines to stdout with proper shell escaping

## 3. Update Skill References

- [x] 3.1 Update `load-config.cjs` to use only `require('storybook-addon-designbook/config')` — remove the relative path fallback
- [x] 3.2 Update `set-env.sh` to use `eval "$(npx storybook-addon-designbook config)"` instead of inline Node.js eval
- [x] 3.3 Update `SKILL.md` usage examples to reference the CLI and package import instead of `.agent/` paths

## 4. Verify

- [x] 4.1 Build the addon (`pnpm run build`) and confirm `dist/cli.js` exists with shebang
- [x] 4.2 Run `npx storybook-addon-designbook config` and verify correct export output
- [x] 4.3 Run `eval "$(npx storybook-addon-designbook config)"` in bash and verify env vars are set
