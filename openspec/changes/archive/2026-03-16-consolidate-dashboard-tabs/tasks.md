## 1. Create Foundation page

- [x] 1.1 Create `src/components/pages/DeboFoundationPage.jsx` using Storybook's `TabsView` with Vision + Data Model tabs
- [x] 1.2 Create `src/pages/foundation.scenes.yml` (id: foundation, title: Foundation, order: 1, page: DeboFoundationPage)
- [x] 1.3 Export `DeboFoundationPage` from `src/components/pages/index.js`

## 2. Refactor Design System page to tabs

- [x] 2.1 Refactor `src/components/pages/DeboDesignSystemPage.jsx` to use Storybook's `TabsView` with Tokens + Shell tabs

## 3. Update page order and cleanup

- [x] 3.1 Update `src/pages/design-system.scenes.yml` order to 2
- [x] 3.2 Update `src/pages/sections-overview.scenes.yml` order to 3
- [x] 3.3 Delete `src/pages/vision.scenes.yml`
- [x] 3.4 Delete `src/pages/data-model.scenes.yml`
- [x] 3.5 Delete `src/components/pages/DeboVisionPage.jsx`
- [x] 3.6 Delete `src/components/pages/DeboDataModelPage.jsx`
- [x] 3.7 Remove `DeboVisionPage` and `DeboDataModelPage` exports from `src/components/pages/index.js`

## 4. Scene ordering

- [x] 4.1 Inject `order` into CSF module parameters via `buildPageModule` in `vite-plugin.ts`
- [x] 4.2 Add `storySort` comparator in `preview.ts` to sort Designbook pages by `order`

## 5. Verify

- [x] 5.1 Run eslint
