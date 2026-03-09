# Tasks: JSON to YAML Migration

## 1. Convert data files <!-- id: 1 -->
- [x] 1.1 Convert `data-model.json` → `data-model.yml` <!-- id: 1.1 -->
- [x] 1.2 Convert `data.json` → `data.yml` (sections/blog/) <!-- id: 1.2 -->
- [x] 1.3 Convert schema `data-model.json` → `data-model.schema.yml` <!-- id: 1.3 -->

## 2. Update addon code <!-- id: 2 -->
- [x] 2.1 Update `vite-plugin.ts`: replace `JSON.parse` with `parseYaml`, change filenames <!-- id: 2.1 -->
- [x] 2.2 Update comments in `resolver.ts` and `types.ts` <!-- id: 2.2 -->
- [x] 2.3 Update `src/screen/README.md` references <!-- id: 2.3 -->

## 3. Update skills <!-- id: 3 -->
- [x] 3.1 Update `designbook-data-model/SKILL.md` <!-- id: 3.1 -->
- [x] 3.2 Update `designbook-data-model/steps/process-data-model.md` <!-- id: 3.2 -->
- [x] 3.3 Update `designbook-screen/SKILL.md` <!-- id: 3.3 -->
- [x] 3.4 Update `designbook-drupal-data-model/SKILL.md` if needed <!-- id: 3.4 -->

## 4. Verify <!-- id: 4 -->
- [x] 4.1 Build addon: `pnpm run build` <!-- id: 4.1 -->
- [x] 4.2 Run tests: `pnpm test` (22/22) <!-- id: 4.2 -->
- [ ] 4.3 Start Storybook, verify screen rendering works <!-- id: 4.3 -->
