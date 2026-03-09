## Why

The Design System view does not match the Figma design (node 2025:148). The Color section has minor visual inaccuracies, and the Typography section is completely wrong — it shows a plain text list instead of the Figma's Font Families cards + Type Scale table.

## What Changes

- Add "DESIGN TOKENS" uppercase section label above the collapsibles
- Fix Color section: swatch `rounded-[8px]`, correct shadow, row separator color
- Completely replace the Typography section with:
  - **Font Families**: cards with large "Aa" preview, font name, use label, Sans/Mono badge, character preview strip
  - **Type Scale**: table with Style/Preview/Size columns (7 rows: H1→Caption)
- Remove the `title` prop and `---` horizontal rule from the MDX page (Figma doesn't show a second "Design Tokens" heading)

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `debo-design-system-display`: Visual layout of Design System tab updated to match Figma

## Impact

- `packages/storybook-addon-designbook/src/components/display/DeboDesignTokens.jsx`
- `packages/storybook-addon-designbook/src/onboarding/02-design-system.mdx`
