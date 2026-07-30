# DESIGNBOOK-32 — Spec & Implementation Plan

**Ticket:** Addon Struktur-Tab — Live-Highlighting aus der Scene, Strukturbaum bei Entity-Stories, Typ im Baum
**Workflow:** `gaia_feature` · **Sub-work:** `work:code` · **Task-Art:** `addon-feature`
**Runtime surface:** yes — Storybook **manager** (Structure tab, tree interaction, hover/click from the preview) → verified in a running Storybook (test workspace) **and** unit tests. `scenario_required: true`.
**Skill:** all addon changes go through `designbook-addon-skills` (Part 2). Manager files use **inline styles / Storybook public components only** — no Tailwind/DaisyUI.

---

## 1. Problem

Three related improvements to the **Structure tab** of `packages/storybook-addon-designbook`:

1. **Live highlighting from the scene** — hovering an element in the preview should highlight the corresponding node in the structure tree; today it never highlights.
2. **Structure tree for entity stories** — an entity story shows *"No scene structure available for this story."* instead of a tree.
3. **Type visible on the node** — the tree shows a label but no indication of the node's kind.

The wiring partly exists; this is not a rebuild.

## 2. Confirmed finding — why highlighting never fires today (AC-5)

**The ID-mismatch hypothesis is CONFIRMED, and the cause is threefold — three places compute node identity in mutually incompatible ways:**

- **Renderer / marker** (`src/renderer/renderer.ts:54`): a node's marker is `` `${node.component}@${path}` `` where `path` is a **slot-based** path built in `renderNode`/`resolveSlots` — `''` for a root node, `slotName` chains for slot children, with a `.i` **index suffix** for multi-item slot arrays (`resolveSlots` line 81). So the marker's path namespace is *slot-name-based with array indices*, and for a **root node it is empty** (marker is just `node.component`, no `@`).
- **Overlay → event** (`src/decorators/inspect-overlay.ts:146`): parses the marker (`/^db:s:([^@]+)(?:@(.+))?$/`) and emits `{ component, path }`. For a root node `path` resolves to `''`.
- **Panel** (`src/components/panels/StructurePanel.tsx:28`): `highlightedPath = data.path ?? data.component`. Because `data.path` is the **empty string** for root nodes and `??` does **not** fall back on `''`, `highlightedPath` becomes `''` — never the component id. The intended fallback to `data.component` is dead code.
- **Tree id** (`src/components/CompositionTree.tsx:57–82`, `toTreeItems`): `id = path || \`root-${i}\``, where `path = parentPath` is **never extended for `node.children`** (children keep the parent path and collide on `root-i`), slot children get `slotName` chains **without** the `.i` index suffix the renderer adds, and the value is derived from the `SceneTreeNode` IR — not the render tree.

So the compare in `DeboTree.tsx:113` (`highlightedId === item.id`) puts **two different namespaces** against each other: the overlay emits a slot-based render path (empty for roots), the tree ids are `root-i`/slot-name-without-index. They cannot coincide, and roots are additionally defeated by the `'' ?? …` trap. **`component` (the id) is never a tree id at all**, so the fallback also misses.

**Structural reason they cannot be reconciled by re-deriving independently:** `view()` (`src/renderer/view.ts:41-44`) **flattens scene-ref children inline** and strips metadata when projecting `SceneTreeNode[] → ComponentNode[]`. The render structure (source of the marker path) therefore diverges from the IR structure (source of the tree id) exactly where scene-refs / multi-node entities occur. Independent path derivation on each side is guaranteed to drift. → **the identity must be computed once, where both structures are in hand.**

## 3. Decision (design)

Establish **one canonical node identity** and thread it through render, event, and tree — instead of re-deriving it in three places.

