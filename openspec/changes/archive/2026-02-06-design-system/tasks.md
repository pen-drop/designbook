## 1. DesignTokensCard Display Component

- [x] 1.1 Create `DesignTokensCard` component at `.storybook/source/components/DesignTokensCard.jsx` composed from `DeboCard` and `DeboCollapsible`
- [x] 1.2 Colors section: `DeboCollapsible` with three-shade color swatches (light/base/dark) for primary, secondary, neutral using Tailwind color-to-hex mapping
- [x] 1.3 Typography section: `DeboCollapsible` with 3-column grid showing heading, body, mono fonts

## 2. Update Barrel Exports

- [x] 2.1 Add `DesignTokensCard` export to `.storybook/source/components/index.js`

## 3. Design System MDX Page

- [x] 3.1 Create `.storybook/onboarding/design-system.mdx` with `<Meta title="Design System" />`
- [x] 3.2 Add `parseDesignTokens` parser that extracts `{ colors: { primary, secondary, neutral }, typography: { heading, body, mono } }`
- [x] 3.3 Use `DeboSection` with `dataPath="design-system/design-tokens.md"` and `renderContent` using `DesignTokensCard`

## 4. AI Command for Design Tokens

- [x] 4.1 Create `/design-tokens` AI command at `.cursor/commands/design-tokens.md`
- [x] 4.2 AI command reads product vision for context, guides color selection from Tailwind palette
- [x] 4.3 AI command guides typography selection from Google Fonts
- [x] 4.4 AI command saves to `designbook/design-system/design-tokens.md`

## 5. Sidebar Order

- [x] 5.1 Add "Design System" to storySort order in `.storybook/preview.js`

## 6. Validation

- [x] 6.1 Verify page appears as "Design System" in Storybook sidebar after Product and Data Model
- [x] 6.2 Verify empty state renders with `/design-tokens` command reference
- [x] 6.3 Verify color swatches and typography display correctly with test data
