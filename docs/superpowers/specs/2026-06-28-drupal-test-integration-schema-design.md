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

- No PHP transform module (rejected — not debo logic; transform stays AI-generated
  JSONata). A *small* Drupal-side validation command is acceptable (config_inspector).
- JSON:API is **not** used for config schema; it is reserved for **content-data**
  (Plan 4, entity CRUD).
- No schema caching (staleness/invalidation) — the schema is fetched **fresh** at the
  task's result-resolution point.

## Part A — The workspace IS the Drupal

`setup-workspace.sh` is extended (or a `--drupal` mode) to provision a **ddev Drupal
project** instead of a bare theme+Storybook dir.

- **Pre-built codebase + DB snapshot.** A cached, composer-installed Drupal codebase
  template is rsynced (as the theme content is today); `ddev start`; a DB snapshot of an
  installed site is restored. Seconds, not the minutes of `composer create` +
  `site:install`. From-scratch for the theme/config we test, fast for the Drupal base.
- **Theme via `debo install`** into `web/themes/custom/<theme>` (today's
  `test-integration-drupal` content becomes that theme); Storybook runs from the docroot.
- **`DESIGNBOOK_DRUSH`** — a configured drush wrapper (analogous to `DESIGNBOOK_CMD`),
  declared in `designbook.config.yml` (e.g. `backend.drush: "ddev drush"`), emitted by
  `debo config`. Every drush call (sync, prepare-schema, validation) goes through
  `$DESIGNBOOK_DRUSH`, so the mechanism is portable (ddev/lando/plain drush).
- Result: one workspace = a full Drupal site; `cim`/render/introspection are local.
- **`config_inspector`** (contrib) is included in the base composer for config-schema
  validation (Part B).

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
      prepare:                                   # KEY 1 — fetch the expected schema, fresh
        drupal-config-schema:
          config_name: "core.entity_view_display.{{ slice.entity_type }}.{{ slice.bundle }}.{{ slice.view_mode }}"
      generator:                                 # KEY 2 — produce this result via the jsonata generator
        jsonata: "$DESIGNBOOK_DATA/sync/{{ slice.entity_type }}.{{ slice.bundle }}.{{ slice.view_mode }}.jsonata"
      validators:
        - "schema:prepared"                      # against the prepare-fetched schema
        - "cmd:$DESIGNBOOK_DRUSH config:inspect ..."   # authoritative, via Drupal (config_inspector)
```

**`prepare:`** — `<hook-name>: <args>`. Before this result resolves, the engine runs the
registered prepare hook. `drupal-config-schema` calls `$DESIGNBOOK_DRUSH` to dump the
typed-config definition for `config_name`, converts it to JSON Schema, and exposes it as
the schema named `prepared`. Fresh each run, no cache. This is a **new engine
primitive**: a result whose validation schema is prepared at runtime (today's schemas
are static `$ref` resolved at workflow-resolve time). It is the AI's generation guide
**and** the validation source.

**`generator:`** — `<kind>: <path>`. Declares the result is produced by the named
generator and where the generated artifact persists. `jsonata: <path>` tells the AI to
produce this result via the **jsonata generator** (debo `generate-jsonata` lineage): it
authors a `.jsonata` at `<path>`, conforming to the `prepared` schema, then runs it over
the data-model slice to yield the result. The `.jsonata` is **persisted and
re-runnable** — re-export = re-run it (offline, if re-validation is skipped). Also a
**new engine primitive** (formalizes what is today task-body prose into a declarative,
machine-readable production directive).

### Flow the engine/AI derives

```
1. prepare:   $DESIGNBOOK_DRUSH → typed-config(config_name) → convert → schema "prepared"
2. generator: AI authors generator.jsonata (guided by "prepared"), persists it
3. run:       jsonata over the data-model slice → result value (the config)
4. validate:  schema:prepared (up-front) + cmd config_inspector (authoritative, via Drupal)
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

## New Engine Primitives

These require addon/engine support:

- **`prepare:` on a result property** — a registry of prepare-hooks (like resolvers /
  validators). A hook receives the interpolated args, runs (here: `$DESIGNBOOK_DRUSH`
  typed-config dump + convert), and registers a named schema (`prepared`) for that
  result's validation + for the generation context. Runs at result-resolution, fresh.
- **`generator:` on a result property** — declares the production method + artifact
  path. `jsonata` is the first generator kind. The engine exposes the persisted path and
  the AI authors the artifact; running it yields the result value.
