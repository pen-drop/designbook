## Task Group: Skill Task Update

### 1. Update map-entity task instructions

**File**: `.agents/skills/designbook/design/tasks/map-entity--design-screen.md`

- Add "Param Resolution" section explaining how to derive entity_type/bundle/view_mode from scene content references when params are null
- Add "Mandatory" constraint: entity mapping must always be created, never skipped
- Clarify blueprint lookup: match `when.template` against view mode's template from data-model.yml
- Keep existing file/validator/output format unchanged

### 2. Review canvas data-mapping blueprint accuracy

**File**: `.agents/skills/designbook-drupal/data-mapping/blueprints/canvas.md`

- Verify the example JSONata pattern matches what entity-builder.ts expects
- The current simple form `components` (used in the actual file) vs the blueprint's `($record := $; $record.components)` — confirm both work
- Update example component names (remove fictional `canvas_section`, `canvas_text` etc.) to align with the canvas.md sample-data rule that forbids invented names

---

## Task Group: Addon Watcher

### 3. Add entity-mapping to Vite watcher

**File**: `packages/storybook-addon-designbook/src/vite-plugin.ts`

- Add `server.watcher.add(resolve(designbookDir, 'entity-mapping'))` after existing watcher registrations (~line 152)
- Add `entityMapping: 'entity-mapping/**/*.jsonata'` to FILE_TYPES registry (~line 138)

---

## Task Group: Verification

### 4. Test in workspace

- Run `./scripts/setup-workspace.sh drupal` from repo root
- Start Storybook in the workspace
- Delete `entity-mapping/canvas_page.home.full.jsonata`
- Run `design-screen home` workflow — verify entity-mapping stage creates the file with correct passthrough content
- Verify Storybook hot-reloads when the JSONata file appears (no manual restart needed)
