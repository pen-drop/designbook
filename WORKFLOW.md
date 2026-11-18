# designbook — WORKFLOW

Invoke `bakers:bb-workflow` and follow it for the ticket's current state.

Project policy lives in `CLAUDE.md` (including: on-disk artifacts are disposable, never add
migrations or backward compatibility; the four-level skill architecture).

## bb-phase-provision

Integration testing: rebuild a standalone workspace with `./scripts/setup-workspace.sh <name>` from
the current repository or worktree. A Drupal `sync-*` fixture needing a live target is provisioned
by the selected `debo-test` fixture through `start-drupal-workspace.sh`. Parallel runs of the same
suite each get their own `--workspace <path>`. Run `debo-test` from the ticket's git worktree; its
setup may reset and clean only the workspace theme repository after asserting that directory is its
own git toplevel — never the enclosing checkout.

## bb-phase-work

| When | Skill |
|---|---|
| Ticket of type feature, bug or chore | `bakers:bb-recipe-superpowers` |
| Any Designbook design-system workflow or UI artifact | The matching domain skill, such as `design-component`, `design-screen`, `design-shell`, `tokens` or `data-model`; do not hand-code a parallel component implementation outside it |
| Creating or editing a task, rule, blueprint, workflow, or `schemas.yml` under `.agents/skills/designbook/`, `.agents/skills/designbook-*/`, or the skill creator's own guarded directories | `designbook-skill-creator` |
| Changing the Storybook addon TypeScript package | `designbook-addon-skills` |
| Changing Drupal integration behavior | `designbook-drupal` |
| Verifying changed Designbook skill behavior | `debo-test` |

## bb-phase-validate

If no fixture exercises changed skill behavior, author the fixture first.

| When | Command |
|---|---|
| Before committing any repository change | `pnpm check` |
| A Designbook skill changes runtime behavior | `debo-test run <suite> <case>` using the matching fixture; add `--validate <workflow>` when the approved spec names a validation workflow |
| A `debo-test` task ticket | `debo-test run <suite> <case>` using the suite and case recorded in the ticket; add `--validate <workflow>` only when recorded |
| A scored audit is explicitly required | `debo-test research <suite> <case> --baseline-only` |

Runtime skill changes need real fixture evidence: record the command, observed result and tested
commit. A `debo-test` task ticket's recorded invocation is its executable test; review gates on its
result even without a merge request, and records whether a scored research run was warranted.

## bb-phase-deliver

Work lands through a merge request targeting the ticket's `base_branch`; squash and
source-branch deletion only for the ticket's short-lived branch. `pnpm check` must pass.
