## 1. Create builder directory structure

- [x] 1.1 Create `renderer/builders/sdc/` directory
- [x] 1.2 Move `renderer/sdc-module-builder.ts` → `renderer/builders/sdc/module-builder.ts`
- [x] 1.3 Move `renderer/sdc-renderer.ts` → `renderer/builders/sdc/renderer.ts`
- [x] 1.4 Create `renderer/builders/sdc/index.ts` barrel with re-exports + `sdcRenderers` array

## 2. Update import paths

- [x] 2.1 Update relative imports inside `builders/sdc/module-builder.ts` (`'../../types'`, `'../../scene-module-builder'`, `'../../render-service'`, `'./'` for sdcRenderers)
- [x] 2.2 Update relative imports inside `builders/sdc/renderer.ts` (`'../../types'`)
- [x] 2.3 Update `renderer/index.ts` — import SDC symbols from `'./builders/sdc'`
- [x] 2.4 Update `vite-plugin.ts` — import `buildSdcModule` from `'./renderer/builders/sdc'`
- [x] 2.5 Update `__tests__/sdc-renderer.test.ts` — import from `'../builders/sdc/renderer'`

## 3. Cleanup

- [x] 3.1 Delete old `renderer/sdc-module-builder.ts` and `renderer/sdc-renderer.ts`
- [x] 3.2 Remove leftover `presets/` directory reference if any

## 4. Verify

- [x] 4.1 Run `npx tsup` — build must pass
- [x] 4.2 Run `npx vitest run` — all tests must pass
- [ ] 4.3 Start Storybook — verify scenes render correctly
