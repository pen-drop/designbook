## 1. Project Setup & Directory Structure

- [x] 1.1 Create `.storybook/source/` directory structure with `components/` subdirectory
- [x] 1.2 Create independent Vite configuration at `.storybook/source/vite.config.js` with React/JSX support
- [x] 1.3 Create CSS entry point at `.storybook/source/index.css` with `@import "tailwindcss" prefix(debo)` and DaisyUI import
- [x] 1.4 Add necessary dependencies (`react`, `react-dom`, `@vitejs/plugin-react`) to `package.json` if not already present
- [x] 1.5 Verify Vite config builds independently from Storybook's main config

## 2. React Component Development

- [x] 2.1 Create `StepIndicator` component in `.storybook/source/components/StepIndicator.jsx` (available in library, not used in MDX)
- [x] 2.2 Create `ProductForm` component in `.storybook/source/components/ProductForm.jsx` (available in library, not used in MDX)
- [x] 2.3 Create `ProductOverviewCard` component in `.storybook/source/components/ProductOverviewCard.jsx` — **primary display component** for product vision data
- [x] 2.4 Create component index file at `.storybook/source/components/index.js` for clean imports
- [x] 2.5 Ensure all components use `debo:` prefixed Tailwind classes exclusively
- [x] 2.6 Ensure all components accept data exclusively via props

## 3. Theme & Design System Integration

- [x] 3.1 Add light theme support to all components using `debo:` prefixed Tailwind/DaisyUI classes
- [x] 3.2 Add dark theme support using `debo:dark:` variant classes
- [x] 3.3 Verify CSS isolation: `debo:` prefixed classes do not affect Drupal components

## 4. Vite Plugin Middleware

- [x] 4.1 Create Vite plugin at `.storybook/source/vite-plugin-designbook-save.js`
- [x] 4.2 Implement `GET /__designbook/load` endpoint for reading files from `designbook/`
- [x] 4.3 Implement `POST /__designbook/save` endpoint for writing files to `designbook/`
- [x] 4.4 Register plugin in `.storybook/main.js` `viteFinal` configuration

## 5. AI Command for Data Input

- [x] 5.1 Create AI command at `.cursor/commands/product-vision.md`
- [x] 5.2 Implement conversational workflow: gather input → ask questions → present draft → confirm
- [x] 5.3 Save result to `designbook/product/product-overview.md` in structured Markdown format
- [x] 5.4 Support both new creation and updates of existing product vision

## 6. MDX Display Page (Read-Only)

- [x] 6.1 Create `.storybook/onboarding/product-vision.mdx` as read-only display page
- [x] 6.2 Implement empty state: show AI command reference (`/product-vision`) when no data exists
- [x] 6.3 Implement data state: load and display saved product vision via `ProductOverviewCard`
- [x] 6.4 Add reload button for refreshing data after AI command execution
- [x] 6.5 Verify MDX file is discovered by Storybook via `.storybook/onboarding/*.mdx` pattern

## 7. Storybook Configuration

- [x] 7.1 Update `.storybook/main.js` to support React component imports (add `@vitejs/plugin-react`)
- [x] 7.2 Register Vite plugin middleware in Storybook config
- [x] 7.3 Verify Storybook loads the product vision MDX page in the navigation

## 8. Validation with Agent Browser

- [x] 8.1 Validate data display: product vision data loaded from file and rendered in ProductOverviewCard
- [x] 8.2 Validate empty state: AI command reference displayed when no data file exists
- [x] 8.3 Validate reload: data refreshes after clicking reload button
- [x] 8.4 Validate CSS isolation: no style leakage between `debo:` prefixed and unprefixed components
