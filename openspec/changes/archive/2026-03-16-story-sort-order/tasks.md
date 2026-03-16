## 1. vite-plugin.ts + preset.ts — overview story

- [x] 1.1 Add `parameters: { designbook: { order: 3 } }` to the `overview` story export in `packages/storybook-addon-designbook/src/vite-plugin.ts`
- [x] 1.2 Set `name: 'Overview'` (hardcoded) on the Overview indexer entry in `packages/storybook-addon-designbook/src/preset.ts` instead of `typedParsed.title`

## 2. csf-prep.ts — per-scene order

- [x] 2.1 Add `parameters: { designbook: { order: 100 + index } }` to each scene story export in `buildCsfModule` (`packages/storybook-addon-designbook/src/renderer/csf-prep.ts`)

## 3. preset.ts — storySort via preview export

- [x] 3.1 Add `preview` async export to `packages/storybook-addon-designbook/src/preset.ts` returning function-based `storySort` that reads `parameters?.designbook?.order ?? 999`

## 4. Verification

- [ ] 4.1 Check sidebar order: Foundation → Design System → Sections → section overviews (named "Overview") → Scenes (manual)
- [ ] 4.2 Confirm individual scenes within a Scenes group appear in YAML array order (manual)
