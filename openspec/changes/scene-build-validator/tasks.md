## Tasks

- [ ] 1. Fix `needsBuilding()` type guard in `builder-registry.ts` — add `typeof n === 'object' && n !== null` check
- [ ] 2. Rewrite `validators/scene.ts` — replace static YAML validation with `buildSceneModule()` call
- [ ] 3. Update `validation-registry.ts` — remove log/storybook imports, simplify scene + component registrations
- [ ] 4. Delete `validators/log.ts` and `validators/storybook.ts`
- [ ] 5. Delete `validators/__tests__/log.test.ts`, update `validators/__tests__/scene.test.ts`
- [ ] 6. Add test: broken scene (`$content` string in slot array) → `valid: false`
- [ ] 7. Add test: valid scene → `valid: true`
- [ ] 8. Run all tests, verify passing
