## Why

All `Debo*` components use `debo:` prefixed Tailwind/DaisyUI classes for styling. This creates problems: CSS is only available in the preview iframe, not in the manager frame. Components imported in manager context render unstyled. The dual-context issue forced us to maintain two styling approaches (inline for manager, Tailwind for preview). Instead, we should use `styled()` from `storybook/theming` consistently across all components — the same approach Storybook's own components and addons like Vitest use.

## What Changes

- **BREAKING**: Remove all `debo:` Tailwind/DaisyUI class usage from every `Debo*` component
- **BREAKING**: Remove `index.css` Tailwind import from component entry point
- Rewrite all `Debo*` components to use `styled()` from `storybook/theming` with theme callbacks
- Remove Tailwind CSS and DaisyUI dependencies from the addon package
- Migrate `DeboOnboardingGuide` from inline styles to `styled()`
- Add `import React from 'react'` to all `.jsx` components
- Panel: add Storybook `TabsState` for multi-tab support (Workflows + Status)
- Extract shared utilities (`relativeTime`, `timeRange`) into `manager-utils.tsx`

## Capabilities

### New Capabilities
- `manager-component-conventions`: All addon components use `styled()` from `storybook/theming` — no Tailwind/DaisyUI dependency

### Modified Capabilities
- `designbook-shared-components`: All Debo* UI/display/page components rewritten from Tailwind to styled()
- `design-shell-react-components`: Panel updated with Storybook Tabs

## Impact

- `packages/storybook-addon-designbook/src/components/ui/*.jsx` — 14 files, all rewritten to styled()
- `packages/storybook-addon-designbook/src/components/display/*.jsx` — 5 files, all rewritten to styled()
- `packages/storybook-addon-designbook/src/components/pages/*.jsx` — 5 files, all rewritten to styled()
- `packages/storybook-addon-designbook/src/components/DeboSection.jsx` — rewritten to styled()
- `packages/storybook-addon-designbook/src/components/Panel.tsx` — add Tabs
- `packages/storybook-addon-designbook/src/index.css` — remove or gut Tailwind imports
- `packages/storybook-addon-designbook/package.json` — remove tailwindcss, daisyui, @tailwindcss/typography dev deps
- `packages/storybook-addon-designbook/tailwind.config.ts` — delete
- `packages/storybook-addon-designbook/tsup.config.ts` — remove CSS build step, remove `/\.css$/` external
