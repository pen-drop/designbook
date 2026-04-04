## Context

Theme handling is currently fragmented:
- **Stitch integration** writes themes to `design-tokens.yml` under `themes:` with semantic color deltas
- **CSS-generate (Tailwind)** produces `[data-theme="<name>"]` CSS selectors via JSONata
- **Workspace `preview.js`** hardcodes `withThemeByDataAttribute({ themes: { light: 'light', dark: 'dark' } })`
- **Scenes** don't declare a default theme — `data-theme` is never set on the scene root element
- **Visual compare** would need `?globals=theme:X` URL params, but themes aren't in the DOM

The addon already has infrastructure for reading designbook files at runtime (`designbookApi.js`, `useDesignbookData` hook) and HMR file-change events.

## Goals / Non-Goals

**Goals:**
- Addon reads available themes from `design-tokens.yml` and auto-registers the Storybook theme decorator
- Each scene declares a default `theme` property that sets `data-theme` on the root wrapper
- Visual compare screenshots render deterministically using the scene's built-in `data-theme`
- Remove hardcoded theme configuration from workspace `preview.js`

**Non-Goals:**
- Changing how Stitch writes themes to `design-tokens.yml` (that stays as-is)
- Changing how CSS-generate produces `[data-theme]` selectors (that stays as-is)
- Making the attribute name configurable (always `data-theme`)
- Theme-aware component-level logic (components just inherit CSS custom properties)

## Decisions

### D1: Addon reads themes from design-tokens.yml at build time via Vite plugin

The addon's Vite plugin (`vite-plugin.ts`) already reads designbook files. During `configResolved`, it will parse `design-tokens.yml`, extract the `themes:` keys, and expose them as a virtual module `virtual:designbook-themes`.

**Why not runtime API?** The `withThemeByDataAttribute` decorator from `@storybook/addon-themes` needs to be configured at module evaluation time in `preview.ts`. Runtime async loading would require a custom decorator instead. Using a virtual module keeps the proven `@storybook/addon-themes` approach.

**Alternative considered:** Generate a `themes.js` file during css-generate. Rejected because it adds a build step dependency and the addon can derive the same information directly from `design-tokens.yml`.

### D2: Scene YAML gets a `theme` property per scene entry

```yaml
scenes:
  - name: "shell"
    theme: "light"      # ← new optional property, defaults to "light"
    items: [...]
  - name: "shell-dark"
    theme: "dark"
    items: [...]
```

The scene module builder passes `theme` through to the CSF module. The generated story wraps its render output in a `<div data-theme="...">`.

**Why per-scene, not per-file?** A scenes file can contain multiple scenes (e.g., light and dark variants of the same layout). Per-scene gives full control.

### D3: CSF module wraps render output with data-theme div

In `csf-prep.ts`, each story's render function becomes:

```js
render: (args) => {
  const html = renderComponent(args.__scene, __imports);
  return `<div data-theme="${args.theme}">${html}</div>`;
}
```

The `theme` value lives in `args.theme` so the Storybook toolbar can override it.

**Why args, not parameters?** Args are mutable via Controls and the toolbar. Parameters are static. The toolbar theme switcher needs to be able to override the default.

### D4: Addon preview.ts configures withThemeByDataAttribute dynamically

Reuse `@storybook/addon-themes` and its `withThemeByDataAttribute` — but feed it dynamically from the virtual module instead of hardcoding themes in each workspace's `preview.js`.

```ts
import { themes, defaultTheme } from 'virtual:designbook-themes';
import { withThemeByDataAttribute } from '@storybook/addon-themes';

// themes = { light: 'light', dark: 'dark', 'brand-x': 'brand-x' }
// defaultTheme = 'light'
```

The addon's `preview.ts` registers the decorator. Workspaces no longer need their own theme configuration.

The virtual module reads `design-tokens.yml` and produces:
- `themes`: object mapping each theme name to itself — "light" is always included as the implicit base theme
- `defaultTheme`: always `"light"` (scene-level defaults handle per-scene overrides via `data-theme` on the scene wrapper)

**Why reuse addon-themes?** It's battle-tested, handles the toolbar UI, and sets `data-theme` on the Storybook story root. No reason to build a custom decorator when we can just feed it dynamic data.

### D5: Two layers of data-theme — toolbar (outer) and scene wrapper (inner)

The `@storybook/addon-themes` decorator sets `data-theme` on the Storybook story container (outer). The scene wrapper also sets `data-theme` from `args.theme` (inner). CSS custom properties inherit from the closest ancestor with `[data-theme]`, so:

- **Default state (no toolbar selection):** addon-themes sets the `defaultTheme` ("light") on the outer container. The scene wrapper sets its own theme (e.g., "dark") on the inner div. The inner wins — scene renders with its declared theme. Visual compare captures this correctly.
- **Toolbar override:** User selects a theme in the toolbar. addon-themes updates the outer `data-theme`. But the scene wrapper still has its own `data-theme` — the inner still wins.

This means the toolbar cannot override the scene's `data-theme` because CSS specificity favors the closer ancestor. That's actually fine for visual compare (deterministic). But for interactive preview, the toolbar should win.

**Resolution:** When the toolbar sets a theme explicitly (not the default), the scene wrapper should defer. The render function checks: if `globals.theme` is explicitly set and differs from `defaultTheme`, omit the scene wrapper's `data-theme` (or match the toolbar). In practice: the scene wrapper reads from Storybook globals first, falls back to its scene default.

Simplest approach: the scene wrapper always sets `data-theme` from args. The addon decorator maps toolbar globals → args.theme override. When the toolbar is at "default", args.theme stays at the scene value. When the toolbar picks a theme, args.theme is overridden. One `data-theme`, one source.

## Risks / Trade-offs

- **[Risk] Scenes without `theme:` property** → Default to `"light"`. Existing scenes work without changes.
- **[Risk] Workspace preview.js still has old hardcoded decorator** → Addon's decorator takes over. Old decorator is harmless but redundant. Document removal in migration notes.
- **[Risk] HMR when themes change in design-tokens.yml** → Virtual module must be invalidated when design-tokens.yml changes. The Vite plugin already watches this file.
- **[Trade-off] `data-theme` on scene wrapper vs body** → Scene wrapper is more precise but means every scene needs the wrapper div. Acceptable since the addon controls scene rendering.
