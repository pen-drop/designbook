# Designbook Install Workflow — Design

Date: 2026-06-06
Status: Approved (brainstorming)

## Goal

A skill-driven install flow that takes a bare project (v1: Drupal) from "skills installed
via Claude marketplace" to "designbook fully configured and verified": backend detected,
theme found, Storybook installed/configured, `designbook.config.yml` written, Storybook
verified running with the designbook addon loaded.

## Key Decisions

| Decision | Choice |
|---|---|
| Execution model | Pure skill flow (markdown instructions), **no** workflow engine. The engine requires the addon + `designbook.config.yml`, neither exists at install time. |
| Multi-backend architecture | Core skill owns the generic flow and dispatches to integration skills by convention (`designbook-<backend>/install/`). v1 ships only Drupal. |
| Theme selection | Auto-detect custom themes; exactly one → use it, multiple → ask user, none → offer to scaffold a new theme. |
| Existing Storybook | Extend it (register addons in existing `main.js`), leave the rest untouched. No Storybook → fresh setup from templates. |
| Done criterion | Config written, Storybook configured, **verified**: dependencies installed, Storybook starts, URL reachable, addon loads. |
| Instruction location | `designbook-drupal/install/` directory (consistent with concern structure). |

## Flow (6 Phases)

Trigger: user asks to install designbook → subcommand `install` of the core `designbook` skill.

1. **Precondition check** — core skill loaded; required integration skill
   (`designbook-drupal`) present under the skills root. Missing → print marketplace
   install instructions, abort.
2. **Detect backend** — detection table in the core install document maps project
   markers to integration skills. v1: `composer.json` containing `drupal/core*` →
   `designbook-drupal`. No match → abort, list supported backends. Adding a backend
   = one new table row + one new integration skill; the core flow is untouched.
3. **Dispatch** — load `designbook-<backend>/install/` instructions and follow them.
4. **Find theme/target** (Drupal) — scan `web/themes/custom` and `themes/custom` for
   `*.info.yml`. One hit → use it; several → ask the user; zero → offer to scaffold a
   new theme. Theme machine name becomes `component.namespace`.
5. **Set up Storybook + config** — inside the theme directory (see Artifacts).
6. **Verify** — install JS dependencies, run `npx addon start --force`, confirm the
   Storybook URL responds and the designbook addon loads. Any failure → stop and
   report; never claim success with unresolved errors.

## Artifacts

### Core skill (`.agents/skills/designbook/`)

- `SKILL.md`: add `install` to the sub-command list.
- New `install/` directory: generic flow (phases 1–3, 6), the backend detection table,
  and the dispatch convention `designbook-<backend>/install/`.
- No engine workflow file — instructions only.

### Drupal integration (`.agents/skills/designbook-drupal/install/`)

- `detect.md` — refines the core table's match (the table owns the
  `composer.json`/`drupal/core*` marker): determine project layout (`web/` vs
  `docroot`), confirm it is a working Drupal codebase.
- `theme.md` — theme scan paths, `info.yml` parsing (machine name →
  `component.namespace`), scaffold option when no custom theme exists.
- `storybook.md` — two paths:
  - **Fresh**: html-vite setup modeled on `packages/integrations/test-integration-drupal`.
    Dependencies: `storybook`, `@storybook/html-vite`, `@storybook/addon-docs`,
    `storybook-addon-sdc`, `storybook-addon-designbook`, twing; `@tailwindcss/vite`
    only when Tailwind is detected.
  - **Extend**: existing `.storybook/main.js` — register `storybook-addon-designbook`
    and `storybook-addon-sdc` only; everything else untouched.
- `config.md` — `designbook.config.yml` template written to the theme root:
  `backend: drupal`, `frameworks.component: sdc`, `frameworks.css` (detected:
  `tailwind` | `css`), `designbook.cmd/home/url`, `dirs.components`,
  `component.namespace`, `extensions` (`drupal`, plus `tailwind` when detected).
- `templates/` — `.storybook/` file templates (`main.js`, `preview.js`,
  `twing-hooks.js`, renderer files), derived from the test-integration-drupal fixture.

## Error Handling

- No backend detected → list supported backends, clean abort.
- Node/npm missing → instructions, abort.
- Existing `designbook.config.yml` → already installed; report, never overwrite
  without explicit confirmation.
- Verify failure → show the exact error and escalate; no silent success.

## Testing

Manual runs against a fresh Drupal project, three scenarios:

1. One custom theme, no Storybook (happy path, fresh setup).
2. Multiple custom themes / no custom theme (ask user / scaffold path).
3. Existing Storybook in the theme (extend path).

Note: current fixtures already have designbook installed. Install testing needs a bare
Drupal fixture (e.g. via `keytec-skill-tester` fixtures or ddev).

## Implementation Constraints

- `designbook-skill-creator` MUST be loaded before authoring any file under
  `.agents/skills/designbook/` or `.agents/skills/designbook-*/` (CLAUDE.md rule).
- No migration/backwards-compat code; existing artifacts are disposable.
