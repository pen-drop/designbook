# Scene Field Reference

## File-level Fields

| Field | Required | Description |
|-------|----------|-------------|
| `group` | ✅ | Storybook story group (e.g. `"Designbook/Design System"`). Falls back to `name` if missing. |
| `scenes` | ✅ | Array of scene definitions |
| `id` | ❌ | Section/shell identifier (for Designbook overview pages) |
| `title` | ❌ | Human-readable title (for overview page) |
| `description` | ❌ | Section description (for overview page) |
| `status` | ❌ | Section status: `planned`, `in-progress`, `done` |
| `order` | ❌ | Display order in Storybook sidebar |

> **`group` vs `name`**: Use `group` as the canonical field. `name` works as a fallback but `group` is preferred.

## Scene-level Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Display name in Storybook sidebar |
| `items` | ✅ | Flat array of scene entries (`SceneNode[]`) |
| `section` | ❌ | Section ID for data loading |
| `docs` | ❌ | Documentation string |
