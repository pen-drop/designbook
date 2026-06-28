# Drupal Test-Integration: Live ddev Workspace + Schema-Driven Transform — Design

**Date:** 2026-06-28
**Status:** Approved design, ready for implementation planning

## Summary

Two coupled improvements to Drupal Config Sync, surfaced after Plan 1:

1. **Live ddev Drupal workspace.** The existing `test-integration-drupal` workspace is
   only a Drupal-flavored theme + Storybook (no composer/web/ddev/drush). Sync (`cim`)
   and verify (render) have no home. This makes the workspace **a real ddev Drupal
   site** with the designbook theme installed into it, so `drush`/`cim`/render run
   locally against one site.

2. **Schema-driven, per-task generated JSONata transforms.** Plan 1 used static,
   hand-authored `to_drupal`/`from_drupal` JSONata in blueprints. Two separate
   expressions that must stay exact inverses drift — that is exactly how the
   `field_type` and bundle-dependency bugs slipped through (caught only by live `cim`).
   Instead: the **authoritative schema of what Drupal expects** is fetched fresh from
   Drupal and used to (A) guide the AI generating the transform and (B) validate the
   result. The transform is **one generated `.jsonata` file per task**, persisted and
   **re-runnable**.

The two are coupled: the schema fetch + Drupal validation need a live Drupal, which
part 1 provides.

## Goals

- A reproducible local ddev Drupal workspace where sync + verify run end-to-end.
- Make the **Drupal config schema a first-class input**: the AI knows what Drupal
  expects (so generated config is correct by construction), and the result is validated
  against it.
- Keep transforms as **per-task generated, re-runnable JSONata** (debo
  `generate-jsonata` lineage) — no hand-authored inverse pairs to drift.
- Stay backend/strategy-overridable: a named task (`export-<unit>`) is overridden per
  backend + strategy; the fetched schema follows the strategy.

## Non-Goals

- **No backend-specific code in our codebase.** No new drush-specific or Drupal-specific
  code anywhere — no PHP transform module, no custom drush command/plugin, no
  Drupal-specific TypeScript (e.g. a typed-config→JSON-Schema converter in the addon).
  The core engine primitives stay **backend-neutral**; all Drupal/drush specifics are
  **command strings + config declared in the `designbook-drupal` skill** (data, not
  code), executed by generic primitives. We rely on **existing** drush + the existing
  `config_inspector` contrib — nothing new authored on the Drupal side.
- JSON:API is **not** used for config schema; it is reserved for **content-data**
  (Plan 4, entity CRUD).
- No schema caching (staleness/invalidation) — the schema is fetched **fresh** at the
  task's result-resolution point.

## Part A — Unified Drupal-layout workspace, ddev lazy

Every workspace uses **one unified layout: the Drupal layout** — the theme lives in the
docroot at `web/themes/custom/<theme>` inside a Drupal codebase. There is no
"theme-only vs --drupal" split. **ddev is lazy:** `setup-workspace` does **not** start
it. `design-*` / Storybook run from the theme **without ddev**; only sync/verify (which
need live Drupal: `cim`, render, schema fetch) start ddev on demand.

- **Committed Drupal fixture (not a built cache).** Drupal is a **committed, usable
  fixture** at `packages/integrations/drupal-fixture/`, parallel to the theme fixture:
  `composer.json` + `composer.lock` (pinning Drupal 11 + drush + `config_inspector`),
  `.ddev/`, the scaffolded `web/sites` + settings, and a committed `db.sql.gz` (installed
  standard site, `config_inspector` enabled). The composer-managed tree (`vendor/`,
  `web/core`, `web/modules|themes|profiles/contrib`, `web/libraries`) is **gitignored**
  and materialized **once** via `ddev composer install` (deterministic from the lock).
  `setup-workspace` rsyncs the fixture (incl. its materialized tree) into the workspace;
  ddev is configured but **not started**. A separate `--start` step runs `ddev start` +
  restores `db.sql.gz` — seconds, not minutes. Reproducible + versioned, no opaque cache.
