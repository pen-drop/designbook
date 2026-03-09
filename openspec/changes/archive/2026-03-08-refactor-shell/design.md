# Design: refactor-shell

## Architecture

Replace the Markdown-based shell specification with a component-based screen architecture.

### Component Model

```
┌─────────────────────────────────────────────┐
│ page.component.yml                          │
│ ┌─────────────────────────────────────────┐ │
│ │ slot: header                            │ │
│ │  → header.component.yml                 │ │
│ │  (logo, nav_items[], cta)               │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ slot: content                           │ │
│ │  → any section content / components     │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ slot: footer                            │ │
│ │  → footer.component.yml                 │ │
│ │  (links[], copyright, social[])         │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### File Layout

```
designbook/
├── shell/
│   └── shell.screen.yml           # Screen composing page + header + footer
└── components/
    ├── page/
    │   ├── page.component.yml     # Slots: header, content, footer
    │   └── page.twig
    ├── header/
    │   ├── header.component.yml   # Props: logo, nav_items, cta
    │   └── header.twig
    └── footer/
        ├── footer.component.yml   # Props: links, copyright, social
        └── footer.twig
```

### shell.screen.yml Structure

```yaml
name: Application Shell
docs: |
  Layout pattern, responsive behavior, design notes — displayed in Storybook Docs tab.

layout:
  shell:
    - component: page
      slots:
        header:
          - component: header
            props:
              logo: "ProductName"
              nav_items:
                - { label: "Home", href: "/" }
              cta: { label: "Sign Up", href: "/signup" }
        content:
          - component: hero
            props:
              title: "Welcome"
        footer:
          - component: footer
            props:
              copyright: "© 2025"
              links:
                - { label: "Privacy", href: "/privacy" }
```

## Key Decisions

1. **`docs` field in screen.yml** — Replaces `shell-spec.md`. Rendered in Storybook's Docs tab. The vite-plugin already supports `docs` on stories; we pass it through to CSF `parameters.docs`.

2. **Screen discovery for shell/** — The vite-plugin currently only discovers screens in `sections/*/screens/`. Add `shell/*.screen.yml` as another glob pattern. The Storybook title maps to `Designbook/Shell/{screen-name}`.

3. **Component creation** — The workflow checks if `page`, `header`, `footer` components exist. If not, it creates them using the `designbook-drupal-components` skill conventions (`.component.yml` + `.twig`).

4. **03-design-system.mdx** — Remove the "Application Shell" DeboSection that reads `shell-spec.md`. Replace with a link/reference to the Shell screen story.

5. **DeboExportPage.jsx** — Change completion check from `design-shell/shell-spec.md` to `shell/shell.screen.yml`.

## Changes by File

| File | Change |
|------|--------|
| `src/vite-plugin.ts` | Add `shell/*.screen.yml` glob to screen discovery |
| `src/vite-plugin.ts` | Pass `docs` field to CSF `parameters.docs.description.story` |
| `src/onboarding/03-design-system.mdx` | Remove shell DeboSection, add link to Shell screen |
| `src/components/pages/DeboExportPage.jsx` | Check `shell/shell.screen.yml` instead of `design-shell/shell-spec.md` |
| `.agent/workflows/debo-design-shell.md` | Rewrite: produce screen.yml + ensure components exist |
| `promptfoo/promptfooconfig.yaml` | Update shell test prompt + rubric |
| `promptfoo/fixtures/debo-design-shell/` | Restructure for new output |
