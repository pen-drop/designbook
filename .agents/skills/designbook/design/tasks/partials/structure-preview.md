# Structure Preview

Displays a full recursive ASCII tree of the component structure so the user can verify the complete picture before building starts. Used by both shell and screen intake tasks.

## Building the Tree

1. Start from the root component (or scene inheritance point) provided by the calling intake
2. For each slot in a component, show the slot name as a branch label
3. Show props as `(prop)` and slots as `(slot)` to distinguish them
4. If a slot contains a component reference, show the component name after `←` (e.g. `← navigation[variant=main]`)
5. Recursively expand every referenced component — show its own slots and nested components, all the way down to leaf nodes
6. For repeated items, use `× n` notation (e.g. `article-card × n`)
7. Where a variant is selected, show it in bracket notation (e.g. `button[variant=primary]`)

## Marking Existing vs New

1. Check which components already exist in `$DESIGNBOOK_HOME/components/`
2. Mark each component in the tree as `[existing]` or `[new]`, right-aligned for readability

## Tree Format

Use a box-drawing ASCII tree with a title and separator:

```
[Title]
═══════

[root]                                          [new]
├── header (slot)                               [new]
│   ├── logo (slot) ← image                    [existing]
│   └── navigation (slot) ← navigation[variant=main]  [existing]
│       └── nav-item × 5
├── content → $content
└── footer (slot)                               [new]
    └── links (slot) ← link × 4                [new]
```

The calling intake provides:
- **Root(s)**: what to start each tree from (a page component, a scene inheritance, etc.)
- **Title(s)**: how to label each tree (e.g. "Shell Structure", "Screen Structure: Blog Overview")

For multi-tree previews (e.g. one per screen), render each tree separately with its own title, then append a combined summary at the bottom.

## Summary

After the tree (or after all trees for multi-tree previews), show a summary line block:

```
Components: [n] new ([names]), [n] existing ([names])
Entity Mappings: [list in entity.bundle.view_mode format, if applicable]
Scenes: [n] ([names])
```

Include **Entity Mappings** only when the calling intake provides entity mapping context.

## Confirmation

After presenting the tree and summary, wait for the user to confirm the structure before proceeding to the next stage:

> "Does this structure look correct? Let me know if you'd like to adjust anything before I start building."
