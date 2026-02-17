## 1. Storage: Section-scoped data

- [x] 1.1 Refactor `initStorage()` in `designbookStorage.js` to extract the section ID from each `data.json` file path and store data under `store[sectionId]` instead of merging flat
- [x] 1.2 Remove `setContext()`, `getContext()`, and `resolveField()` from `designbookStorage.js`
- [x] 1.3 Refactor `resolvePath()` to read `globalThis.__designbook_section` and resolve against `store[section]`. If no section is set, return `undefined` with a warning
- [x] 1.4 Add random record selection to `resolvePath()`: when traversal hits an array and the next path segment is not a numeric index, pick a random element

## 2. Vite Plugin: Build-time field expansion

- [x] 2.1 Replace entity context setting (`globalThis.__designbook_entity_context`) with section context setting (`globalThis.__designbook_section`) when loading screen `component.yml` files with `designbook.section`
- [x] 2.2 Add a helper function `expandFieldRefs(storyYaml, entityMeta)` that walks the parsed story tree and rewrites `{type: ref, field: X}` to `{type: ref, path: <type>.<bundle>.[<record>.]X}`
- [x] 2.3 In the `load()` hook, intercept `.story.yml` files for entity components: read the sibling `.component.yml`, check for `designbook.entity`, and if present, parse the story YAML, run `expandFieldRefs()`, and return the rewritten YAML as a string passthrough (return `undefined` so the SDC addon still handles it, but the virtual YAML content is rewritten)

## 3. refRenderer: Simplify

- [x] 3.1 Remove the `field:` branch from `refStoryNodeRenderer` — only handle `path:` references
- [x] 3.2 Remove the import of `resolveField` from `designbookStorage.js`
- [x] 3.3 Remove the `console.log(item)` debug line

## 4. Verification

- [ ] 4.1 Run Storybook and verify entity stories resolve correctly when viewed standalone
- [ ] 4.2 Run Storybook and verify screen stories compose shell + entity correctly with data from the right section
