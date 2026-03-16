## 1. Reproduce the Bug

- [x] 1.1 Add a structural assertion to the `ComponentDirect` test in `scene-module-builder.test.ts` that verifies `args.__scene[0].props` equals `{ "level": "h1" }` (not just a substring match)
- [x] 1.2 Add a test in `renderer.test.ts` that builds a ComponentNode with `props: { level: '1' }` and verifies `mod.render` is called with the props as the first argument and slots as the second (use `vi.fn()` spy on `render`)
- [x] 1.3 Run the tests and confirm whether either new assertion fails — if it fails, proceed to fix; if it passes, investigate Storybook runtime

## 2. Fix Props Pipeline

- [x] 2.1 If the build-time test (1.1) fails: trace `componentBuilder.build()` → `resolveEntityRefs()` → `buildCsfModule()` to find where `props` is dropped and fix it
- [x] 2.2 If the runtime test (1.2) fails: trace `renderNode()` in `renderer.ts` to ensure `node.props ?? {}` is passed as the first argument to `mod.render`
- [x] 2.3 If no test fails but Storybook shows empty props: verify the SDC `wrapImport` merges `{...p, ...s}` correctly and the heading Twig template uses `{{ level }}` not `{{ props.level }}`

## 3. Strengthen Test Coverage

- [x] 3.1 Add an end-to-end round-trip test: parse the JSON `__scene` from the generated CSF module string and feed it to `renderComponent` to verify props reach `mod.render`
- [x] 3.2 Add a test case for a component with both `props` AND `slots` — verify they are passed as separate arguments to `mod.render` with no cross-contamination
- [x] 3.3 Add a test case for a component with no `props:` key — verify `mod.render` receives `{}` as first argument

## 4. Verify and Lint

- [x] 4.1 Run full test suite: `cd packages/storybook-addon-designbook && npx vitest run`
- [x] 4.2 Run linter: `cd packages/storybook-addon-designbook && npx eslint --cache --fix .`
- [x] 4.3 Run root lint: `npm run lint`
