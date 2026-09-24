# designbook — WORKFLOW

Read the complete ticket and its comments, then execute only the current state's section of its
loaded GAIA owner. `@gaia/workflow-step` owns lifecycle matching and order; this file selects the
project context.

## Loaded skills

- @gaia/essential-skills
- @gaia/method-context
- @gaia/workflow-step
- @gaia/ddev-drupal-bug
- @gaia/ddev-drupal-feature
- @gaia/docs-authoring

## Skill set

- [Superpowers](.claude/skills/gaia/skills/method-context/references/superpowers.md)

## Skills

Apply every matching row. Loading means reading the complete `SKILL.md` before the governed work
starts and following it together with this file and `AGENTS.md`.

| When | Skill |
|---|---|
| Any Designbook design-system workflow or UI artifact | `debo` |
| Creating or editing a task, rule, blueprint, workflow, or `schemas.yml` under `.agents/skills/designbook/`, `.agents/skills/designbook-*/`, or the skill creator's own guarded directories | `designbook-skill-creator` |
| Changing the Storybook addon TypeScript package | `designbook-addon-skills` |
| Changing Drupal integration behavior | `designbook-drupal` |
| Verifying changed Designbook skill behavior | `debo-test` |

## Checks

Apply all matching rows to the plan and final diff. Run commands from the repository root unless a
row says otherwise; deduplicate commands. Ticket-specific functional checks apply in addition.

| When | Command |
|---|---|
| `WORKFLOW.md` or GAIA workflow configuration | `gaia validate .` |
| Before committing any repository change | `pnpm check` |
| Addon, app, or conductor implementation | `pnpm check` |
| A Designbook skill changes runtime behavior | `debo-test run <suite> <case>` using the matching fixture; add `--validate <workflow>` when the approved spec names a validation workflow |
| A `debo-test` task ticket | `debo-test run <suite> <case>` using the suite and case recorded in the ticket; add `--validate <workflow>` only when recorded |
| A scored audit is explicitly required | `debo-test research <suite> <case> --baseline-only` |

### Setup

| When | Setup |
|---|---|
| Integration testing | Rebuild a standalone workspace with `./scripts/setup-workspace.sh <name>` from the current repository or worktree. |
| A Drupal `sync-*` fixture needs a live target | Let the selected `debo-test` fixture provision it through `start-drupal-workspace.sh`; do not replace the fixture with an ad-hoc run. |
| Parallel runs of the same suite | Give every invocation its own `--workspace <path>`. |

If no fixture exercises changed skill behavior, author the fixture first. Run `debo-test` from the
ticket's git worktree. Its setup may reset and clean only the workspace theme repository after
asserting that directory is its own git toplevel; it must never reset the enclosing checkout.

For a `debo-test` task ticket, the recorded tester invocation is the executable test. Its spec
records `Task-Art: debo-test`, the exact `<suite>` and `<case>`, and the optional validation
workflow. It needs no separate BDD feature. Review gates on the tester result even when the ticket
has no merge request or diff, and records whether an additional scored research run was warranted.

## Required skills

The selected skill-set entry, every matching `Skills` row, and any skill input values are binding.
Load each required skill before doing the work it governs and announce the load. If an identifier
cannot be resolved or its complete instructions cannot be read, stop before editing, publishing,
requesting approval, or transitioning; report the exact missing identifier rather than substituting
another method.

## Standards

- **`AGENTS.md` is the primary project-policy source and every rule in it binds.** In particular,
  existing generated/on-disk artifacts are disposable across format changes; never add migrations,
  backward compatibility, or legacy-artifact repair. Run `pnpm check` before committing.
- **Designbook is the design surface.** UI artifacts go through the applicable `debo` workflow
  (`design-entity`, `design-component`, `sections`, or `design-screen`); do not hand-code a parallel
  component implementation outside that workflow.
- **Skill architecture is four-level.** Core and integration skills separate workflow → stage →
  task/blueprint/rule. Tasks state WHAT, blueprints provide overridable HOW-shaped starting points,
  and rules are non-overridable constraints. `designbook-gaia` remains outside this model and ships
  GAIA workflow-step prose only.
- **Guarded skill authoring uses `designbook-skill-creator`.** Load it before editing the guarded
  files named in the `Skills` table; keep HOW out of tasks, parameters out of rules, and shared
  schemas referenced rather than duplicated inline.
- **Runtime skill changes need real fixture evidence.** Use the matching `debo-test` suite/case,
  never an ad-hoc substitute. The handoff records the command, observed result, and immutable tested
  revision. Add a fixture first when none covers the change.
- **Test workspaces are disposable standalone directories, not git worktrees.** Re-run
  `./scripts/setup-workspace.sh <name>` to pick up changes; in a git worktree it copies that
  worktree's `.agents` and `.claude` trees.
- **Git and delivery.** Preserve unrelated worktree changes. Work lands through a merge request
  targeting the ticket's computed `base_branch`; enable squash and source-branch deletion only for
  the ticket's short-lived branch. A commit uses a conventional type, an optional origin scope when
  a real origin exists, and ends with `ref:<identifier>`. A ticket without an origin omits the
  scope. Merge-request titles and descriptions carry no GAIA identifier.
- **Transient evidence lives under `assets-ai/<identifier>/`.** Keep it gitignored and organize it
  by the tool that produced the evidence. Durable evidence is the command, its observed result, and
  the immutable commit tested.
