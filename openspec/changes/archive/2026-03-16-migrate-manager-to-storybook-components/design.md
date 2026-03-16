## Context

The addon has 24 component files using `debo:` prefixed Tailwind/DaisyUI classes (~1700 lines). The CSS is built separately via `tailwindcss -i ./src/index.css -o ./dist/index.css` and loaded only in the preview iframe. Manager-rendered components can't use these styles. Rather than maintaining two styling systems, we adopt `styled()` from `storybook/theming` everywhere.

## Goals / Non-Goals

**Goals:**
- Single styling approach: `styled()` from `storybook/theming` for all components
- Remove Tailwind CSS and DaisyUI as dependencies
- Components work in both manager and preview context
- Theme-aware styling (respects Storybook light/dark theme)

**Non-Goals:**
- Changing component APIs or behavior
- Visual redesign — match current appearance as closely as possible
- Changing how scenes/stories/components work in the preview

## Decisions

### 1. `styled()` from `storybook/theming` everywhere

All components use `styled()` with theme callbacks:
```tsx
const Badge = styled.span<{ variant: 'green' | 'gray' }>(({ theme, variant }) => ({
  fontSize: theme.typography.size.s1,
  fontWeight: theme.typography.weight.bold,
  padding: '2px 8px',
  borderRadius: 9999,
  background: variant === 'green' ? '#D0FAE5' : '#F1F5F9',
  color: variant === 'green' ? '#007A55' : '#94A3B8',
}));
```

Use `theme` for typography, spacing, borders, hover colors. Use hardcoded hex for brand colors (green badges etc.) that don't change with theme.

**Alternative rejected**: CSS Modules — would still need a separate build step and wouldn't integrate with Storybook's theme system.

### 2. Migration order

Migrate bottom-up (primitives first, then compositions):
1. UI primitives: `DeboBadge`, `DeboAlert`, `DeboCard`, `DeboLoading`, `DeboEmptyState`, etc.
2. UI composites: `DeboCollapsible`, `DeboActionList`, `DeboStepIndicator`, etc.
3. Display components: `DeboDataModel`, `DeboDesignTokens`, `DeboProductOverview`, etc.
4. Page components: `DeboVisionPage`, `DeboDesignSystemPage`, `DeboSectionPage`, etc.
5. Manager components: `DeboOnboardingGuide`, `Panel`

### 3. Remove CSS pipeline

- Delete `tailwind.config.ts`
- Remove `build:css` script from package.json
- Remove `index.css` Tailwind imports (keep file if needed for minimal global resets)
- Remove tailwindcss/daisyui/typography from devDependencies
- Remove `/\.css$/` from tsup externals

### 4. Color mapping from DaisyUI to hardcoded values

Current DaisyUI semantic colors → hardcoded equivalents:
- `debo:bg-[#D0FAE5] debo:text-[#007A55]` → green badge (already hardcoded)
- `debo:bg-[#F1F5F9] debo:text-[#94A3B8]` → gray badge (already hardcoded)
- `debo:bg-white` → `theme.background.content`
- `debo:text-slate-900` → `theme.color.defaultText`
- `debo:text-[#94A3B8]` → `theme.color.mediumdark`
- `debo:border-slate-200` → `theme.appBorderColor`
- `hover:debo:bg-base-200/50` → `theme.background.hoverable`

## Risks / Trade-offs

- **Large diff** (~24 files, ~1700 lines) → Mitigate by migrating bottom-up, testing each layer
- **Visual differences** → Some DaisyUI utility combinations may not map 1:1. Acceptable if close.
- **`storybook/theming` is internal** → Widely used by all official addons. Stable API.
- **No DaisyUI components** → We only used DaisyUI utility classes (navbar, collapse etc.), not DaisyUI JS components. The Twig templates in the preview still use DaisyUI classes — this is fine, they're rendered by the component framework, not by React.