- **Theme = the upgraded fixture, kept separate.** `packages/integrations/test-integration-drupal`
  is upgraded into a **complete Drupal theme** (adds `<theme>.info.yml`, libraries,
  regions; SDC under `components/`) and stays its own editable fixture. `setup-workspace`
  rsyncs it into `web/themes/custom/<theme>` of the cloned Drupal fixture. Storybook runs
  from there (host, no ddev). `theme:enable` happens lazily on first ddev start. (No
  `debo install` at provision time — the fixture is the curated, droppable theme; the
  install path is tested separately.)
- **Worktree-capable.** Workspaces live at `<worktree-root>/workspaces/<name>` (already
  per-worktree by path). The ddev project name is namespaced `db-<worktree>-<name>` to
  avoid global ddev collisions across parallel worktrees. The Drupal fixture is committed
  in the repo (shared by every worktree via the checkout); its gitignored composer tree is
  materialized once per worktree.
- **Backend command config (not core code).** `designbook-drupal` config declares the
  backend command strings — e.g. `backend_cmd.cmd: "ddev drush"` plus `schema_cmd` /
  `validate_cmd` / apply commands built on it (using existing drush + `config_inspector`).
  Core only interpolates `{{ backend_cmd.* }}` into the opaque commands that `prepare:` /
  `cmd:` validators run; it never references drush itself. Portable and keeps all Drupal
  specifics as data in the integration skill.
- **`config_inspector`** (contrib) is in the base composer for config-schema validation
  (Part B).

## Part B — Schema-driven, per-task generated transforms

### Named, overridable sync tasks

`sync-to` is built from **named tasks per unit/slice**: `export-bundle`,
`export-view-mode`, `export-config-entity`, … Each is **overridden per backend +
strategy** via the existing trigger/filter/specificity mechanism. Example: for
`backend: drupal` + `extensions: display_builder`, a display-builder task overrides
`export-view-mode` and shapes the UI-Patterns / Display-Builder display.

Each named task is **one task** that does the whole job: prepare the schema → generate
the transform → run it → validate the result. (Chosen over the css two-step
generate/run split for compactness; the task carries more responsibility than a typical
debo task — an accepted, documented deviation.)

### Two new result-declaration keys

A task's `result` property gains two new keys:

```yaml
result:
  type: object
  required: [view-mode-config]
  properties:
    view-mode-config:
      prepare:                                   # KEY 1 — run a skill-declared command → schema, fresh
        command: "{{ backend.schema_cmd }} core.entity_view_display.{{ slice.entity_type }}.{{ slice.bundle }}.{{ slice.view_mode }}"
        as: prepared
      generator:                                 # KEY 2 — produce this result via the jsonata generator
        jsonata: "$DESIGNBOOK_DATA/sync/{{ slice.entity_type }}.{{ slice.bundle }}.{{ slice.view_mode }}.jsonata"
      validators:
        - "schema:prepared"                      # against the prepare-fetched schema
        - "cmd:{{ backend.validate_cmd }} {{ file }}"   # authoritative, via the backend (data, not core code)
```

The `prepare.command` and `validate_cmd` shown here are **declared in the
`designbook-drupal` override** of this task (resolving to existing drush /
`config_inspector` capability). Core never names drush/Drupal — it runs opaque commands.

