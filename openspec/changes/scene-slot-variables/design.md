## Context

Scene composition works by having section scenes reference a shell scene (`type: scene, ref: design-system:shell`). The shell produces a `PageComponent` tree; the section then needed to override specific slots on that built output. The current implementation does this by merging override slots onto **all** top-level built items — fragile because it assumes exactly one root component and applies blindly regardless of slot ownership.

The fix: move substitution upstream, before building. The shell YAML declares `$variable` placeholders in its slot values. The section provides `with:` values. The builder walks the raw `SceneDef` object and substitutes, then builds normally. The built pipeline never sees a variable — it just sees a normal component tree.

## Goals / Non-Goals

**Goals:**
- Replace the implicit merge with explicit `$variable` template placeholders
- Substitution on raw YAML (before `buildNode`) — `ComponentNode` unchanged
- Unresolved variables visible in Storybook as a grey placeholder box
- Remove `SceneLayoutEntry` indirection; items typed as `SceneNode[]` directly
- Builder `appliesTo` detection by property presence, not added `type` field

**Non-Goals:**
- Runtime substitution (build time only)
- Nested/recursive variable references
- Dynamic variable names

## Decisions

### Substitution on raw `SceneDef`, not on `ComponentNode`

**Decision:** Walk and substitute the parsed YAML object before passing to `buildNode`. `ComponentNode` is not changed.

**Rationale:** Keeps the build pipeline pure. Variables are a template concern, not a rendering concern. The alternative (walking `ComponentNode` after building) requires changing the `ComponentNode` type and every renderer.

### Recursive object walk, not JSON string-replace

**Decision:** Use a 5-line recursive `substitute()` function over the plain JS object.

**Rationale:** Type-safe, no false positives (avoids replacing `"$content"` inside prop strings), no serialization overhead. JSON string-replace was simpler at first glance but would incorrectly replace any string prop matching the variable name.

```ts
function substitute(obj: unknown, vars: Record<string, unknown>): unknown {
  if (typeof obj === 'string' && obj.startsWith('$')) {
    const key = obj.slice(1);
    return key in vars ? vars[key] : obj;  // leave unresolved as "$key"
  }
  if (Array.isArray(obj)) return obj.map(v => substitute(v, vars));
  if (obj && typeof obj === 'object')
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, substitute(v, vars)]));
  return obj;
}
```

### Unresolved variables left as strings, rendered as placeholder

**Decision:** When a `$variable` has no matching `with:` key, it is left as the literal string `"$content"` in the slot value. The renderer detects `$identifier` strings in slots and emits a styled placeholder div.

**Rationale:** Makes authoring state visible — a shell scene with no `with:` renders placeholder boxes where sections will go. The alternative (substituting `[]`) silently hides unset slots.

### `slots:` on scene refs deprecated, `with:` preferred

**Decision:** Keep `slots:` as a deprecated alias with a console warning.

**Rationale:** Existing scene files use `slots:`. Breaking them immediately would require updating all user content. Alias costs nothing.

### Remove `SceneLayoutEntry`, use property detection in builders

**Decision:** `SceneLayoutEntry`, `SceneComponentEntry`, `SceneEntityEntry`, `SceneConfigEntry`, and `entryToSceneNode()` are removed. Builders detect entry type via `appliesTo` property checks (`'entity' in node`, etc.).

**Rationale:** `SceneLayoutEntry` was an intermediate type that existed only because YAML items lack a `type` field. The conversion in `entryToSceneNode` added `type` so builders could use it. Property detection bypasses this entirely and is more natural for duck-typed YAML input. The `type: 'scene'` entry keeps its explicit `type` field since it must be routed to `sceneBuilder`.

## Risks / Trade-offs

- **`$` in prop values**: Any prop string starting with `$` will be substituted. Unlikely in practice (YAML props are typically booleans, numbers, or non-prefixed strings), but documented as a convention constraint.
- **Deprecation lag**: `slots:` alias means two valid syntaxes coexist until a future breaking release.
- **Placeholder rendering in csf-prep**: The renderer must handle `string` slot values that start with `$`. This is already allowed by the `ComponentNode.slots` type (`string` is valid), but the rendering path must be audited to ensure it doesn't crash on unresolved strings.

## Migration Plan

1. Update `scene-builder.ts`: add `substitute()`, change merge → substitution, add `slots`→`with` alias
2. Update `types.ts`: rename `slots`→`with` on `SceneSceneNode`, remove `SceneLayoutEntry` variants
3. Update `scene-module-builder.ts`: remove `entryToSceneNode`, update items handling
4. Update builders: property-based `appliesTo`
5. Update `csf-prep.ts`: placeholder HTML for `$identifier` slot strings
6. Update user-facing fixtures (`design-system.scenes.yml` in test integration)
7. Tests pass → done. No data migration needed.

Rollback: revert all above files. No persistent state changed.

## Open Questions

None.
