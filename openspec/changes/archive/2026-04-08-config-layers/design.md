## Context

Currently `designbook.config.yml` has accumulated inconsistent naming over time:
- `outputs.*` paths are absolute and redundant (`outputs.root` + `outputs.components` are both absolute, making the root redundant)
- `storybook_root`, `storybook_url`, `storybook_cmd` are underscore flat-keys; all other config uses nested YAML
- `dist` / `config` top-level keys are aliases for the same directory — confusing
- `DESIGNBOOK_ROOT` means "config file directory" but reads as "project root"
- Worktree remapping in `buildWorktreeEnvMap` must remap every `DESIGNBOOK_OUTPUTS_*` var individually

The git-worktree-isolation change introduced `outputs.root` as the project root for worktree creation. With a single `DESIGNBOOK_WORKSPACE` variable as anchor, all output paths can be workspace-relative — eliminating the need to remap multiple vars at plan time.

## Goals / Non-Goals

**Goals:**
- Single `DESIGNBOOK_WORKSPACE` as the git root / project root anchor
- `DESIGNBOOK_HOME` = the Storybook/designbook app dir (theme root) — may differ from workspace
- `DESIGNBOOK_DATA` = workflow data dir (workflows, workspaces, archive) under home
- `DESIGNBOOK_DIRS_*` = named project dirs, workspace-relative, plain strings in config
- Consistent nested YAML for all designbook-specific config (`designbook.home/data/url/cmd`)
- Worktree swap requires only one env var change (`DESIGNBOOK_WORKSPACE`)
- All skill task files updated to new var names — no backwards-compat aliases

**Non-Goals:**
- Changing the workflow data model (tasks.yml, WorkflowFile structure)
- Changing how skill task files are resolved
- Supporting multiple workspaces in a single config

## Decisions

### Config key structure

```yaml
workspace: .                          # project git root; defaults to config dir

designbook:
  home: web/themes/custom/my_theme   # Storybook app dir; defaults to workspace
  data: designbook                   # data dir name, relative to home
  url: http://localhost:6009         # preview URL
  cmd: npm run storybook             # start command

dirs:                                # named project dirs, workspace-relative, string values only
  components: web/themes/.../components
  css:        web/themes/.../css/tokens
  config:     web/themes/.../designbook
  templates:  templates              # may be outside home

component:
  namespace: my_theme

css:
  app: web/themes/.../css/app.src.css
```

**Why dirs instead of outputs**: These dirs are both read and written during workflows. `outputs` implies write-only. `dirs` is neutral — analogous to Nuxt's `dir:` config section.

**Why dirs = strings only (no nested objects)**: Keeps the contract simple. Type-specific config (namespace, css.app) stays in its own section.

**Why workspace-relative for dirs**: Worktree remapping needs only `DESIGNBOOK_WORKSPACE` to swap. All `DESIGNBOOK_DIRS_*` are derived: `resolve(workspace, dirs.components)`.

### Env var naming

| Config key | Env var | Replaces |
|---|---|---|
| `workspace` | `DESIGNBOOK_WORKSPACE` | implied "config dir" |
| `designbook.home` | `DESIGNBOOK_HOME` | `DESIGNBOOK_ROOT` |
| `designbook.data` | `DESIGNBOOK_DATA` | `DESIGNBOOK_DIST` |
| `designbook.url` | `DESIGNBOOK_URL` | `DESIGNBOOK_STORYBOOK_URL` |
| `designbook.cmd` | `DESIGNBOOK_CMD` | `storybook_cmd` |
| `dirs.*` | `DESIGNBOOK_DIRS_<KEY>` | `DESIGNBOOK_OUTPUTS_<KEY>` |

No backwards-compat aliases. All skill task files are updated in the same change.

### Worktree path default

Current: `process.env['DESIGNBOOK_WORKSPACES'] ?? '/tmp'`
New: `process.env['DESIGNBOOK_WORKSPACES'] ?? resolve(data, 'workspaces')`

Worktrees live at `DESIGNBOOK_DATA/workspaces/<workflow-name>` by default — co-located with the workflow data, gitignored via `workspaces/` pattern.

## Risks / Trade-offs

- `workspace` default = config dir: in most projects workspace IS the config dir, but a multi-project monorepo with one shared config could need explicit `workspace:` — acceptable since they'd set it anyway
- `dirs` not typed — a typo in a dir key produces a silent missing var rather than a config error; acceptable for now
- All skill files updated atomically — large diff, but no ambiguity about which var name is current

## Migration Plan

1. Update `config.ts` to parse new keys and emit new env vars only
2. Update `cli.ts` worktree path default, `storybook start` cwd
3. Update `workflow-resolve.ts` `buildWorktreeEnvMap` to use `DESIGNBOOK_WORKSPACE`
4. Update root `designbook.config.yml` and `workspaces/drupal/designbook.config.yml`
5. Update `scripts/setup-workspace.sh`
6. Update all skill task files in `.agents/skills/` to use new var names