**`prepare:`** — generic, **command-based** (mirrors `cmd:` validators: core runs an
opaque command, zero backend knowledge). Before this result resolves, the engine runs
`prepare.command`, captures stdout as a JSON Schema, and registers it under `prepare.as`
(here `prepared`). Fresh each run, no cache. The command lives in the `designbook-drupal`
task override and resolves to existing drush / `config_inspector` capability that emits
the typed-config schema as JSON Schema — a config string, not authored code. This is a
**new, backend-neutral engine primitive**: a result whose validation schema is prepared
at runtime (today's schemas are static `$ref` resolved at workflow-resolve time). The
prepared schema is the AI's generation guide **and** the validation source.

**`generator:`** — `<kind>: <path>`, backend-neutral. Declares the result is produced by
the named generator and where the generated artifact persists. `jsonata: <path>` tells
the AI to produce this result via the **jsonata generator** (debo `generate-jsonata`
lineage): it authors a `.jsonata` at `<path>`, conforming to the `prepared` schema, then
runs it over the data-model slice to yield the result. The `.jsonata` is **persisted and
re-runnable** — re-export = re-run it (offline, if re-validation is skipped). The
`jsonata` generator is generic; the generated content is Drupal-shaped but authored by
the AI from the skill blueprint + prepared schema — no backend code. Also a **new engine
primitive** (formalizes what is today task-body prose into a declarative,
machine-readable production directive).

### Flow the engine/AI derives

```
1. prepare:   run prepare.command (skill-declared, backend) → stdout = JSON Schema "prepared"
2. generator: AI authors generator.jsonata (guided by "prepared"), persists it
3. run:       jsonata over the data-model slice → result value (the config)
4. validate:  schema:prepared (up-front) + cmd validate_cmd (authoritative, via the backend)
```

Because `prepared` carries Drupal's required keys/defaults/types, the generated config
is correct by construction — the `field_type` / missing-dependency class of bugs cannot
recur. Because the transform is one persisted `.jsonata` per task (not an inverse pair),
re-export does not drift.

### Strategy stays in sync

`export-view-mode` under `display_builder` → different pattern (UI-Patterns/Display
Builder) **and** `prepare` fetches the matching typed-config (incl. `ui_patterns` /
`display_builder` schema). Generation guide and validation schema both originate from
the same overridden task, so they never diverge.

### Reverse (sync-from, Plan 2)

Symmetric: a per-task generated reverse `.jsonata` reads Drupal config → data-model
slice, with `prepare` supplying the same schema to distinguish structural keys from
ignorable ones (`uuid`, `_core`, schema defaults).

## New Engine Primitives (backend-neutral)

These require addon/engine support and contain **no** Drupal/drush knowledge:

- **`prepare:` on a result property** — `{ command, as }`. The engine runs `command`
  (an opaque string, exactly like `cmd:` validators), captures stdout as a JSON Schema,
  and registers it under `as` for that result's validation + generation context. Runs at
  result-resolution, fresh. The command is supplied by the skill/task override; core has
  no idea it is drush.
- **`generator:` on a result property** — `{ <kind>: <path> }`. Declares the production
  method + artifact path. `jsonata` is the first generator kind (generic). The engine
  exposes the persisted path; the AI authors the artifact; running it yields the result
  value.

No converter, no drush wrapper, no Drupal command lives in core. The
typed-config→JSON-Schema emission is done by **existing** drush / `config_inspector`
invoked through `prepare.command` — a string declared in `designbook-drupal`, never
authored code in our repo.

## Components

- **Core (backend-neutral):** `prepare:` + `generator:` result-key support in the addon;
  the generic `jsonata` generator kind.
- **`designbook-drupal` (data/config, no code):** the `export-<unit>` task overrides that
  declare `prepare.command` / `validate_cmd` (resolving to existing drush /
  `config_inspector`), and the per-strategy display-builder override.
- **Backend command config:** `designbook-drupal` config supplies the backend command
  strings (e.g. a drush prefix); core just interpolates `{{ backend.* }}` and runs them.
- **Test infra:** `setup-workspace.sh` ddev-Drupal provisioning (codebase template + DB
  snapshot, `debo install` theme, `config_inspector` in base composer). Lives in the
  Drupal test-integration area, not core.

## Data Flow

```
sync-to → per slice, the named (possibly overridden) export task:
  result.prepare   → run backend command (skill-declared) → stdout JSON Schema "prepared"
  result.generator → AI authors <path>.jsonata (guided by "prepared"), persists
  run jsonata(slice) → config
  validators: schema:prepared + cmd:{{ backend.validate_cmd }}
→ write to config-sync dir → backend apply (e.g. drush cim, via skill command) → outtake
```

## Impact on Plan 1 (already merged-pending)

This supersedes parts of Plan 1:
- Static blueprint `to_drupal` expressions → per-task **generated** `.jsonata` (blueprint
  becomes the pattern/guidance, not the final expression).
- Static `DrupalConfigEntity` `$ref` validation → `schema:prepared` (Drupal-derived) +
  config_inspector.
- `write-config` and the dependency-closure step may simplify (Drupal supplies
  deps/defaults; `cim`/export handle dependency wiring). Re-evaluate during planning.

The sync concern skeleton, workflow, named tasks, `config-sync-dir` resolver, and the
backend command config remain.

## Error Handling

- `prepare.command` fails / backend unreachable → `prepare` stops + reports its output.
- The requested config schema has no definition → stop + report (no silent skip).
- Generated jsonata output fails `schema:prepared` or the `validate_cmd` → validation
  failure in the workflow, before the apply step.

## Testing

- Core `prepare:`/`generator:` primitives: unit tests with a **fake backend command**
  (a stub script that echoes a known JSON Schema) — no Drupal needed, proves the generic
  mechanism (command run → schema captured → result validated; generator path authored +
  run).
- Workspace provisioning: smoke (ddev up + snapshot restore + `drush status`).
- e2e: `sync-to` against the workspace site; the gate catches a deliberately broken
  generated transform (e.g. omitting `field_type`) **at validation time**, not at apply.
- Re-export: re-running a persisted `.jsonata` reproduces identical config.

## Plan Split

1. **ddev workspace + backend command config** — `setup-workspace.sh` Drupal mode,
   codebase template + DB snapshot, `debo install` theme, `config_inspector` in base
   composer, `backend.cmd`/`schema_cmd`/`validate_cmd` config in `designbook-drupal`.
   Prerequisite for everything below and for the existing Plan 5 (verify). No core code.
2. **`prepare:`/`generator:` engine primitives** — backend-neutral result-key support in
   the addon (command-run-→-schema for `prepare:`, the `jsonata` generator kind for
   `generator:`). Unit-tested with a fake backend command. No Drupal knowledge in core.
3. **Migrate sync tasks to schema-driven generation** — convert the named export tasks
   to `prepare` + `generator`; the `designbook-drupal` overrides declare the backend
   commands; retire static blueprint `to_drupal`; wire the `validate_cmd`. Re-verify
   against the workspace.

## Decision Log

- **No backend-specific code in our codebase** — core primitives are backend-neutral;
  all Drupal/drush specifics are command strings + config in `designbook-drupal`, using
  existing drush + `config_inspector`. No new converter/module/drush-command authored.
- **Workspace = full ddev Drupal** with the theme via `debo install`; pre-built codebase
  + DB snapshot for speed; `config_inspector` in base composer.
- **Backend commands as config** (`backend.cmd`/`schema_cmd`/`validate_cmd`) in
  `designbook-drupal`; core interpolates + runs them opaquely (never names drush).
- **Schema source = Drupal typed-config**, emitted by the skill-declared `prepare.command`
  (existing drush/`config_inspector`), fresh, not cached. JSON:API reserved for
  content-data (Plan 4).
- **Transforms = per-task generated, re-runnable `.jsonata`** (not static blueprint
  pairs); blueprint = pattern.
- **Two new backend-neutral result keys:** `prepare:` (`{command, as}` → runtime schema)
  + `generator:` (`{jsonata: path}` → production method + artifact).
- **One task** per named unit does prepare+generate+run+validate (not the css two-step).
- **Validation via `config_inspector`** through `cmd:{{ backend.validate_cmd }}`.
- **Supersedes** Plan 1's static `to_drupal` + `DrupalConfigEntity` validation; sync
  skeleton retained.
