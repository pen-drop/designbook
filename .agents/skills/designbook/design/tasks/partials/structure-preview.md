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
8. **Every planned component appears at least once.** Do not collapse a family of components (e.g. `form`, `form-element`, `label`, `input`) into a single summary line — each planned component must be visible in the tree. The tree is the user's only chance to catch a wrong or missing component before the build; a collapsed summary hides exactly what they need to review.

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

The structured plan itself — `components[]`, `scenes[]`, entity mappings — is the
intake task's own result and is already persisted in the workflow `tasks.yml`
(and archived with it). This preview is the **human-readable rendering** of that
result; it does not need a separate plan file.

## Confirmation

The confirmation gate adapts to the run mode — it is never a reason to skip rendering the preview:

- **Interactive run:** after presenting the tree + summary, pause for confirmation via the workflow's wait mechanism (`workflow wait` — the stage shows as awaiting input) before the next stage, e.g.:
  > "Does this structure look correct? Let me know if you'd like to adjust anything before I start building."
  Resume on the user's reply.
- **Headless / "don't ask questions" run:** still render and output the full preview, then proceed without pausing. Suppressing the *question* must not suppress the *preview* — it is the record of what is about to be built.
