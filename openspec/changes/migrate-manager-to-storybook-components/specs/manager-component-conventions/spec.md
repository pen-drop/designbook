## ADDED Requirements

### Requirement: All addon components SHALL use styled() from storybook/theming
Every React component in the addon SHALL use `styled()` from `storybook/theming` for styling. Components SHALL NOT use Tailwind CSS, DaisyUI, or `debo:` prefixed CSS classes.

#### Scenario: Component uses theme-aware background
- **WHEN** a component needs a background color
- **THEN** it uses `theme.background.content` or `theme.background.hoverable` from the styled() theme callback

#### Scenario: Component uses theme-aware typography
- **WHEN** a component needs font sizing
- **THEN** it uses `theme.typography.size.*` and `theme.typography.weight.*` from the styled() theme callback

### Requirement: All JSX files SHALL include explicit React import
Every `.jsx` and `.tsx` file in the addon SHALL include `import React from 'react'` because the manager bundle does not use automatic JSX transform.

#### Scenario: Component renders in manager context
- **WHEN** a component is imported by manager.tsx (directly or transitively)
- **THEN** it SHALL have `import React from 'react'` and render without ReferenceError

### Requirement: Addon SHALL NOT depend on Tailwind CSS or DaisyUI
The addon package SHALL NOT list tailwindcss, daisyui, or @tailwindcss/* as dependencies or devDependencies. The CSS build pipeline SHALL be removed.

#### Scenario: Clean install
- **WHEN** a user installs the addon
- **THEN** no Tailwind CSS or DaisyUI packages are required

### Requirement: Shared utilities SHALL be in manager-utils
Reusable manager-context utilities (`relativeTime`, `timeRange`, styled badge/activity primitives) SHALL be defined in `src/components/manager-utils.tsx` to avoid duplication.

#### Scenario: Two components need relative time formatting
- **WHEN** OnboardingGuide and Panel both need to format timestamps
- **THEN** both import `relativeTime` from `manager-utils.tsx`
