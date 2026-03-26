## Why

`DeboCollapsible` currently has a single hardcoded style (white card with shadow and rounded borders). The workflow panel needs a compact collapsible for inline task display, and workflow overview pages need a mid-weight variant with a progress border. Rather than creating separate components for each context, we extend `DeboCollapsible` with a `variant` prop.

## What Changes

- Add `variant` prop to `DeboCollapsible` with three options: `card` (current default), `action-summary`, `action-item`
- Add `status` prop for left-border coloring on `action-summary` and `action-item` variants
- Add `progress` prop (`{ done, total }`) for `action-summary` — renders a bottom progress bar showing completion percentage
- Refactor existing hardcoded inline styles into variant-driven style maps
- Current behavior preserved as `variant="card"` (default, no breaking change)

## Capabilities

### New Capabilities
- `collapsible-variants`: Three visual variants for DeboCollapsible with status-colored borders and progress indicator

### Modified Capabilities

## Impact

- `packages/storybook-addon-designbook/src/components/ui/DeboCollapsible.jsx` — Add variant/status/progress props, refactor styles
- All existing usages unchanged (default variant = `card`)
- Enables `workflow-collapsible-panel` change to consume `action-summary` and `action-item` variants
