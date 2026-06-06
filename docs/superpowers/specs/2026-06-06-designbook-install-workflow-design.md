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
| Execution model | `Untracked workflow (track: false) — NO engine lifecycle (the engine requires the addon + designbook.config.yml, neither exists at install time); the AI executes the stages directly.` |
| Artifact structure | Full 4-level conformance: the workflow declares five stages (`detect → target → config → storybook → verify`); all content is structured as tasks (WHAT), rules (hard constraints), and blueprints (overridable HOW) matched by `trigger.steps` + `filter`. No loose procedural `install/*.md` instruction docs. |
| Multi-backend architecture | Core skill owns the generic flow and dispatches to integration skills by convention (`designbook-<backend>/install/`). v1 ships only Drupal. |
| Theme selection | Auto-detect custom themes; exactly one → use it, multiple → ask user, none → offer to scaffold a new theme. |
| Existing Storybook | Extend it (register addons in existing `main.js`), leave the rest untouched. No Storybook → fresh setup from templates. |
| Done criterion | Config written, Storybook configured, **verified**: dependencies installed, Storybook starts, URL reachable, addon loads. |
| Instruction location | `designbook-drupal/install/` directory (consistent with concern structure). |
| CSS framework | Asked during install; installed `designbook-css-*` skills + plain CSS are the choices, auto-detection pre-selects the default. Framework specifics live in the CSS skill's `install/` (e.g. designbook-css-tailwind); backend flow stays framework-neutral. |

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
6. **Verify** — install JS dependencies, run `npx storybook-addon-designbook storybook start --force`, confirm the
   Storybook URL responds and the designbook addon loads. Any failure → stop and
   report; never claim success with unresolved errors.

## Artifacts

### Core skill (`.agents/skills/designbook/install/`)

- `SKILL.md`: `install` is already in the sub-command list (standard workflow dispatch
  covers it) — no change needed.
- `workflows/install.md` — untracked workflow (`track: false`, no `engine:`) declaring
  the five stages `detect → target → config → storybook → verify`, plus the execution
  protocol (per-step task + matching rule/blueprint loading, filter-evaluation source),
  flow preconditions (already-installed walk-up, Node ≥ 20, project-root marker walk-up),
  and abort semantics.
- `tasks/{detect-backend,find-target,write-config,setup-storybook,verify-install}.md` —
  WHAT each stage produces (results `$ref` `schemas.yml`); bodies abstract.
- `rules/verify-storybook.md` — the fixed verify procedure (pm pick, addon start,
  `port`/`startup_errors` parsing, curl reachability, leave running + escalate-on-failure).
- `schemas.yml` — `Backend`, `ProjectRoot`, `BackendDetection`, `TargetDir`,
  `Namespace`, `InstallTarget`, `StorybookSetup`, `DesignbookConfig`, `StorybookPort`,
  `StorybookUrl`, `VerifiedInstall`.

### Drupal integration (`.agents/skills/designbook-drupal/install/`)

- `rules/detect-drupal.md` (`trigger.steps: [detect-backend]`, no filter) — composer
  `drupal/core*` marker → backend `drupal`; docroot resolution (scaffold web-root →
  `web`/`docroot` → `.` last resort) → contributes `root`.
- `rules/find-theme.md` (`trigger.steps: [find-target]`, `filter.backend: drupal`) —
  theme scan, one/many/none handling, scaffold offer → `target_dir` + `namespace`.
- `blueprints/designbook-config.md` (`trigger.steps: [write-config]`,
  `filter.backend: drupal`) — the `designbook.config.yml` YAML starting point.
- `blueprints/storybook-setup.md` (`trigger.steps: [setup-storybook]`,
  `filter.backend: drupal`) — fresh vs extend, dependency list, pm pick, local-checkout
  fallback, template copy.
- `templates/` — `.storybook/` file templates (`main.js`, `preview.js`,
  `twing-hooks.js`).

### Tailwind integration (`.agents/skills/designbook-css-tailwind/install/`)

- `rules/detect-tailwind.md` (`trigger.steps: [write-config]`) — pre-selects Tailwind
  as the `css_framework` default; user confirms.
- `rules/tailwind-storybook.md` (`trigger.steps: [setup-storybook]`,
  `filter.frameworks.css: tailwind`) — Tailwind deps, Vite wiring, `css/app.src.css`,
  config update (`frameworks.css: tailwind` + extension).

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