- **D1 — Canonical `path` computed in `view()`.** `view()` is the single point where `SceneTreeNode` and its projected `ComponentNode` are both in hand and where scene-ref flattening happens. Compute a stable `path` there and (a) attach it to the emitted `ComponentNode` so `renderNode` emits `db:s:${component}@${path}` with it, and (b) attach the same `path` to the corresponding `SceneTreeNode` (a new optional `path?: string` field) so `toTreeItems` uses it verbatim as `id`. Root nodes get a **non-empty** canonical path (index-based, e.g. `"0"`, `"1"`), removing the empty-string trap. `StructurePanel` then carries the path straight through (drop the `?? data.component` conflation), and `highlightedId === item.id` compares like-for-like.
- **D2 — Two distinguishable events (AC-2/AC-3).** Add `EVENTS.HOVER_NODE` alongside the existing `EVENTS.SELECT_NODE` in `constants.ts`. `inspect-overlay.ts` emits `HOVER_NODE` on hover (today's line 146) and on hover-clear (`removeHighlight` / `onMouseLeave` → emit a cleared payload so the tree hover disappears when the pointer leaves — AC-1), and keeps `SELECT_NODE` for **click only** (line 152). `StructurePanel` holds two states — transient `hoveredPath` and persistent `selectedPath`.
- **D3 — Dual highlight in `DeboTree` (AC-1/AC-2).** Replace the single `highlightedId` with `hoveredId` + `selectedId`, each with a **visually distinct inline style** (hover = subtle background; selected = stronger + persists). Inline styles only — manager-styling rule (AC-11).
- **D4 — Entity story gets the tree (AC-6/AC-7).** The per-record entity `SceneTreeNode[]` IR is **already built** in `entity-module-builder.ts:89` and then **discarded** (only `view(tree)` is kept at line 96). Thread it through `EntityCsfViewMode` (add `recordsTrees: SceneTreeNode[][]`) and emit a `sceneTrees` param in `buildEntityCsfModule`. `StructurePanel` reads the current `record` arg (via `useArgs` from `storybook/manager-api`, default 0) and indexes into `sceneTrees`, so the tree tracks the visible record. `detectSceneType` then returns `entity` → the existing `EntityPanel` renders `CompositionTree` (left) **and** the mapping table (right) — structure tree shown **and** entity view still reachable, both ACs in one move. No "No scene structure available" for entity stories.
- **D5 — Type visible on node (AC-9/AC-10).** Add an optional `typeLabel?: string` to `DeboTreeItem`; `CompositionTree` populates it from `node.kind` (the existing meta — `component | entity | scene-ref | string`, `types.ts:216/251`), rendered as a right-aligned muted pill in `DeboTree`'s row (inline style). Because all three panels feed `DeboTree` through `CompositionTree`, the type shows in `ComponentPanel`, `EntityPanel`, and `SceneRefPanel` alike (AC-10); the label stays readable and the type is distinguishable from it (AC-9).

## 4. Resolved open decisions

| # | Decision | Choice | Rationale | Rejected alternative |
|---|---|---|---|---|
| **A** | Canonical identity | **Path computed once in `view()`, threaded to marker + IR + tree id** | Only `view()` has both structures and performs the scene-ref flattening that makes the namespaces diverge; a single source removes all three mismatches at their root. | Match on `component` id — ambiguous when a component id repeats at multiple positions (fails AC-4's nested case); re-derive paths independently on each side — guaranteed drift through scene-ref flattening. |
| **B** | Root path | **Non-empty index-based path** (`"0"`, `"1"`, …) | Removes the `'' ?? …` trap and gives roots a matchable id — AC-1/AC-4 for root and nested nodes. | Keep root path empty — the empty-string trap and non-matching id persist. |
| **C** | Hover vs click | **New `HOVER_NODE` (transient, incl. clear) + existing `SELECT_NODE` for click** | Two channel events exactly as the PM specified; hover clears on leave (AC-1), click persists and is styled distinctly (AC-2). | One event with a "kind" flag — the PM requires two **distinguishable** events (AC-3); a flag is not two events. |
| **D** | Entity tree source | **Reuse the already-built per-record IR** (thread `recordsTrees`), emit `sceneTrees`, panel indexes by `record` arg | The IR is built and thrown away today; reusing it keeps the tree exactly consistent with the rendered record and is minimal. Stays within scope ("no tree-data rebuild beyond what type display + entity tree need"). | Rebuild a tree in the manager from render nodes — loses metadata (`view()` strips it), duplicates logic, drifts. Attach only record 0 — tree mismatches a non-zero selected record. |
| **E** | Type source | **`node.kind` (meta) rendered as a pill** | PM decision: type comes from tree data, not a UI heuristic; `kind` already exists on every node. | Infer type from label/icon — a UI heuristic, explicitly rejected by the PM. |

## 5. Risks

- **R1 — Path parity is the whole fix.** If the `view()` path and the `toTreeItems` id ever diverge again, highlighting silently breaks. *Mitigation:* the RED→GREEN test (AC-14) asserts, on a ≥2-level nested scene, that the **emitted marker path equals the matching `DeboTreeItem.id`** — the exact invariant, not a proxy.
- **R2 — Scene-ref flattening shifts indices.** The canonical path must be assigned **after/through** `view()`'s inline flattening so render and tree agree. *Mitigation:* compute in `view()` itself; cover a scene-ref case in the test.
- **R3 — Entity record vs static param.** `sceneTrees` is static per story while `record` is a runtime arg. *Mitigation:* panel reads `record` via `useArgs` and indexes; default 0 if unavailable.
- **R4 — Scene-story regression (AC-8).** The refactor touches shared code (`view`, `renderer`, `CompositionTree`, `DeboTree`, `StructurePanel`). *Mitigation:* keep `component`/`scene-ref` panel selection unchanged; regression test + running-Storybook check on a scene story.
- **R5 — Manager styling.** New pill + dual-highlight styles must be inline. *Mitigation:* AC-11 grep; no className/Tailwind/DaisyUI in touched manager files.

## 6. Acceptance ↔ evidence matrix

| AC | What proves it |
|---|---|
| 1 — hover highlights, clears on leave | running Storybook (scene story): hover a nested element → its tree node highlights; move off → clears. `HOVER_NODE` incl. clear payload. |
| 2 — click sets persistent, distinct selection | running Storybook: click element → tree node stays highlighted after pointer leaves, visually distinct from hover. |
| 3 — two distinguishable channel events | grep `constants.ts` for `HOVER_NODE` **and** `SELECT_NODE`; `inspect-overlay.ts` emits `HOVER_NODE` on hover and `SELECT_NODE` on click (not the same event for both). |
| 4 — ID mapping proven on ≥2-level nesting | unit test: on a nested scene, emitted marker path === matching `DeboTreeItem.id` for a node ≥2 levels deep. |
| 5 — cause documented | this spec §2 (committed) + the spec comment on the ticket. |
| 6 — entity story shows tree | running Storybook (entity story): Structure tab shows the tree; no "No scene structure available". |
| 7 — entity view still reachable | same story: `EntityPanel` mapping table still present alongside the tree. |
| 8 — no scene-story regression | scene stories with `kind: 'component'` and `kind: 'scene-ref'` behave as before (panel selection unchanged) + regression test. |
| 9 — every node shows its type | tree rows show a type indicator from `meta.kind`; label stays readable and distinguishable. |
| 10 — type in all three panels | type pill visible in `ComponentPanel`, `EntityPanel`, `SceneRefPanel` (all feed `DeboTree`). |
| 11 — manager-styling rule | grep touched manager files → no Tailwind/DaisyUI class; inline styles / Storybook public components only. |
| 12 — `pnpm check` green | run `pnpm check` (typecheck → lint → test). |
| 13 — verified in running Storybook | test workspace, one scene story + one entity story, with evidence. |
| 14 — RED→GREEN test + scenario | the path-parity test fails before the fix, passes after; Gherkin click path (scene + entity) in the `test` comment. |

## 7. Implementation plan (checkbox — for the coding step)

- [ ] **RED first (AC-14):** add a unit test that builds a nested scene (≥2 levels, incl. a slot/scene-ref case) and asserts the **emitted marker path === matching `DeboTreeItem.id`** — fails on today's code.
- [ ] `constants.ts`: add `EVENTS.HOVER_NODE` (keep `SELECT_NODE` for click) (AC-3).
- [ ] `view.ts` (+ `types.ts`): compute a canonical `path` per node in `view()`; attach to the `ComponentNode` and to a new `SceneTreeNode.path?: string`; root paths non-empty (AC-1/4, D1/D2).
- [ ] `renderer.ts`: emit the marker using the threaded canonical path (root nodes included) (AC-1/4).
- [ ] `CompositionTree.tsx`: `toTreeItems` uses `node.path` as `id`; populate `typeLabel` from `node.kind` (AC-4/9).
- [ ] `DeboTree.tsx`: replace `highlightedId` with `hoveredId` + `selectedId` (distinct inline styles); render the `typeLabel` pill (inline styles) (AC-1/2/9/11).
- [ ] `inspect-overlay.ts`: emit `HOVER_NODE` on hover **and** on hover-clear (`removeHighlight`/`onMouseLeave`); `SELECT_NODE` on click only (AC-1/2/3).
- [ ] `StructurePanel.tsx`: subscribe to both events; hold `hoveredPath` + `selectedPath`; pass both to the panels/tree; drop the `?? data.component` conflation (AC-1/2).
- [ ] Entity tree: thread the per-record IR — `EntityCsfViewMode.recordsTrees` in `entity-module-builder.ts`, emit `sceneTrees` in `buildEntityCsfModule` (`csf-prep.ts`); `StructurePanel` reads `record` via `useArgs`, indexes into `sceneTrees` (AC-6/7, D4).
- [ ] Regression coverage for scene stories (`component` + `scene-ref` panel selection unchanged) (AC-8).
- [ ] `pnpm check` green (AC-12).
- [ ] Verify in a running Storybook (test workspace): one scene story (hover/click/nested) + one entity story (tree + entity view + type pill); record evidence (AC-13).
- [ ] Confirm no Tailwind/DaisyUI class in touched manager files (grep) (AC-11).

## 8. Not in scope

Reverse direction (tree selection highlights in the preview — needs manager→preview messaging), tree-data restructuring beyond the canonical `path` field + type display + entity tree threading, and any inspect-overlay visual redesign (label position, border colour).

## 9. Artifacts

- This spec: `.gaia/specs/DESIGNBOOK-32-spec.md` (committed).
- To be changed in coding: `src/constants.ts`, `src/renderer/view.ts`, `src/renderer/types.ts`, `src/renderer/renderer.ts`, `src/renderer/entity-module-builder.ts`, `src/renderer/csf-prep.ts`, `src/decorators/inspect-overlay.ts`, `src/components/CompositionTree.tsx`, `src/components/ui/DeboTree.tsx`, `src/components/panels/StructurePanel.tsx`, plus a new test under `src/__tests__/`.
