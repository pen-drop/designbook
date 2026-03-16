## ADDED Requirements

### Requirement: Addon internal pages as real CSF files
The addon SHALL ship `foundation.stories.jsx`, `design-system.stories.jsx`, and `sections-overview.stories.jsx` in `src/pages/` as native Storybook CSF modules. Each file SHALL directly import its React page component, declare a default CSF meta export with `tags: ['!dev']`, `layout: 'fullscreen'`, `docs: { page: DocsPage }`, and a `designbook.order` parameter, and export one named story with an empty render function.

#### Scenario: Foundation page appears in Storybook
- **WHEN** Storybook discovers `dist/pages/foundation.stories.jsx`
- **THEN** a docs entry titled "Designbook/Foundation" appears at `order: 0`

#### Scenario: Design System page appears in Storybook
- **WHEN** Storybook discovers `dist/pages/design-system.stories.jsx`
- **THEN** a docs entry titled "Designbook/Design System" appears at `order: 1`

#### Scenario: Sections Overview page appears in Storybook
- **WHEN** Storybook discovers `dist/pages/sections-overview.stories.jsx`
- **THEN** a docs entry titled "Designbook/Sections/Overview" appears at `order: 2`

#### Scenario: Pages are excluded from dev canvas
- **WHEN** the three page stories are indexed
- **THEN** all three carry `tags: ['!dev']` so they do not appear in the canvas sidebar

#### Scenario: Pages are copied to dist on build
- **WHEN** `tsup` runs the `onSuccess` command `cp -r src/pages dist/pages`
- **THEN** all three `.stories.jsx` files are present in `dist/pages/`

### Requirement: Remove page-field YAML files
The three `*.scenes.yml` files in `src/pages/` that contained only a `page` field (`foundation.scenes.yml`, `design-system.scenes.yml`, `sections-overview.scenes.yml`) SHALL be deleted. No `.scenes.yml` file in the addon's `src/pages/` directory SHALL use the `page` field after this change.

#### Scenario: No page-field YAML files remain
- **WHEN** the `src/pages/` directory is listed
- **THEN** no `*.scenes.yml` files exist there

### Requirement: Preset stories glob updated for JSX pages
The `stories()` export in `preset.ts` SHALL include a `builtinPagesGlob` that matches `dist/pages/*.stories.jsx` instead of `dist/pages/*.scenes.yml`.

#### Scenario: Storybook discovers addon pages via preset
- **WHEN** Storybook loads the addon preset
- **THEN** the `stories` array returned by the addon contains a glob matching `dist/pages/*.stories.jsx`
