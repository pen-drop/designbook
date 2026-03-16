## Context

The scene rendering pipeline converts `*.scenes.yml` YAML → `ComponentNode[]` → CSF module string → runtime render. A `component:` scene item can carry a `props:` map that should be passed verbatim to the component at render time.

Current pipeline (build time):
```
YAML item { component, props, slots }
  → componentBuilder.build()    strips type/story, returns { component, props, slots }
  → resolveEntityRefs()         spreads cn + resolves slots recursively, props preserved via ...cn
  → buildCsfModule()            JSON.stringify(nodes) → args.__scene in the CSF export
```

Runtime:
```
renderComponent(args.__scene, __imports)
  → renderNode(node, imports)
      props = node.props ?? {}
      slots = resolveSlots(node.slots, imports)
      mod.render(props, slots)
  → SDC wrapImport: (p, s) => alias.default.component({...p, ...s})
```

The logic looks correct on paper. The problem is that **no test verifies the full round-trip**. The existing `scene-module-builder` integration test for `ComponentDirect` does:

```typescript
expect(module).toContain('h1');
```

This passes as long as `"h1"` appears anywhere in the module string — even in a comment. It does NOT verify:
- That `"props"` is the containing key (not collapsed to top-level)
- That `renderNode` actually calls `mod.render` with `{ level: 'h1' }` as the first argument
- That props survive the Storybook `args` round-trip

The actual runtime failure may be hidden because the test is a substring-only check.

## Goals / Non-Goals

**Goals:**
- Write a failing test that reproduces the props-not-forwarded bug
- Fix the renderer so the test passes
- Add a proper structural assertion (not substring) for props in scene-module-builder tests
- Cover the full round-trip: YAML → buildSceneModule → renderComponent → mod.render(props, ...)

**Non-Goals:**
- Changing the scenes YAML schema
- Adding new prop types or transformations
- Fixing props for entity-resolved components (separate concern)

## Decisions

**Decision: Test first, then fix**
Write a failing test that demonstrates the exact issue before changing production code. This gives us a clear signal that the fix works and prevents regression.

**Decision: Verify structural position of props**
Replace the `expect(module).toContain('h1')` assertion with a regex or JSON-parse test that verifies `"props": { "level": "h1" }` is in the serialized `__scene` args, not just anywhere in the module.

**Decision: Add a renderer round-trip test**
Add a test in `renderer.test.ts` that builds a ComponentNode with `{ props: { level: 'h1' } }` via `buildSceneModule` and verifies that `mod.render` is called with the props as first argument.

## Risks / Trade-offs

- **Risk**: The bug may only manifest in the Storybook runtime (browser) and not in Node tests → **Mitigation**: Write the test to mirror runtime exactly: parse the JSON from the generated module and feed it directly to `renderComponent`.
- **Risk**: Strengthening the test may reveal the bug is not in the renderer at all (e.g., it's in the SDC `.component.yml` loader or the Twig template) → **Mitigation**: If tests pass but Storybook still fails, that scope is excluded from this change.
