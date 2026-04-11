## 1. Implementation

- [ ] 1.1 Modify `withDeboTheme` in `preview.ts` to return the story wrapped in a `<ThemeProvider>` with the computed theme, instead of only storing it via `setActiveTheme()`
- [ ] 1.2 Keep `setActiveTheme(base)` call so `mountReact()` continues to work for addon-owned pages

## 2. Verification

- [ ] 2.1 Run `pnpm check` to verify typecheck, lint, and tests pass
- [ ] 2.2 Start dev server and confirm `useTheme()` returns the correct theme object in a story
- [ ] 2.3 Confirm addon-owned pages (Foundation, Design System, Sections) still render correctly
- [ ] 2.4 Switch between light/dark theme and verify the ThemeProvider updates accordingly
