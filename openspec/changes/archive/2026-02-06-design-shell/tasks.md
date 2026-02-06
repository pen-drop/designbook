## 1. ShellSpecCard Display Component

- [x] 1.1 Create `ShellSpecCard` at `.storybook/source/components/ShellSpecCard.jsx` composed from `DeboCard` and `DeboCollapsible`
- [x] 1.2 Overview section as plain text at top of card
- [x] 1.3 Navigation structure: `DeboCollapsible` with count badge, bullet list of nav items
- [x] 1.4 Layout pattern and responsive behavior as additional `DeboCollapsible` sections

## 2. Update Barrel Exports + Sidebar

- [x] 2.1 Add `ShellSpecCard` export to `.storybook/source/components/index.js`
- [x] 2.2 Add "Design Shell" to storySort order in `.storybook/preview.js`

## 3. Design Shell MDX Page

- [x] 3.1 Create `.storybook/onboarding/design-shell.mdx` with `<Meta title="Design Shell" />`
- [x] 3.2 Add `parseShellSpec` parser extracting `{ overview, navigationItems, layoutPattern, userMenu, responsiveBehavior, designNotes }`
- [x] 3.3 Use `DeboSection` with `dataPath="design-shell/shell-spec.md"` and `renderContent` using `ShellSpecCard`

## 4. AI Command for Design Shell

- [x] 4.1 Create `/design-shell` AI command at `.cursor/commands/design-shell.md`
- [x] 4.2 AI command reads product vision, roadmap, and design tokens for context
- [x] 4.3 AI command proposes layout pattern (sidebar/top/minimal) based on product type
- [x] 4.4 AI command saves to `designbook/design-shell/shell-spec.md`
