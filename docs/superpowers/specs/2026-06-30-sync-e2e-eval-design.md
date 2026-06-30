# Sync-to e2e Eval — Design

**Date:** 2026-06-30
**Status:** Approved design, ready for implementation planning

## Summary

`sync-to` (schema-driven Drupal config export) is **agent-driven**: per Drupal config
name, the AI authors a `.jsonata` against the prepare-fetched schema. That non-determinism
makes a pass/fail CI gate the wrong tool. Instead this builds an **eval** that measures
how well the AI authors schema-conforming, importable config — agent-in-loop, scored —
by **reusing the `debo-test` research loop**: focused sync cases scored by a composite
sync-correctness metric, run as train + held-out val.

## Goal

Measure + improve the AI's sync-to generation quality with a repeatable (scored, not
binary) eval that runs the real chain against a live ddev Drupal: prepare-fetched schema
→ AI-authored jsonata → validate → `cim` → live config.

## Non-Goals

- **Not a deterministic CI gate.** sync-to is agent-driven; this is an eval/score in the
  `debo-test` research loop, local, not a CI pass/fail.
- **No new harness.** Reuse `debo-test` (workspace provision, subagent driver, score/audit/
  friction log, train/val gate, iteration loop) — add only cases + a metric + the summary
  fields the metric reads.
- **No round-trip semantic check yet** — sync-from (Plan-2 reverse) isn't built; semantic
  is existence-only for now.

## Architecture

Reuse the `debo-test` research loop verbatim. A sync eval is a set of **debo-test cases**;
each case's `prompt` drives `sync-to` for that case's data model via the loop's subagent
driver; the loop scores via `workflow summary --metric <jsonata> --json` and gates keep/
discard on the held-out val set. The Drupal-layout workspace + `start-drupal-workspace`
(ddev + `config_inspector` + the `designbook_config_schema` helper) are the live target.

## Components

### Fixtures — multiple focused cases (split by config-type slice)

One case per slice, each independently runnable + mixable as train/val:

- `sync-node-type` — a node bundle + a few field types (text / image / reference) →
  `node.type.*` + `field.storage.*` + `field.field.*` + field-types.
- `sync-display` — a view-mode `core.entity_view_display.*`.
- `sync-image-style` — an `image.style.*` config entity.
- Extensible: `sync-media`, `sync-taxonomy`, `sync-view`.

Each case is `fixtures/<suite>/cases/<case>.yaml` with a data model targeting its slice +
a `prompt` to run `sync-to`. Multiple runs = the loop trains on one case, validates on the
held-out others (the existing train/val split).

### Composite metric (per case → one number, `direction: max`)

The loop optimizes ONE metric value, so the three components fold into one score:

- **`validate_pass_rate`** (gradient) — passing config-name units / total units. A unit
  passes when its generated config satisfies the prepare-fetched schema + `validate_cmd`.
- **cim gate** — `drush config:import --partial` exit 0.
- **`existence_rate`** (semantic) — after cim, the fraction of the case's expected config
  names that are now active in Drupal (`drush config:get <name>` succeeds), i.e. the AI's
  output actually landed as live config.

Fold (proposed, weights tunable in the case yaml):
```
base  = 0.6 * validate_pass_rate + 0.4 * existence_rate        # 0..100 gradient
score = cim_ok ? base : 0.5 * base                              # cim failure halves, not zeroes — keep the gradient
```
A non-zero floor on cim failure preserves a usable gradient (the loop still sees partial
progress). `metric` is the JSONata selecting `score` from the workflow summary; `direction:
max`.

### What sync-to must expose (the eval surface)

- **Per-unit validate outcomes in the summary.** `outtake` aggregates each config-name
  unit's `valid` flag + error → `passing_units` / `total_units` (→ `validate_pass_rate`),
  alongside the cim result and the existence-check, so the metric JSONata can read them
  from `workflow summary --json`.
- **Non-gating eval mode.** Normally a failed unit validation gates the workflow (stops).
  The eval needs the gradient → an eval mode (e.g. a `sync-to` param `gate: soft` / `eval:
  true`) records each unit's pass/fail and CONTINUES, so the summary captures pass/total
  across ALL units instead of aborting on the first invalid. (The default production run
  stays hard-gating.)
- **Existence check.** After cim, verify each expected config name is active — via existing
  drush (`config:get`/`config:status`) or a thin command alongside `designbook_config_schema`.
  Reports the present/expected fraction into the summary.

### Where it runs

`debo-test research <suite> <case> --val-cases <others>` — local, agent-in-loop. Not CI.
`--baseline-only` for a single measurement (no optimization loop).

## Error / edge handling

- A unit whose generation fails validation lowers `validate_pass_rate` (recorded, not a
  crash) under the eval mode.
- `cim` failure → the cim-gate halves the score (penalty, not crash); the drush output is
  captured for the audit.
- A driver crash / `needs_user` is the loop's existing crash path (treated as the worst
  score for that case).

## Testing (the eval's own validity)

- A baseline run on a known-good case should score high.
- A deliberately-broken skill prose (e.g. a blueprint pattern that omits a required key)
  should score LOWER — proving the metric discriminates (the loop's gradient is real).
- Confirm the train/val gate rejects a change that helps train but hurts held-out val.

## Decision Log

- **Primary goal:** AI-generation-quality eval (scored), not a deterministic CI gate.
- **Harness:** reuse the `debo-test` research loop (cases + metric + summary fields).
- **Fixtures:** multiple focused cases (one per config-type slice), run as train + held-out
  val — not one big fixture.
- **Metric:** composite — `validate_pass_rate` (gradient) + cim gate + `existence_rate`
  (semantic, existence-only), folded to one `direction: max` score with a non-zero cim-fail
  floor.
- **Semantic = existence-only** now (config name active post-cim); deep-diff / sync-from
  round-trip deferred (sync-from is a future plan).
- **sync-to changes:** summary exposes per-unit validate outcomes + cim + existence; an
  eval (soft-gate) mode so the run completes and yields the gradient.
