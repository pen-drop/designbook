## 1. Add `extensions` to config

- [x] 1.1 Update `designbook.config.yml` config loading in `packages/storybook-addon-designbook/src/config.ts`: the `loadConfig()` flattener currently skips arrays (`!Array.isArray(value)` branch). `extensions` is an array — ensure it's preserved as `extensions` key (not flattened).
- [x] 1.2 Update CLI `config` command in `packages/storybook-addon-designbook/src/cli.ts`: emit `export DESIGNBOOK_EXTENSIONS='layout_builder,paragraphs'` (comma-joined) from the `extensions` array. Handle missing/empty extensions as empty string.
- [x] 1.3 Update `DesignbookConfig` interface in `config.ts`: add `extensions?: string[]` field.
- [x] 1.4 Update `.agent/skills/designbook-configuration/SKILL.md`: document `extensions` key and `DESIGNBOOK_EXTENSIONS` env variable in the table.
- [x] 1.5 Add `extensions: []` to root `designbook.config.yml` as default (empty, backward-compatible).

## 2. Add `composition` to data model schema

- [x] 2.1 Update `packages/storybook-addon-designbook/src/validators/schemas/data-model.schema.yml`: add `composition` property to the `bundle` definition as optional enum `[structured, unstructured]`.
- [x] 2.2 Update `.agent/skills/designbook-data-model/SKILL.md`: document `composition` field in schema description. Note that `unstructured` only affects view_mode `full`, all other view modes are always structured.
- [x] 2.3 Update `.agent/skills/designbook-data-model-drupal/SKILL.md`: add Drupal-specific guidance for `composition` — landing pages with Layout Builder are `unstructured`, articles are `structured`, blocks are always `structured`.

## 3. Recursive entity resolution in renderer

- [x] 3.1 Update `resolveMarkers()` in `packages/storybook-addon-designbook/src/renderer/builders/sdc/module-builder.ts`: when JSONata evaluates and returns a result array, check each child node's `type`. If `type === "entity"`, re-encode as `__ENTITY_EXPR__` marker for another resolution pass. If `type === "component"`, render as today. Loop `resolveMarkers()` until no markers remain (with max 5 iterations as depth guard).
- [x] 3.2 Update `resolveMarkers()` to handle `type: "entity"` nodes in component slot values: after rendering a component node, check if the rendered output contains nested `__ENTITY_EXPR__` markers from slot content that included entity refs. The existing while loop with regex should already catch these if they appear in the rendered string — verify this works with a test.
- [x] 3.3 Add test for recursive entity resolution in `packages/storybook-addon-designbook/src/renderer/__tests__/`: create a fixture with a JSONata expression that returns `type: "entity"` nodes, verify they get recursively resolved.

## 4. Update skills to read composition + extensions

- [x] 4.1 Update `.agent/skills/designbook-scenes/SKILL.md`: add note that scenes work the same regardless of composition — the JSONata handles the differences. No structural changes needed.
- [x] 4.2 Update `.agent/skills/designbook-view-modes` skill (find the SKILL.md): document that JSONata expressions for `structured` bundles may output `type: "entity"` nodes for reference fields. Document that `unstructured` + `layout_builder` bundles output section components with entity slots in `full` view mode.
- [x] 4.3 Update `.agent/skills/designbook-components-sdc/resources/layout-reference.md`: add note that the `section` component is used by Layout Builder JSONata expressions to compose sections with block entity slots.

## 5. Update main specs

- [x] 5.1 Sync new specs to `openspec/specs/`: copy `extensions-config`, `bundle-composition`, `recursive-entity-resolution` specs from change to main specs directory.
