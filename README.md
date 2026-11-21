# Designbook

<img src="docs/assets/logo/logo-hero.png" alt="Designbook handwritten wordmark with coral underline" width="560">

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

## Handbook

The public handbook is at [https://pen-drop.github.io/designbook/](https://pen-drop.github.io/designbook/). It covers Get started, Extend Designbook, Integrations, and Advanced. This README stays the repository entry; the handbook is the user manual.

## Installation

The user-facing skills are distributed as four plugins: `designbook` (core, skill name `debo`), `designbook-drupal`, `designbook-css-tailwind`, and `designbook-stitch`.

### Claude Code plugin marketplace

```
/plugin marketplace add pen-drop/designbook
/plugin install designbook@designbook
/plugin install designbook-drupal@designbook   # pick the integrations you need
```

### skills CLI (any agent)

Installs into the project's agent directories (`.agents/skills/` plus per-agent symlinks):

```bash
npx skills add pen-drop/designbook                 # interactive picker
npx skills add pen-drop/designbook --skill debo    # specific skill
```

Internal development skills are marked `metadata.internal: true` in their `SKILL.md` and are hidden from the skills CLI (override with `INSTALL_INTERNAL_SKILLS=1`).

### Local development

Test workspaces symlink the repo's `.agents`/`.claude` directories — no install step:

```bash
./scripts/setup-workspace.sh <name>
```

## Development

Claude Code in this repository uses the worktree's local skills through
`.claude/skills/`, and the CLI prefers them over the skills bundled in the addon
package (`dist/skills/`, copied at build by `scripts/copy-skills.mjs`). The
marketplace in `.claude-plugin/marketplace.json` ships only the entry skill
(`plugins/designbook-entry`). Project settings disable the installed Designbook
plugins so their commands cannot load files from another checkout. A new
top-level bundle that should ship must be added to `copy-skills.mjs`.

```bash
pnpm run dev          # Addon watcher + Storybook (parallel)
pnpm run lint         # ESLint + Prettier
```

**Training the skills** — Designbook can improve its own skill files via an
autonomous, SkillOpt-style train/val loop (`debo-test research`). See
[TRAINING.md](./TRAINING.md).

## License

[MIT](./LICENSE)
