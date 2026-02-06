## Why

The design system is the fourth workflow migrated from Design OS, following product vision, roadmap, and data model. In Design OS, `/design-tokens` defines the visual identity — color palette (from Tailwind) and typography (from Google Fonts). These tokens establish the "look and feel" that's applied consistently across all screen designs.

## What Changes

- **New MDX page**: Create `.storybook/onboarding/design-system.mdx` with `<Meta title="Design System" />`, using `DeboSection` for data loading and a new `DesignTokensCard` component for display
- **New AI command**: Create `/design-tokens` command in `.cursor/commands/` that reads the existing product vision for context, guides the user through choosing colors and typography, and saves to `designbook/design-system/design-tokens.md`
- **New display component**: Create `DesignTokensCard` in `.storybook/source/components/` that renders color swatches and typography info using `DeboCard` and `DeboCollapsible`
- **Reuse existing infrastructure**: Same Vite plugin middleware, `debo:` CSS prefix, `DeboSection` pattern

## Capabilities

### New Capabilities
- `design-system-workflow`: AI command-driven workflow for choosing Tailwind color palette (primary, secondary, neutral) and Google Fonts (heading, body, mono). Displayed as a read-only page in Storybook.
- `design-system-react-components`: Display component `DesignTokensCard` with color swatches (three-shade preview) and typography grid.

### Modified Capabilities
- `designbook-shared-components`: Export `DesignTokensCard` from the component index

## Impact

- **New files**:
  - `.storybook/onboarding/design-system.mdx`
  - `.cursor/commands/design-tokens.md`
  - `.storybook/source/components/DesignTokensCard.jsx`
  - `designbook/design-system/design-tokens.md` (created by AI command)
- **Modified files**:
  - `.storybook/source/components/index.js` — Add export
  - `.storybook/preview.js` — Add to sidebar order
