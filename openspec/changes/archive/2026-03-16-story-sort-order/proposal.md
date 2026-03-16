## Why

Storybook stories from the Designbook addon currently have no explicit sort order, so Foundation, Design System, and Sections pages appear in filesystem/alphabetical order. Scenes sub-groups also appear before or mixed with overview stories rather than consistently at the end.

## What Changes

- Add `storySort` configuration exported from the addon preset so all projects get correct story ordering automatically
- Foundation → Design System → Sections order enforced for the three built-in Designbook pages
- Within each group (Design System, Sections, user sections), Scenes sub-group always appears last
- No user configuration required — preset handles it

## Capabilities

### New Capabilities
- `story-sort-order`: Storybook sidebar sort order for Designbook stories, configured via preset `preview` export

### Modified Capabilities

## Impact

- `packages/storybook-addon-designbook/src/preset.ts` — add `preview` export with `storySort`
- All projects using the addon inherit the sort order automatically
- The existing `parameters.designbook.order` custom field on story files is unused for sidebar ordering and can be left as-is or removed
