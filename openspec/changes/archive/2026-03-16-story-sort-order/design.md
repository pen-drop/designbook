## Context

The Designbook addon registers stories via `preset.ts` — both built-in pages (Foundation, Design System, Sections) and user-generated scene stories from `.scenes.yml` files. Currently there is no `storySort` configuration, so Storybook falls back to its default ordering. The preset already exports `viteFinal`, `stories`, and `experimental_indexers`; it does not yet export `preview`.

Story title structure:
- `Designbook/Foundation` — built-in overview
- `Designbook/Design System` — built-in overview
- `Designbook/Design System/Scenes` — scenes sub-group
- `Designbook/Sections` — built-in overview
- `Designbook/[SectionName]` — user section overview
- `Designbook/[SectionName]/Scenes` — user section scenes

## Goals / Non-Goals

**Goals:**
- Foundation → Design System → Sections always appear first in that order
- Scenes sub-group always appears last within any parent group
- Individual scenes within a Scenes group appear in YAML array order
- All projects using the addon inherit the ordering with zero user config
- No `order:` field required in any YAML file

**Non-Goals:**
- Sorting user section overviews relative to each other (alphabetical default is fine)
- Removing the existing `parameters.designbook.order` on built-in .stories.jsx files

## Decisions

**Function-based `storySort` reading `parameters.designbook.order`**

Built-in pages already carry `parameters.designbook.order: 0/1/2` in their `.stories.jsx` files. `csf-prep.ts` will emit the same parameter on each scene story export (value = array index from the YAML). The storySort function reads this field universally.

The `/Scenes` title suffix is used to always push the Scenes sub-group to the end within any parent — scenes receive a high base order (e.g. 100 + index) so they sort after section overviews (which have no explicit order and default to 999 alphabetically among themselves).

```js
// preset preview export
storySort: (a, b) => {
  const oA = a.parameters?.designbook?.order ?? 999;
  const oB = b.parameters?.designbook?.order ?? 999;
  if (oA !== oB) return oA - oB;
  return a.title.localeCompare(b.title);
}
```

Scene stories emitted by `csf-prep.ts`:
```js
// default export (section level — no order needed, sorted alphabetically)
export default {
  title: 'Designbook/MySectionName/Scenes',
  parameters: { designbook: {} },  // no order → 999 for group itself
};

// per-story (scene index within the Scenes group)
export const SceneOne = {
  parameters: { designbook: { order: 0 } },
  ...
};
export const SceneTwo = {
  parameters: { designbook: { order: 1 } },
  ...
};
```

The Scenes sub-group sits at title `[parent]/Scenes`. Because all its stories carry `order: 0, 1, 2…` they sort before any story with order 999. But the built-in pages have orders 0, 1, 2 too — so to separate concerns: built-in pages keep 0/1/2, section scenes get 100+ (base 100 + index). Section overview stories (no order) are 999.

**Order ranges:**
| Story type | `designbook.order` |
|---|---|
| Foundation | 0 |
| Design System | 1 |
| Sections | 2 |
| Section overview (Overview export) | 3 |
| Scene 0 in any Scenes group | 100 |
| Scene 1 | 101 |
| Scene N | 100 + N |
| Anything without explicit order | 999 (default) |

Section overview (`exportName: 'Overview'`, only for `section.scenes.yml` files where `hasOverview: true`) appears directly below the built-in Sections page (order 3). Its sidebar name is hardcoded to `'Overview'` in the indexer (not `typedParsed.title`). Within any Scenes sub-group, scenes appear in YAML array order.

**Export `preview` from preset.ts**

Storybook presets can export a `preview` async function returning parameters merged into every project's preview config. No user configuration required.

Alternative considered: array-based `storySort.order`. Rejected — it handles group-level ordering but not individual scene order within the Scenes group without reading parameters.

## Risks / Trade-offs

- **User override**: If a project already has `storySort` in `preview.js`, Storybook merges parameters shallowly — their sort wins. Acceptable; advanced users can take full control.
- **order ranges**: Using 100-based offset for scenes assumes fewer than 100 built-in pages. Safe assumption.
