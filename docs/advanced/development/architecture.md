# Architecture

Designbook has three product parts plus a private documentation site.

## Part 1 — Core skill

`.agents/skills/designbook/` (`debo`). One nested sub-skill per workflow. Shared `design/` and `scenes/` roots sit beside `skills/`. The engine reads `workflow/schemas.yml`. Intake → agent-authored document → `plan build` → execute or persist.

## Part 2 — Storybook addon

`packages/storybook-addon-designbook/`. TypeScript CLI, Storybook preset, config loader (`src/shared/config.ts`), planning sources (`src/shared/planning-sources.ts`). Public command surface: `npx storybook-addon-designbook` / `_debo`.

## Part 3 — Integration skills

`designbook-drupal`, `designbook-vue`, `designbook-css-tailwind`, `designbook-stitch`, plus capture `designbook-figma`, test `designbook-test`, and GAIA `designbook-gaia`. Drupal, Vue, Tailwind, and Stitch extend Part 1 with tasks, blueprints, and rules. GAIA ships only `@gaia/workflow-step` prose.

## Website package

Private workspace package `website/`. VitePress 1.6.4, `srcDir` `../docs`, `base` `/designbook/`, DefaultTheme, Tailwind v4, Mermaid, `github-dark` code theme. Rewrites: `landing.md` → home, `index.md` → `/manual`. `website/.vitepress/manual.mjs` is the navigation authority (`AREAS`, `SIDEBAR`, `SRC_EXCLUDE`). Area strip is a DefaultTheme `sidebar-nav-before` slot (`SidebarAreas.vue`). Cards on `/manual` read `AREAS` (`ManualCards.vue`). Logos live in `docs/assets/logo/` and are copied via Vite `publicDir`.

Historical trees `docs/specs|spikes|experiments|gaia|superpowers` stay in git and are excluded from the site.

## Config and contributions

`findConfig` walks up for `designbook.config.yml` / `.yaml`. `normalizeExtensions` accepts strings or `{id,url,skill}`. Intake filters files with `trigger`/`filter` against that config. Installing a skill file without selecting it in config contributes nothing.

## CI

Root `pnpm check` is typecheck → lint → test. Site gates run in `website` `build`. GitHub Actions: `build.yml` on push and pull_request (site test + site build on the Node matrix). `docs.yml` publishes GitHub Pages from `next` only (the default branch), including `workflow_dispatch`, both jobs gated with `if: github.ref == 'refs/heads/next'`.
