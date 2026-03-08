# Shell Sidebar Restructure

## Problem

The shell design information is currently embedded inside the **Design System** MDX page (`03-design-system.mdx`). This has two issues:

1. Shell is not a design token — it's a composition. It doesn't belong under Design System.
2. When `shell.scenes.yml` gets rendered scenes, they need their own place in the sidebar.

## Proposal

Move Shell out of Design System into its own **top-level Storybook section**, with a docs overview page and scene sub-pages.

### Sidebar Structure

```
📂 Designbook
  📂 Design System
    📄 Overview (Tokens + Fonts only)
  📂 Shell                              ← NEW: top-level
    📄 Overview                          ← docs from shell.scenes.yml
    📄 Default                           ← rendered scene
    📄 Minimal                           ← rendered scene
  📂 Sections
    📂 Blog
      📄 Detail
      📄 Listing
```

### Progressive Discovery

The Shell section works from day 1, even without rendered scenes:

1. **After `/debo-design-shell`**: `shell.scenes.yml` has `docs:` → Shell/Overview is visible
2. **After components are built**: Scenes get populated → Shell/Default appears
3. **If minimal variant added**: Shell/Minimal appears

### Changes Required

| Area | Change |
|------|--------|
| **`03-design-system.mdx`** | Remove Shell section — only keep Design Tokens |
| **`preset.ts`** | Add shell glob + indexer: `shell/*.scenes.yml` → `Designbook/Shell/` |
| **Scenes indexer** | Generate a docs entry from `docs:` field + story entries from scenes |
| **`main.js`** | Shell glob already exists, verify grouping is correct |

### Key Design Decision

The `docs:` field in `scenes.yml` is rendered as the **Overview page** for its group:

```yaml
# shell.scenes.yml
scenes:
  - name: default
    docs: |
      ## Layout Pattern
      Top Navigation with Glassmorphism...
    layout:
      header: [...]
      content: [...]
      footer: [...]
```

`docs:` → rendered as `Designbook/Shell/Overview` (type: docs)
`name: default` → rendered as `Designbook/Shell/Default` (type: story)

## Not in Scope

- Section-level overview pages (same pattern could apply later)
- Custom shell switcher/variant selector
