## 1. Core Implementation

- [x] 1.1 Add `cmd:` handler in `validateByKeys` in `validation-registry.ts` — detect prefix, execute command, capture exit code + stderr
- [x] 1.2 Skip `cmd:` keys in the known-validator-keys check (`expandFileDeclarations` in `workflow-resolve.ts`)
- [x] 1.3 Add tests for cmd validators in `validation-registry.test.ts`

## 2. Integration

- [x] 2.1 Update `generate-jsonata.md` task to use `validators: ["cmd:npx jsonata-w transform --dry-run {{ file }}"]`
- [x] 2.2 Run `pnpm check`
