## 1. Virtual Theme Module

- [x] 1.1 Add `virtual:designbook-themes` to the Vite plugin (`vite-plugin.ts`): parse `design-tokens.yml`, extract `themes:` keys, generate module exporting `{ themes, themeNames, defaultTheme }`
- [x] 1.2 Add HMR invalidation for the virtual module when `design-tokens.yml` changes
- [x] 1.3 Add TypeScript declaration for `virtual:designbook-themes` module

## 2. Addon Theme Decorator

- [x] 2.1 In `preview.ts`, import `themes` and `defaultTheme` from `virtual:designbook-themes` and register `withThemeByDataAttribute({ themes, defaultTheme, attributeName: 'data-theme' })` as a decorator
- [x] 2.2 Add `@storybook/addon-themes` as a dependency of the addon package (move from workspace devDependency to addon dependency)

## 3. Scene Theme Property

- [x] 3.1 Add `theme` property parsing in `scene-metadata.ts` / `extractScenes` — extract optional `theme` string from each scene entry
- [x] 3.2 Pass `theme` through `buildSceneModule` → `buildCsfModule` so each story gets `args.theme` with the scene's default value
- [x] 3.3 Update `csf-prep.ts` render function to wrap output in `<div data-theme="${args.theme}">...</div>`

## 4. Tests

- [x] 4.1 Add test for virtual module generation: tokens with themes, without themes, multiple themes
- [x] 4.2 Add/update `scene-module-builder.test.ts`: scene with `theme: "dark"` produces `args.theme: "dark"`, scene without theme defaults to `"light"`
- [x] 4.3 Add/update `csf-prep` test: render function includes `data-theme` wrapper

## 5. Cleanup

- [x] 5.1 Remove hardcoded `withThemeByDataAttribute` from workspace `preview.js` and `@storybook/addon-themes` import
- [x] 5.2 Remove `@storybook/addon-themes` from workspace `.storybook/main.js` addons array if no longer needed

## 6. Verification

- [ ] 6.1 Run `./scripts/setup-workspace.sh drupal` from repo root, then `pnpm run dev` inside the workspace — verify theme toolbar appears with correct themes, scene renders with `data-theme` attribute, toolbar override works (manual)
