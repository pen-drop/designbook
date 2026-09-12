# DESIGNBOOK-56 coding evidence

The coding workflow was executed in this worktree with fresh workspaces for each
official `debo-test` case. Definitions were authored before execution, persisted
as one YAML document containing immutable definition and mutable state, and each
saved definition was compared with its pre-execution copy.

## Official runs

| Case | Result | Evidence |
| --- | --- | --- |
| `drupal-petshop vision` | 6/6 assertions | `/tmp/designbook-56-evidence/vision-summary.json` |
| `drupal-petshop data-model` | 9/9 assertions | `/tmp/designbook-56-evidence/data-model-summary.json` |
| `drupal-petshop tokens` | 5/5 assertions | `/tmp/designbook-56-evidence/tokens-summary.json` |
| `drupal-petshop sections` | 6/6 assertions | `/tmp/designbook-56-evidence/sections-summary.json` |
| `drupal-petshop design-component` | 7/7 assertions | `/tmp/designbook-56-evidence/component-summary.json` |
| `drupal-petshop design-screen` | 7/7 assertions | `/tmp/designbook-56-evidence/screen-summary.json` |
| `drupal-stitch design-verify-screen-homepage` | check completed; 2 critical seeded issues | `/tmp/designbook-56-evidence/verify-summary.json` |
| separate repair workflow | completed; recheck passed with no issues | `/tmp/designbook-56-evidence/repair-workflow-completed.yml` |

The seeded verification intentionally added `min-h-[2400px]` to the hero. The
comparison measured 1280×3952 versus 1280×2225, `diff_percent: 0.1759`, and
`severity: critical`. The repair removed only that class; the recheck measured
1280×2225 on both sides, `diff_percent: 0`, and `severity: pass`.

## Additional checks

`pnpm check` passes after the final source and fixture updates. It runs typecheck,
lint, and the Vitest suite. `git diff --check` and YAML frontmatter parsing also
pass. The final CSS and component runs include browser evidence for all Avatar
variants, local font URL resolution, entity mapping validation, scene validation,
and a successful `pnpm build-storybook`.

The existing user change in `.gaia/conductor.config.js` was left untouched. No
ticket transition, commit, review, pull request, or snapshot publication was
performed.

## `debo-test` audit

The test skill now follows the same contract. `run.md` drives one fresh executor
agent per task from a saved definition and checks definition immutability;
`eval-score.mjs` reads the saved workflow documents and separates completed from
pending runs. `is-clear.md` uses `workflow discover` and embedded planning blocks,
and `research.md` instructs its driver to author, validate, persist, and execute a
fixed definition. A repository search found no remaining active `debo-test`
references to `_debo plan`, `workflow-execution.md`, stage-based task discovery, or
after-hook results.

Both `debo-test run` and `debo-test research` accept `--workspace <path>`. The
default remains `workspaces/<suite>`; an explicit path is rebuilt with
`setup-workspace.sh --into`, receives a path-derived ddev project name, and is
used consistently by Storybook, Drupal, fixture layering, scoring, and summaries.
This allows concurrent runs from the same worktree when each run gets its own
workspace path.
