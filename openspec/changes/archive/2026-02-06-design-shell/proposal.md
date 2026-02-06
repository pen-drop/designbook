## Why

The application shell is the fifth Design OS workflow. After defining the product, data model, and design tokens, the next step is designing the persistent navigation and layout that wraps all sections. In Design OS, `/design-shell` creates a specification for the shell layout (sidebar vs. top nav), navigation structure, user menu, and responsive behavior.

In Designbook, the shell specification is captured as a Markdown file and displayed in Storybook — following the read-only display pattern. The actual shell React components are not created here (that's implementation work), only the design specification.

## What Changes

- **New MDX page**: Create `.storybook/onboarding/design-shell.mdx` with `<Meta title="Design Shell" />` using `DeboSection` and a new `ShellSpecCard` component
- **New AI command**: Create `/design-shell` command that reads product vision, roadmap, and design tokens, then guides the user through specifying the shell layout, navigation, user menu, and responsive behavior
- **New display component**: `ShellSpecCard` that renders the shell specification with overview, navigation items, layout pattern, and responsive behavior using `DeboCard` and `DeboCollapsible`
- **Saved data**: `designbook/design-shell/shell-spec.md`

## Capabilities

### New Capabilities
- `design-shell-workflow`: AI command-driven workflow for specifying the application shell — layout pattern, navigation structure, user menu, responsive behavior. Displayed as a read-only page in Storybook.
- `design-shell-react-components`: Display component `ShellSpecCard` that renders the shell specification.

### Modified Capabilities
- `designbook-shared-components`: Export `ShellSpecCard` from the component index

## Impact

- **New files**:
  - `.storybook/onboarding/design-shell.mdx`
  - `.cursor/commands/design-shell.md`
  - `.storybook/source/components/ShellSpecCard.jsx`
  - `designbook/design-shell/shell-spec.md` (created by AI command)
- **Modified files**:
  - `.storybook/source/components/index.js` — Add export
  - `.storybook/preview.js` — Add to sidebar order
