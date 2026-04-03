## Entity Param Resolution

### Current Flow (broken)

```
Scene: entity: "canvas_page.home", view_mode: "full"
  ↓
workflow plan → entity_type: ~, bundle: ~, view_mode: ~
  ↓
map-entity task → no params → "nothing to map" → skip
  ↓
No JSONata file created → empty canvas at runtime
```

### Target Flow

```
Scene: entity: "canvas_page.home", view_mode: "full"
  ↓
Agent parses entity ref: entity_type=canvas_page, bundle=home, view_mode=full
  ↓
workflow plan → entity_type: canvas_page, bundle: home, view_mode: full
  ↓
map-entity task reads data-model → template: canvas
  ↓
Blueprint match: canvas.md → pattern: $record.components
  ↓
File: entity-mapping/canvas_page.home.full.jsonata
```

### Entity Reference Parsing

Scene content blocks use the format:
```yaml
content:
  entity: "{entity_type}.{bundle}"
  view_mode: "{view_mode}"
  record: 0
```

The agent must split `entity` on `.` to get `entity_type` and `bundle`. Combined with `view_mode`, this gives all three params for the entity-mapping task.

For sections with multiple scenes or multiple entity references, collect all unique `(entity_type, bundle, view_mode)` tuples and create one mapping file per tuple.

### Task Changes

`map-entity--design-screen.md` needs these additions:

1. **Param derivation**: Add a section explaining that when `entity_type`/`bundle`/`view_mode` are null, they must be derived from the scene file's content references.

2. **Mandatory mapping**: Remove any language that suggests mapping can be skipped. Every entity/view_mode in a scene needs a mapping file.

3. **Blueprint lookup**: The task already says "Read the data-mapping blueprint filtered by `type: data-mapping`". Add: "Match the blueprint's `when.template` against the view mode's `template` field from `data-model.yml`."

### Watcher Fix

`vite-plugin.ts` server configuration:

```typescript
// Add after line ~152 (existing watcher.add calls)
server.watcher.add(resolve(designbookDir, 'entity-mapping'));
```

FILE_TYPES registry:

```typescript
// Add to FILE_TYPES object (~line 138)
entityMapping: 'entity-mapping/**/*.jsonata',
```

### Decision: Where does param resolution happen?

**Option A — Agent-side (task instructions)**: The task doc tells the agent to parse entity refs from scenes. No CLI changes needed.

**Option B — CLI-side (workflow plan)**: The CLI auto-resolves entity params from scene files during `workflow plan`. More reliable but requires TypeScript changes.

**Chosen: Option A** — This is consistent with how other tasks work (agent reads context files and derives params). The task instructions need to be explicit about WHERE to find the params and that the mapping is mandatory.
