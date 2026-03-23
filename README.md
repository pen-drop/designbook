# Designbook

**AI workflows that structure your design for CMS implementation.**

Start from anywhere — Figma, Figma Make, Google Stitch, an existing website, or directly through AI conversation. Designbook's job is what comes after: turning your design into structured specs ready for implementation in any CMS (Drupal, WordPress, ...) and any frontend framework (React, Vue, Twig, Web Components, ...).

Instead of manually translating designs into content types, components, and view modes, you run guided AI workflows (`/debo-*`) that do the structuring for you. The output is YAML specs, component code, and page compositions — previewed live in Storybook.

```
Design Tool (Figma, Make, Stitch, ...)
        ↓
  AI Workflows (/debo-*)
   vision → sections → tokens → data model → sample data → shell → screens
        ↓
  CMS-ready Specs + Components
        ↓
  Storybook Preview
```

Framework-agnostic: the same pipeline works regardless of your frontend framework, CSS tooling, or CMS.

## Development

```bash
pnpm run dev          # Addon watcher + Storybook (parallel)
pnpm run lint         # ESLint + Prettier
```

## License

Private project
