## Why

The Data Model view in Storybook does not match the Figma design (node 2015:96). The current layout uses a 2-column grid, incorrect badge colors, a redundant top alert, and a non-matching footer layout.

## What Changes

- Remove the `DeboAlert` info box from the top of `DeboDataModel` (not present in Figma)
- Change the entity card grid from 2-column to 3-column (`lg:grid-cols-3`)
- Update `DeboBadge` colors to match Figma exact values (`node` = rose, `block_content` = green)
- Redesign `DeboSourceFooter` to match Figma footer: info icon + command text + source path on left, refresh button on right
- Update `DeboSection` to pass `command` prop into `DeboSourceFooter` and remove the redundant command `<span>`

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `debo-data-model-display`: Visual layout of the Data Model tab updated to match Figma design (grid, colors, footer)

## Impact

- `packages/storybook-addon-designbook/src/components/display/DeboDataModel.jsx`
- `packages/storybook-addon-designbook/src/components/ui/DeboBadge.jsx`
- `packages/storybook-addon-designbook/src/components/ui/DeboSourceFooter.jsx`
- `packages/storybook-addon-designbook/src/components/DeboSection.jsx`