- **typed-config → JSON-Schema converter** (addon TS, unit-testable): maps Drupal
  typed-data (`mapping`→object, `sequence`→array, scalar types, `required`) to JSON
  Schema consumed by `schema:prepared`.

## Components

- `setup-workspace.sh` ddev-Drupal provisioning (codebase template + DB snapshot,
  `debo install` theme, `config_inspector` in base composer).
- `DESIGNBOOK_DRUSH` config field + `debo config` emit.
- `prepare`-hook registry + the `drupal-config-schema` hook (`$DESIGNBOOK_DRUSH` fetch).
- typed-config → JSON-Schema converter (addon TS).
- `generator` result-key support + the `jsonata` generator kind.
- Named overridable sync tasks (`export-<unit>`) using `prepare` + `generator`, with
  per-strategy overrides (display-builder, etc.).

## Data Flow

```
debo config → DESIGNBOOK_DRUSH
sync-to → per slice, the named (possibly overridden) export task:
  result.prepare   → $DESIGNBOOK_DRUSH typed-config(config_name) → convert → "prepared"
  result.generator → AI authors <path>.jsonata (guided by "prepared"), persists
  run jsonata(slice) → config
  validators: schema:prepared + cmd:$DESIGNBOOK_DRUSH config:inspect
→ write to config-sync dir → drush cim → outtake
```

## Impact on Plan 1 (already merged-pending)

This supersedes parts of Plan 1:
- Static blueprint `to_drupal` expressions → per-task **generated** `.jsonata` (blueprint
  becomes the pattern/guidance, not the final expression).
- Static `DrupalConfigEntity` `$ref` validation → `schema:prepared` (Drupal-derived) +
  config_inspector.
- `write-config` and the dependency-closure step may simplify (Drupal supplies
  deps/defaults; `cim`/export handle dependency wiring). Re-evaluate during planning.

The sync concern skeleton, workflow, named tasks, `config-sync-dir` resolver, and
`DESIGNBOOK_DRUSH` remain.

## Error Handling

- `$DESIGNBOOK_DRUSH` unreachable / no live Drupal → `prepare` stops + reports.
- `config_name` has no typed-config definition → stop + report (no silent skip).
- Generated jsonata output fails `schema:prepared` or `config:inspect` → validation
  failure in the workflow, before `cim`.

## Testing

- typed-config → JSON-Schema converter: unit tests (typed-data fixtures → expected JSON
  Schema).
- Workspace provisioning: smoke (ddev up + snapshot restore + `drush status`).
- e2e: `sync-to` against the workspace site; the gate catches a deliberately broken
  generated transform (e.g. omitting `field_type`) **at validation time**, not at `cim`.
- Re-export: re-running a persisted `.jsonata` reproduces identical config.

## Plan Split

1. **ddev workspace + `DESIGNBOOK_DRUSH`** — `setup-workspace.sh` Drupal mode, codebase
   template + DB snapshot, `debo install` theme, `config_inspector`, drush wrapper.
   Prerequisite for everything below and for the existing Plan 5 (verify).
2. **`prepare:`/`generator:` engine primitives + converter** — result-key support,
   prepare-hook registry, `drupal-config-schema` hook, typed-config→JSON-Schema
   converter, `jsonata` generator kind. Addon/engine work, unit-tested.
3. **Migrate sync tasks to schema-driven generation** — convert the named export tasks
   to `prepare` + `generator`; retire static blueprint `to_drupal`; wire config_inspector
   validation. Re-verify against the workspace.

## Decision Log

- **Workspace = full ddev Drupal** with the theme via `debo install`; pre-built codebase
  + DB snapshot for speed; `config_inspector` in base composer.
- **`DESIGNBOOK_DRUSH`** configured drush wrapper, emitted by `debo config`.
- **Schema source = Drupal typed-config**, fetched fresh via `$DESIGNBOOK_DRUSH` (not
  JSON:API, not cached). JSON:API reserved for content-data (Plan 4).
- **Transforms = per-task generated, re-runnable `.jsonata`** (not static blueprint
  pairs); blueprint = pattern.
- **Two new result keys:** `prepare:` (runtime schema prep) + `generator:` (production
  method + artifact path).
- **One task** per named unit does prepare+generate+run+validate (not the css two-step).
- **Drupal validation via `config_inspector`** (`cmd:$DESIGNBOOK_DRUSH config:inspect`).
- **Supersedes** Plan 1's static `to_drupal` + `DrupalConfigEntity` validation; sync
  skeleton retained.
